
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { AnalyzeButton } from './AnalyzeButton';
import { Transaction, Currency, TransactionType, PaymentMethodOption, FinancialSummaryData, FilterPeriod, CustomDateRange } from '../types';
import { FilterControls } from './FilterControls'; // Import FilterControls
import { formatDateForInput, parseInputDate } from '../constants'; // Import constants for filters

interface DashboardTabProps {
  allTransactions: Transaction[];
  // filteredExpenses: Transaction[]; // No longer needed as prop
  // filteredIncomeAndAdjustments: Transaction[]; // No longer needed as prop
  exchangeRate: number;
  paymentMethodOptions: PaymentMethodOption[]; // Kept for future potential use, though not directly used now
  currencyOptions: { value: Currency, label: string }[]; // Kept for future potential use
  financialSummary: FinancialSummaryData; 
}

declare global {
  interface Window {
    Chart: any;
  }
}

const chartColors = {
  primary: 'rgba(56, 189, 248, 0.7)', // sky-400
  green: 'rgba(16, 185, 129, 0.7)', // emerald-500
  red: 'rgba(239, 68, 68, 0.7)',   // red-500
  blue: 'rgba(59, 130, 246, 0.7)', // blue-500
  purple: 'rgba(139, 92, 246, 0.7)', // violet-500
  teal: 'rgba(20, 184, 166, 0.7)', // teal-500
  orange: 'rgba(249, 115, 22, 0.7)', // orange-500
  yellow: 'rgba(245, 158, 11, 0.7)', // amber-500
  pink: 'rgba(236, 72, 153, 0.7)', // pink-500
  cyan: 'rgba(22, 163, 165, 0.7)', // cyan-500
  lime: 'rgba(132, 204, 22, 0.7)', // lime-500
  indigo: 'rgba(99, 102, 241, 0.7)', //indigo-500
};

const chartBorderColors = {
  primary: 'rgb(56, 189, 248)',
  green: 'rgb(16, 185, 129)',
  red: 'rgb(239, 68, 68)',
  blue: 'rgb(59, 130, 246)',
  purple: 'rgb(139, 92, 246)',
  teal: 'rgb(20, 184, 166)',
  orange: 'rgb(249, 115, 22)',
  yellow: 'rgb(245, 158, 11)',
  pink: 'rgb(236, 72, 153)',
  cyan: 'rgb(22, 163, 165)',
  lime: 'rgb(132, 204, 22)',
  indigo: 'rgb(99, 102, 241)',
};

const colorKeys = Object.keys(chartColors) as Array<keyof typeof chartColors>;
const getColorsForData = (count: number) => {
  const bgColors = [];
  const borderColors = [];
  for (let i = 0; i < count; i++) {
    const colorKey = colorKeys[i % colorKeys.length];
    bgColors.push(chartColors[colorKey]);
    borderColors.push(chartBorderColors[colorKey]);
  }
  return { bgColors, borderColors };
};

const KPICard: React.FC<{ title: string; value: string; subtext?: string; icon?: React.ReactNode; cardClassName?: string; valueClassName?: string }> = 
  ({ title, value, subtext, icon, cardClassName = "bg-slate-800", valueClassName="" }) => (
    <div className={`p-4 rounded-lg shadow-lg ${cardClassName}`}>
      <div className="flex items-center text-slate-400 text-sm mb-1">
        {icon && <span className="mr-2">{icon}</span>}
        {title}
      </div>
      <p className={`text-2xl font-bold ${valueClassName}`}>{value}</p>
      {subtext && <p className="text-xs text-slate-500 mt-1">{subtext}</p>}
    </div>
);

// Icons for KPIs
const IncomeIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-green-400"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-6-6h12" /></svg>;
const ExpenseIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-red-400"><path strokeLinecap="round" strokeLinejoin="round" d="M18 12H6" /></svg>;
const NetProfitIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-sky-400"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" /></svg>;
const BalanceIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-amber-400"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 3a9 9 0 11-18 0m18 0a9 9 0 10-18 0" /></svg>;


