
import { jsPDF } from 'jspdf';
import 'jspdf-autotable'; // Import for side effects, it extends jsPDF.prototype
import { Transaction, FinancialSummaryData, FilterPeriod, CustomDateRange, Currency, PaymentMethod, PaymentMethodOption } from '../types';
import { PAYMENT_METHOD_OPTIONS, FILTER_PERIOD_OPTIONS, APP_TITLE } from '../constants';

// Extend jsPDF with autoTable - this is often needed for TypeScript if types are not perfectly aligned
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

const getFilterPeriodText = (filterPeriod: FilterPeriod, customDateRange: CustomDateRange): string => {
  const option = FILTER_PERIOD_OPTIONS.find(opt => opt.id === filterPeriod);
  if (filterPeriod === FilterPeriod.CUSTOM) {
    const startDate = customDateRange.startDate ? new Date(customDateRange.startDate + 'T00:00:00').toLocaleDateString('es-VE') : 'N/A';
    const endDate = customDateRange.endDate ? new Date(customDateRange.endDate + 'T00:00:00').toLocaleDateString('es-VE') : 'N/A';
    return `Rango Personalizado: ${startDate} - ${endDate}`;
  }
  return option ? option.label : 'Todos los Tiempos';
};

const formatCurrencyForPdf = (value: number, currency: Currency): string => {
  return `${value.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
};

const getPaymentMethodsString = (transaction: Transaction): string => {
    if (!transaction.paymentMethods || transaction.paymentMethods.length === 0) return 'N/A';
    return transaction.paymentMethods.map(pmDetail => {
      const details = PAYMENT_METHOD_OPTIONS.find(opt => opt.id === pmDetail.method);
      const amountStr = pmDetail.amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return `${details ? details.label.replace(/\s*\([\w\.]+\)/, '') : pmDetail.method} (${amountStr})`; // Shorten label
    }).join(', ');
};


export const generateFinancialReportPDF = (
  incomeAndAdjustments: Transaction[],
  expenses: Transaction[],
  summary: FinancialSummaryData,
  filterPeriod: FilterPeriod,
  customDateRange: CustomDateRange,
  exchangeRate: number
): void => {
  const doc = new jsPDF();
  const pageHeight = doc.internal.pageSize.height;
  let currentY = 20; // Initial Y position

  // Report Title
  doc.setFontSize(18);
  doc.text(`${APP_TITLE} - Informe Financiero`, doc.internal.pageSize.width / 2, currentY, { align: 'center' });
  currentY += 10;

  // Report Period
  doc.setFontSize(12);
  doc.text(`Período del Informe: ${getFilterPeriodText(filterPeriod, customDateRange)}`, 14, currentY);
  currentY += 8;
  doc.text(`Fecha de Generación: ${new Date().toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`, 14, currentY);
  currentY += 10;

  // Financial Summary Section
  doc.setFontSize(14);
  doc.text('Resumen Financiero', 14, currentY);
  currentY += 7;
  doc.setFontSize(10);

  const summaryData = [
    [`Ingresos del Período (Bs.):`, formatCurrencyForPdf(summary.bs.periodIncome, Currency.BS)],
    [`Gastos del Período (Bs.):`, formatCurrencyForPdf(summary.bs.periodExpenses, Currency.BS)],
    [`Saldo Total Actual (Bs.):`, formatCurrencyForPdf(summary.bs.totalBalance, Currency.BS)],
    [` `, ` `], // Spacer
    [`Ingresos del Período (USD):`, formatCurrencyForPdf(summary.usd.periodIncome, Currency.USD)],
    [`Gastos del Período (USD):`, formatCurrencyForPdf(summary.usd.periodExpenses, Currency.USD)],
    [`Saldo Total Actual (USD):`, formatCurrencyForPdf(summary.usd.totalBalance, Currency.USD)],
    [` `, ` `], // Spacer
    [`Tasa de Cambio (Bs. por USD):`, exchangeRate.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })],
  ];

  doc.autoTable({
    body: summaryData,
    startY: currentY,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 1.5 },
    columnStyles: { 0: { fontStyle: 'bold' } },
    didDrawPage: (data) => { currentY = data.cursor?.y || currentY; } // Update Y after table
  });
  currentY += 5; // Add some space after summary

  // Helper function to add transaction tables
  const addTransactionTable = (title: string, data: Transaction[]) => {
    if (currentY > pageHeight - 40) { // Check if new page is needed
        doc.addPage();
        currentY = 20;
    }
    doc.setFontSize(14);
    doc.text(title, 14, currentY);
    currentY += 7;

    const tableHeaders = ['Fecha', 'Descripción', 'Categoría', 'Métodos de Pago', 'Monto'];
    const tableBody = data.map(t => [
      new Date(t.date + 'T00:00:00').toLocaleDateString('es-VE'),
      t.description,
      t.category || '-',
      getPaymentMethodsString(t),
      `${t.type === 'expense' ? '-' : ''}${formatCurrencyForPdf(t.amount, t.currency)}`,
    ]);

    doc.autoTable({
      head: [tableHeaders],
      body: tableBody,
      startY: currentY,
      theme: 'striped', // or 'grid'
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 1.5 },
      columnStyles: {
        0: { cellWidth: 20 }, // Fecha
        1: { cellWidth: 50 }, // Descripcion
        2: { cellWidth: 25 }, // Categoria
        3: { cellWidth: 50 }, // Metodos
        4: { cellWidth: 25, halign: 'right' }, // Monto
      },
      didDrawPage: (data) => { currentY = data.cursor?.y || currentY; }
    });
    currentY += 10; // Space after table
  };

  if (incomeAndAdjustments.length > 0) {
      addTransactionTable('Historial de Ingresos y Ajustes', incomeAndAdjustments);
  } else {
      if (currentY > pageHeight - 20) { doc.addPage(); currentY = 20; }
      doc.setFontSize(10);
      doc.text('No hay ingresos o ajustes para el período seleccionado.', 14, currentY);
      currentY += 10;
  }

  if (expenses.length > 0) {
      addTransactionTable('Historial de Gastos', expenses);
  } else {
      if (currentY > pageHeight - 20) { doc.addPage(); currentY = 20; }
      doc.setFontSize(10);
      doc.text('No hay gastos para el período seleccionado.', 14, currentY);
      currentY += 10;
  }

  // Add Page Numbers
  const pageCount = doc.getNumberOfPages ? doc.getNumberOfPages() : (doc.internal.pages && doc.internal.pages.length -1) || 0;

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 10);
  }

  // Save the PDF
  const dateSuffix = new Date().toISOString().slice(0,10).replace(/-/g,'');
  doc.save(`InformeFinanciero_Serendipia_${dateSuffix}.pdf`);
};
