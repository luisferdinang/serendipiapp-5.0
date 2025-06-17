import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction, FinancialSummaryData, FilterPeriod, CustomDateRange, Currency } from '../types';
import { PAYMENT_METHOD_OPTIONS, FILTER_PERIOD_OPTIONS, APP_TITLE } from '../constants';

// Extender la interfaz de jsPDF para incluir las propiedades que necesitamos
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable?: {
      finalY?: number;
    };
  }
}

// Configuración de estilos
const styles = {
  title: {
    fontSize: 18,
    fontStyle: 'bold' as const,
    textColor: [0, 0, 0] as [number, number, number],
    lineHeight: 1.2,
  },
  subtitle: {
    fontSize: 14,
    fontStyle: 'bold' as const,
    textColor: [51, 51, 51] as [number, number, number],
  },
  header: {
    fillColor: [41, 128, 185] as [number, number, number],
    textColor: [255, 255, 255] as [number, number, number],
    fontStyle: 'bold' as const,
  },
  row: {
    textColor: [0, 0, 0] as [number, number, number],
    fontSize: 10,
  },
  footer: {
    fontSize: 10,
    textColor: [100, 100, 100] as [number, number, number],
  },
};

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
    const amountStr = formatCurrencyForPdf(pmDetail.amount, transaction.currency);
    return `${details ? details.label.replace(/\s*\([\w\.]+\)/, '') : pmDetail.method} (${amountStr})`;
  }).join(', ');
};

// Función para agregar el encabezado a todas las páginas
const addHeader = (doc: jsPDF, title: string): number => {
  doc.setFontSize(styles.title.fontSize);
  doc.setTextColor(...styles.title.textColor);
  doc.setFont('helvetica', styles.title.fontStyle as any);
  doc.text(title, doc.internal.pageSize.width / 2, 15, { align: 'center' });
  
  // Línea decorativa
  doc.setDrawColor(41, 128, 185);
  doc.setLineWidth(0.5);
  doc.line(20, 20, doc.internal.pageSize.width - 20, 20);
  
  return 25; // Retorna la posición Y después del encabezado
};

// Función para agregar el pie de página
const addFooter = (doc: jsPDF, pageNumber: number, totalPages: number): void => {
  const pageSize = doc.internal.pageSize;
  const pageHeight = pageSize.height || pageSize.getHeight();
  
  doc.setFontSize(styles.footer.fontSize);
  doc.setTextColor(...styles.footer.textColor);
  doc.setFont('helvetica', 'normal');
  
  const text = `Página ${pageNumber} de ${totalPages} • ${APP_TITLE}`;
  const textWidth = doc.getTextWidth(text);
  const textX = (pageSize.width - textWidth) / 2;
  
  doc.text(text, textX, pageHeight - 10);
};

// Función para crear una página con encabezado y pie de página
const addNewPage = (doc: jsPDF, title: string, pageNumber: number, totalPages: number): number => {
  doc.addPage();
  const y = addHeader(doc, title);
  addFooter(doc, pageNumber, totalPages);
  return y;
};

// Función para agregar una tabla de transacciones
const addTransactionTable = (
  doc: jsPDF,
  title: string,
  data: Transaction[],
  startY: number,
  pageNumber: number,
  totalPages: number
): { y: number; pageNumber: number; totalPages: number } => {
  const pageSize = doc.internal.pageSize;
  const margin = 20;
  
  // Agregar título de la sección
  doc.setFontSize(styles.subtitle.fontSize);
  doc.setTextColor(...styles.subtitle.textColor);
  doc.setFont('helvetica', styles.subtitle.fontStyle as any);
  doc.text(title, margin, startY);
  
  // Configurar la tabla
  const headers = [
    'Fecha',
    'Descripción',
    'Categoría',
    'Métodos de Pago',
    'Monto'
  ];
  
  // Preparar los datos de la tabla
  const tableData = data.map(transaction => ({
    date: new Date(transaction.date + 'T00:00:00').toLocaleDateString('es-VE'),
    description: transaction.description,
    category: transaction.category,
    paymentMethods: getPaymentMethodsString(transaction),
    amount: formatCurrencyForPdf(transaction.amount, transaction.currency)
  }));
  
  // Crear la tabla con autoTable
  autoTable(doc, {
    startY: startY + 5,
    head: [headers],
    body: tableData.map(item => [
      item.date,
      item.description,
      item.category,
      item.paymentMethods,
      item.amount
    ]),
    headStyles: {
      fillColor: styles.header.fillColor,
      textColor: styles.header.textColor,
      fontStyle: styles.header.fontStyle,
      fontSize: styles.row.fontSize
    },
    bodyStyles: {
      textColor: styles.row.textColor,
      fontSize: styles.row.fontSize
    },
    margin: { left: margin, right: margin },
    styles: {
      cellPadding: 3,
      overflow: 'linebreak',
      lineWidth: 0.1
    },
    columnStyles: {
      0: { cellWidth: 'auto', minCellHeight: 10 },
      1: { cellWidth: 'auto', minCellHeight: 10 },
      2: { cellWidth: 'auto', minCellHeight: 10 },
      3: { cellWidth: 'auto', minCellHeight: 10 },
      4: { cellWidth: 'auto', minCellHeight: 10, halign: 'right' }
    },
    didDrawPage: () => {
      // Actualizar el número de páginas total
      totalPages = doc.getNumberOfPages();
      // Actualizar el pie de página en cada página
      const currentPage = doc.getCurrentPageInfo().pageNumber;
      addFooter(doc, currentPage, totalPages);
    }
  });
  
  // Retornar la posición Y después de la tabla y los contadores de página
  return {
    y: (doc as any).lastAutoTable?.finalY || startY + 20,
    pageNumber: doc.getCurrentPageInfo().pageNumber,
    totalPages: doc.getNumberOfPages()
  };
};