export const DashboardTab: React.FC<DashboardTabProps> = ({
  allTransactions,
  exchangeRate,
  financialSummary, // Global summary for total balance KPI
}) => {
  const expensesByCategoryChartRef = useRef<HTMLCanvasElement>(null);
  const monthlyFlowChartRef = useRef<HTMLCanvasElement>(null);
  const incomeSourcesChartRef = useRef<HTMLCanvasElement>(null);
  const balanceEvolutionChartRef = useRef<HTMLCanvasElement>(null);

  const chartInstancesRef = useRef<Record<string, any>>({});

  // Local filter state for Dashboard
  const [dashboardFilterPeriod, setDashboardFilterPeriod] = useState<FilterPeriod>(FilterPeriod.ALL);
  const todayForRange = new Date();
  const [dashboardCustomDateRange, setDashboardCustomDateRange] = useState<CustomDateRange>({
    startDate: formatDateForInput(new Date(todayForRange.getFullYear(), todayForRange.getMonth(), 1)),
    endDate: formatDateForInput(todayForRange),
  });

  const handleDashboardCustomRangeChange = (name: keyof CustomDateRange, value: string) => {
    setDashboardCustomDateRange(prev => ({ ...prev, [name]: value }));
  };

  // Filter transactions based on local dashboard filters
  const dashboardFilteredTransactions = useMemo(() => {
    return allTransactions.filter(transaction => {
      if (dashboardFilterPeriod === FilterPeriod.ALL) return true;
      
      const transactionDate = parseInputDate(transaction.date);
      const todayFilter = new Date();
      todayFilter.setHours(0,0,0,0);

      if (dashboardFilterPeriod === FilterPeriod.TODAY) {
        return transactionDate.getTime() === todayFilter.getTime();
      }
      if (dashboardFilterPeriod === FilterPeriod.WEEK) {
        const startOfWeek = new Date(todayFilter);
        startOfWeek.setDate(todayFilter.getDate() - todayFilter.getDay() + (todayFilter.getDay() === 0 ? -6 : 1));
        startOfWeek.setHours(0,0,0,0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23,59,59,999);
        return transactionDate >= startOfWeek && transactionDate <= endOfWeek;
      }
      if (dashboardFilterPeriod === FilterPeriod.MONTH) {
        const startOfMonth = new Date(todayFilter.getFullYear(), todayFilter.getMonth(), 1);
        const endOfMonth = new Date(todayFilter.getFullYear(), todayFilter.getMonth() + 1, 0);
        endOfMonth.setHours(23,59,59,999);
        return transactionDate >= startOfMonth && transactionDate <= endOfMonth;
      }
      if (dashboardFilterPeriod === FilterPeriod.CUSTOM && dashboardCustomDateRange.startDate && dashboardCustomDateRange.endDate) {
          const startDate = parseInputDate(dashboardCustomDateRange.startDate);
          startDate.setHours(0,0,0,0);
          const endDate = parseInputDate(dashboardCustomDateRange.endDate);
          endDate.setHours(23,59,59,999);
          return transactionDate >= startDate && transactionDate <= endDate;
      }
      return true;
    });
  }, [allTransactions, dashboardFilterPeriod, dashboardCustomDateRange]);

  const dashboardFilteredExpensesInternal = useMemo(() => {
    return dashboardFilteredTransactions.filter(t => t.type === TransactionType.EXPENSE);
  }, [dashboardFilteredTransactions]);

  const dashboardFilteredIncomeAndAdjustmentsInternal = useMemo(() => {
    return dashboardFilteredTransactions.filter(t => t.type === TransactionType.INCOME || t.type === TransactionType.ADJUSTMENT);
  }, [dashboardFilteredTransactions]);


  const destroyChart = (chartId: string) => {
    if (chartInstancesRef.current[chartId]) {
      chartInstancesRef.current[chartId].destroy();
      delete chartInstancesRef.current[chartId];
    }
  };
  
  const formatCurrencyForDisplay = (value: number, currency: Currency = Currency.USD) => {
    if (currency === Currency.BS) {
      return `${new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)} ${Currency.BS}`;
    }
    return new Intl.NumberFormat('es-VE', { style: 'currency', currency: Currency.USD, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  };

  // KPIs Calculations for Dashboard Period
  const dashboardPeriodIncomeUSD = useMemo(() => {
    return dashboardFilteredIncomeAndAdjustmentsInternal.reduce((sum, t) => {
      const amountInUSD = t.currency === Currency.BS && exchangeRate > 0 ? t.amount / exchangeRate : (t.currency === Currency.USD ? t.amount : 0);
      return sum + amountInUSD;
    }, 0);
  }, [dashboardFilteredIncomeAndAdjustmentsInternal, exchangeRate]);

  const dashboardPeriodExpensesUSD = useMemo(() => {
    return dashboardFilteredExpensesInternal.reduce((sum, t) => {
      const amountInUSD = t.currency === Currency.BS && exchangeRate > 0 ? t.amount / exchangeRate : (t.currency === Currency.USD ? t.amount : 0);
      return sum + amountInUSD;
    }, 0);
  }, [dashboardFilteredExpensesInternal, exchangeRate]);

  const dashboardNetProfitLossUSD = dashboardPeriodIncomeUSD - dashboardPeriodExpensesUSD;
  
  // This KPI uses the global financial summary, not the dashboard's period filter
  const totalCombinedBalanceUSD = (financialSummary.bs.totalBalance / (exchangeRate > 0 ? exchangeRate : 1)) + financialSummary.usd.totalBalance;


  // 1. Expenses by Category (Doughnut Chart)
  useEffect(() => {
    if (!expensesByCategoryChartRef.current || !window.Chart) return;
    destroyChart('expensesByCategory');
    
    const categoryData: { [key: string]: number } = {};
    dashboardFilteredExpensesInternal.forEach(expense => {
      const categoryName = (expense.category || 'Sin Categoría').trim() || 'Sin Categoría';
      const amountInUSD = expense.currency === Currency.BS && exchangeRate > 0 ? expense.amount / exchangeRate : expense.amount;
      categoryData[categoryName] = (categoryData[categoryName] || 0) + (expense.currency === Currency.USD ? amountInUSD : (exchangeRate > 0 ? amountInUSD : 0));
    });

    const labels = Object.keys(categoryData);
    const data = Object.values(categoryData);
    const { bgColors, borderColors } = getColorsForData(labels.length);

    if (labels.length === 0) { 
        const ctx = expensesByCategoryChartRef.current?.getContext('2d');
        if(ctx) {
            ctx.clearRect(0,0, ctx.canvas.width, ctx.canvas.height);
            ctx.font = "16px Inter";
            ctx.fillStyle = "rgb(148,163,184)"; // slate-400
            ctx.textAlign = "center";
            ctx.fillText("No hay datos de gastos para mostrar.", ctx.canvas.width / 2, ctx.canvas.height / 2);
        }
        return; 
    }

    chartInstancesRef.current['expensesByCategory'] = new window.Chart(expensesByCategoryChartRef.current, {
      type: 'doughnut',
      data: { labels, datasets: [{ data, backgroundColor: bgColors, borderColor: borderColors, borderWidth: 1 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { color: 'rgb(203, 213, 225)'}}, title: { display: true, text: 'Gastos por Categoría (USD equiv.)', color: 'rgb(226, 232, 240)', font: { size: 16}}, tooltip: { callbacks: { label: (c: any) => `${c.label}: ${formatCurrencyForDisplay(c.parsed)}` }}}},
    });
    return () => destroyChart('expensesByCategory');
  }, [dashboardFilteredExpensesInternal, exchangeRate]);

  // 2. Monthly Income vs Expenses (Bar Chart) - Uses allTransactions for historical view
  useEffect(() => {
    if (!monthlyFlowChartRef.current || !window.Chart) return;
    destroyChart('monthlyFlow');

    const monthlyData: { [key: string]: { income: number; expense: number } } = {};
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0,0,0,0);

    allTransactions.forEach(t => {
      const tDate = new Date(t.date + 'T00:00:00');
      if (tDate >= twelveMonthsAgo) {
        const monthYear = `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyData[monthYear]) monthlyData[monthYear] = { income: 0, expense: 0 };
        const amountInUSD = t.currency === Currency.BS && exchangeRate > 0 ? t.amount / exchangeRate : (t.currency === Currency.USD ? t.amount : 0);
        if (t.type === TransactionType.INCOME || t.type === TransactionType.ADJUSTMENT) monthlyData[monthYear].income += amountInUSD;
        else if (t.type === TransactionType.EXPENSE) monthlyData[monthYear].expense += amountInUSD;
      }
    });
    const sortedMonths = Object.keys(monthlyData).sort();
    const labels = sortedMonths.map(my => new Date(parseInt(my.split('-')[0]), parseInt(my.split('-')[1]) - 1, 1).toLocaleString('es-VE', { month: 'short', year: 'numeric' }));
    const incomeData = sortedMonths.map(m => monthlyData[m].income);
    const expenseData = sortedMonths.map(m => monthlyData[m].expense);

    if (labels.length === 0) { 
        const ctx = monthlyFlowChartRef.current?.getContext('2d');
        if(ctx) {
            ctx.clearRect(0,0, ctx.canvas.width, ctx.canvas.height);
            ctx.font = "16px Inter";
            ctx.fillStyle = "rgb(148,163,184)";
            ctx.textAlign = "center";
            ctx.fillText("No hay datos de flujo mensual para mostrar.", ctx.canvas.width / 2, ctx.canvas.height / 2);
        }
        return; 
    }

    chartInstancesRef.current['monthlyFlow'] = new window.Chart(monthlyFlowChartRef.current, {
      type: 'bar',
      data: { labels, datasets: [
        { label: 'Ingresos (USD)', data: incomeData, backgroundColor: chartColors.green, borderColor: chartBorderColors.green, borderWidth: 1 },
        { label: 'Gastos (USD)', data: expenseData, backgroundColor: chartColors.red, borderColor: chartBorderColors.red, borderWidth: 1 }
      ]},
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { color: 'rgb(148,163,184)', callback: (v:any) => formatCurrencyForDisplay(Number(v))}, grid: { color: 'rgba(100,116,139,0.2)'}}, x: { ticks: { color: 'rgb(148,163,184)'}, grid: { display: false }}}, plugins: { legend: { position: 'top', labels: { color: 'rgb(203,213,225)'}}, title: { display: true, text: 'Ingresos vs. Gastos Mensuales (Últimos 12 meses, USD equiv.)', color: 'rgb(226,232,240)', font: {size: 16}}, tooltip: { callbacks: { label: (c:any) => `${c.dataset.label}: ${formatCurrencyForDisplay(c.parsed.y)}`}}}},
    });
    return () => destroyChart('monthlyFlow');
  }, [allTransactions, exchangeRate]);

  // 3. Income Sources (Doughnut Chart)
  useEffect(() => {
    if (!incomeSourcesChartRef.current || !window.Chart) return;
    destroyChart('incomeSources');

    const categoryData: { [key: string]: number } = {};
    dashboardFilteredIncomeAndAdjustmentsInternal.filter(t => t.type === TransactionType.INCOME).forEach(income => {
        const categoryName = (income.category || 'Sin Categoría').trim() || 'Sin Categoría';
        const amountInUSD = income.currency === Currency.BS && exchangeRate > 0 ? income.amount / exchangeRate : (income.currency === Currency.USD ? income.amount : 0);
        categoryData[categoryName] = (categoryData[categoryName] || 0) + amountInUSD;
    });
    const labels = Object.keys(categoryData);
    const data = Object.values(categoryData);
    const { bgColors, borderColors } = getColorsForData(labels.length);
    
    if (labels.length === 0) { 
        const ctx = incomeSourcesChartRef.current?.getContext('2d');
        if(ctx) {
            ctx.clearRect(0,0, ctx.canvas.width, ctx.canvas.height);
            ctx.font = "16px Inter";
            ctx.fillStyle = "rgb(148,163,184)";
            ctx.textAlign = "center";
            ctx.fillText("No hay datos de fuentes de ingreso para mostrar.", ctx.canvas.width / 2, ctx.canvas.height / 2);
        }
        return; 
    }

    chartInstancesRef.current['incomeSources'] = new window.Chart(incomeSourcesChartRef.current, {
        type: 'doughnut',
        data: { labels, datasets: [{ data, backgroundColor: bgColors, borderColor: borderColors, borderWidth: 1 }]},
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { color: 'rgb(203,213,225)'}}, title: { display: true, text: 'Fuentes de Ingreso (USD equiv.)', color: 'rgb(226,232,240)', font: {size: 16}}, tooltip: { callbacks: { label: (c:any) => `${c.label}: ${formatCurrencyForDisplay(c.parsed)}`}}}},
    });
    return () => destroyChart('incomeSources');
  }, [dashboardFilteredIncomeAndAdjustmentsInternal, exchangeRate]);

  // 4. Balance Evolution (Line Chart) - Uses allTransactions for historical view
  useEffect(() => {
    if (!balanceEvolutionChartRef.current || !window.Chart) return;
    destroyChart('balanceEvolution');

    const monthlyBalances: { [key: string]: number } = {};
    const DATES: Date[] = [];
    const today = new Date();
    for (let i = 11; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        DATES.push(d);
        const monthYear = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlyBalances[monthYear] = 0;
    }

    let runningBalance = 0;
    const firstDateInWindow = DATES[0];
    allTransactions.forEach(t => {
        const tDate = new Date(t.date + 'T00:00:00');
        if (tDate < firstDateInWindow) {
            const amountInUSD = t.currency === Currency.BS && exchangeRate > 0 ? t.amount / exchangeRate : (t.currency === Currency.USD ? t.amount : 0);
            if (t.type === TransactionType.INCOME || t.type === TransactionType.ADJUSTMENT) runningBalance += amountInUSD;
            else if (t.type === TransactionType.EXPENSE) runningBalance -= amountInUSD;
        }
    });
    
    DATES.forEach(d => {
        const monthYear = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        let currentMonthBalanceChange = 0; 
        allTransactions.forEach(t => {
            const tDate = new Date(t.date + 'T00:00:00');
            if (tDate.getFullYear() === d.getFullYear() && tDate.getMonth() === d.getMonth()) {
                 const amountInUSD = t.currency === Currency.BS && exchangeRate > 0 ? t.amount / exchangeRate : (t.currency === Currency.USD ? t.amount : 0);
                 if (t.type === TransactionType.INCOME || t.type === TransactionType.ADJUSTMENT) currentMonthBalanceChange += amountInUSD;
                 else if (t.type === TransactionType.EXPENSE) currentMonthBalanceChange -= amountInUSD;
            }
        });
        runningBalance += currentMonthBalanceChange; 
        monthlyBalances[monthYear] = runningBalance;
    });

    const labels = DATES.map(d => d.toLocaleString('es-VE', { month: 'short', year: 'numeric' }));
    const data = DATES.map(d => monthlyBalances[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`]);

    if (labels.length === 0) {
        const ctx = balanceEvolutionChartRef.current?.getContext('2d');
        if(ctx) {
            ctx.clearRect(0,0, ctx.canvas.width, ctx.canvas.height);
            ctx.font = "16px Inter";
            ctx.fillStyle = "rgb(148,163,184)";
            ctx.textAlign = "center";
            ctx.fillText("No hay datos de evolución de saldo para mostrar.", ctx.canvas.width / 2, ctx.canvas.height / 2);
        }
        return; 
    }
    
    chartInstancesRef.current['balanceEvolution'] = new window.Chart(balanceEvolutionChartRef.current, {
        type: 'line',
        data: { labels, datasets: [{ label: 'Saldo General (USD equiv.)', data, borderColor: chartBorderColors.primary, backgroundColor: chartColors.primary, tension: 0.1, fill: true }]},
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { ticks: { color: 'rgb(148,163,184)', callback: (v:any) => formatCurrencyForDisplay(Number(v))}, grid: { color: 'rgba(100,116,139,0.2)'}}, x: { ticks: { color: 'rgb(148,163,184)'}, grid: { display: false }}}, plugins: { legend: { display: false }, title: { display: true, text: 'Evolución del Saldo General (Últimos 12 meses, USD equiv.)', color: 'rgb(226,232,240)', font: {size: 16}}, tooltip: { callbacks: { label: (c:any) => `Saldo: ${formatCurrencyForDisplay(c.parsed.y)}`}}}},
    });
    return () => destroyChart('balanceEvolution');
  }, [allTransactions, exchangeRate]);

  // Significant Transactions (based on dashboard's local filter)
  const significantTransactions = useMemo(() => {
    return [...dashboardFilteredIncomeAndAdjustmentsInternal, ...dashboardFilteredExpensesInternal]
      .map(t => {
          const amountInUSD = t.currency === Currency.BS && exchangeRate > 0 ? t.amount / exchangeRate : (t.currency === Currency.USD ? t.amount : 0);
          return { ...t, amountInUSD: Math.abs(amountInUSD) }; 
      })
      .sort((a, b) => b.amountInUSD - a.amountInUSD) 
      .slice(0, 5);
  }, [dashboardFilteredIncomeAndAdjustmentsInternal, dashboardFilteredExpensesInternal, exchangeRate]);


  return (
    <div className="space-y-8">
      <FilterControls
        currentFilter={dashboardFilterPeriod}
        onFilterChange={setDashboardFilterPeriod}
        customRange={dashboardCustomDateRange}
        onCustomRangeChange={handleDashboardCustomRangeChange}
      />

      {/* KPIs Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <KPICard title="Ingresos del Período (Dashboard)" value={formatCurrencyForDisplay(dashboardPeriodIncomeUSD)} icon={<IncomeIcon />} valueClassName="text-green-400" />
        <KPICard title="Gastos del Período (Dashboard)" value={formatCurrencyForDisplay(dashboardPeriodExpensesUSD)} icon={<ExpenseIcon />} valueClassName="text-red-400" />
        <KPICard title="Beneficio/Pérdida Neta (Dashboard)" value={formatCurrencyForDisplay(dashboardNetProfitLossUSD)} icon={<NetProfitIcon />} valueClassName={dashboardNetProfitLossUSD >= 0 ? "text-sky-400" : "text-orange-400"} />
        <KPICard title="Saldo Total Actual (Global)" value={formatCurrencyForDisplay(totalCombinedBalanceUSD)} icon={<BalanceIcon />} valueClassName="text-amber-400" />
      </div>
      
      {/* Botón de Análisis con IA */}
      <div className="flex justify-end mb-6">
        <AnalyzeButton 
          transactions={dashboardFilteredTransactions} 
          disabled={dashboardFilteredTransactions.length === 0}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-2 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        <div className="p-4 sm:p-6 bg-slate-800 rounded-lg shadow-xl min-h-[300px] md:min-h-[400px] flex items-center justify-center">
          <div className="relative w-full h-80 md:h-96">
            <canvas ref={expensesByCategoryChartRef}></canvas>
          </div>
        </div>
        <div className="p-4 sm:p-6 bg-slate-800 rounded-lg shadow-xl min-h-[300px] md:min-h-[400px] flex items-center justify-center">
          <div className="relative w-full h-80 md:h-96">
            <canvas ref={incomeSourcesChartRef}></canvas>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        <div className="p-4 sm:p-6 bg-slate-800 rounded-lg shadow-xl min-h-[300px] md:min-h-[400px] flex items-center justify-center">
          <div className="relative w-full h-80 md:h-96">
            <canvas ref={monthlyFlowChartRef}></canvas>
          </div>
        </div>
        <div className="p-4 sm:p-6 bg-slate-800 rounded-lg shadow-xl min-h-[300px] md:min-h-[400px] flex items-center justify-center">
          <div className="relative w-full h-80 md:h-96">
            <canvas ref={balanceEvolutionChartRef}></canvas>
          </div>
        </div>
      </div>
      
      {/* Significant Transactions */}
      <div className="p-4 sm:p-6 bg-slate-800 rounded-lg shadow-xl">
        <h2 className="text-xl font-semibold text-sky-300 mb-4">Transacciones Significativas Recientes (Período Filtrado del Dashboard)</h2>
        {significantTransactions.length > 0 ? (
          <ul className="space-y-3">
            {significantTransactions.map(t => (
              <li key={t.id} className="flex justify-between items-center p-3 bg-slate-700/50 rounded-md hover:bg-slate-700 transition-colors">
                <div>
                  <p className="text-slate-200 font-medium">{t.description}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(t.date + 'T00:00:00').toLocaleDateString('es-VE')} - {t.category || 'Sin Categoría'}
                  </p>
                </div>
                <span className={`font-semibold ${t.type === TransactionType.EXPENSE ? 'text-red-400' : 'text-green-400'}`}>
                  {t.type === TransactionType.EXPENSE ? '-' : ''}{formatCurrencyForDisplay(t.amount, t.currency)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-slate-400">No hay transacciones significativas en el período seleccionado para el dashboard.</p>
        )}
      </div>
    </div>
  );
};