// Exportar la función como exportación nombrada
export const generateFinancialReportPDF = (
  incomeAndAdjustments: Transaction[],
  expenses: Transaction[],
  summary: FinancialSummaryData,
  filterPeriod: FilterPeriod,
  customDateRange: CustomDateRange,
  exchangeRate: number
): void => {
  // Crear un nuevo documento PDF en modo horizontal
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });
  
  const title = `${APP_TITLE} - Informe Financiero`;
  let currentY = addHeader(doc, title);
  let pageNumber = 1;
  let totalPages = 1;
  
  // Agregar pie de página a la primera página
  addFooter(doc, pageNumber, totalPages);
  
  // Información del período y fecha de generación
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Período: ${getFilterPeriodText(filterPeriod, customDateRange)}`, 20, currentY);
  doc.text(`Generado el: ${new Date().toLocaleDateString('es-VE', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  })}`, doc.internal.pageSize.width - 20, currentY, { align: 'right' });
  
  currentY += 10;
  
  // Sección de Resumen Financiero
  doc.setFontSize(styles.subtitle.fontSize);
  doc.setTextColor(...styles.subtitle.textColor);
  doc.setFont('helvetica', styles.subtitle.fontStyle as any);
  doc.text('Resumen Financiero', 20, currentY);
  currentY += 10;
  
  // Tabla de resumen financiero
  const summaryData = [
    ['Concepto', 'Bolívares (Bs.)', 'Dólares (USD)'],
    ['Ingresos del Período', 
     formatCurrencyForPdf(summary.bs.periodIncome, Currency.BS), 
     formatCurrencyForPdf(summary.usd.periodIncome, Currency.USD)],
    ['Gastos del Período', 
     formatCurrencyForPdf(summary.bs.periodExpenses, Currency.BS), 
     formatCurrencyForPdf(summary.usd.periodExpenses, Currency.USD)],
    ['Saldo Total Actual', 
     formatCurrencyForPdf(summary.bs.totalBalance, Currency.BS), 
     formatCurrencyForPdf(summary.usd.totalBalance, Currency.USD)],
    ['Tasa de Cambio', 
     `1 USD = ${exchangeRate.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.`,
     '']
  ];
  
  autoTable(doc, {
    startY: currentY,
    head: [summaryData[0]],
    body: summaryData.slice(1),
    headStyles: {
      fillColor: styles.header.fillColor,
      textColor: styles.header.textColor,
      fontStyle: styles.header.fontStyle,
      fontSize: 10
    },
    bodyStyles: {
      textColor: styles.row.textColor,
      fontSize: 10
    },
    margin: { left: 20, right: 20 },
    styles: {
      cellPadding: 5,
      overflow: 'linebreak',
      lineWidth: 0.1
    },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'right' },
      2: { halign: 'right' }
    },
    didDrawPage: () => {
      // Actualizar el número de páginas total
      totalPages = doc.getNumberOfPages();
      // Actualizar el pie de página en cada página
      const currentPage = doc.getCurrentPageInfo().pageNumber;
      addFooter(doc, currentPage, totalPages);
    }
  });
  
  // Actualizar la posición Y después de la tabla
  currentY = (doc as any).lastAutoTable?.finalY || currentY + 50;
  
  // Agregar tablas de transacciones si hay datos
  if (incomeAndAdjustments.length > 0) {
    const result = addTransactionTable(
      doc,
      'Ingresos y Ajustes',
      incomeAndAdjustments,
      currentY + 10,
      pageNumber,
      totalPages
    );
    currentY = result.y;
    pageNumber = result.pageNumber;
    totalPages = result.totalPages;
    
    // Verificar si necesitamos una nueva página
    if (currentY > doc.internal.pageSize.height - 50) {
      currentY = addNewPage(doc, title, pageNumber + 1, totalPages + 1);
      pageNumber++;
      totalPages++;
    }
  }
  
  if (expenses.length > 0) {
    const result = addTransactionTable(
      doc,
      'Gastos',
      expenses,
      currentY + 10,
      pageNumber,
      totalPages
    );
    currentY = result.y;
    pageNumber = result.pageNumber;
    totalPages = result.totalPages;
  }
  
  // Guardar el PDF
  const dateSuffix = new Date().toISOString().split('T')[0];
  doc.save(`Informe_Financiero_${dateSuffix}.pdf`);
};
