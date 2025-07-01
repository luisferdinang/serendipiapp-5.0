
import React from 'react';
import { FinancialSummaryData, Currency } from '../types';

interface SummaryCardProps {
  title: string;
  currency: Currency;
  periodIncome: number;
  periodExpenses: number; // Added prop for period expenses
  balances: { label: string; value: number }[];
  totalBalance: number;
  gradient: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, currency, periodIncome, periodExpenses, balances, totalBalance, gradient }) => {
  const formatCurrency = (value: number) => {
    return `${value.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
  };

  return (
    <div className={`p-6 rounded-xl shadow-2xl text-white ${gradient} flex flex-col h-full`}>
      <h3 className="text-2xl font-bold mb-1">{title}</h3>
      <p className="text-sm opacity-80 mb-4">Resumen Financiero del Período</p>
      
      <div className="mb-2">
        <p className="text-sm opacity-90">Ingresos del Período:</p>
        <p className="text-xl font-semibold text-green-300">{formatCurrency(periodIncome)}</p>
      </div>

      <div className="mb-4">
        <p className="text-sm opacity-90">Gastos del Período:</p>
        <p className="text-xl font-semibold text-red-300">{formatCurrency(periodExpenses)}</p>
      </div>

      <div className="space-y-2 mb-4 grow">
        {balances.map(balance => (
          <div key={balance.label} className="flex justify-between items-center py-1 border-b border-white/20 last:border-b-0">
            <span className="text-sm opacity-90">{balance.label}:</span>
            <span className="font-medium">{formatCurrency(balance.value)}</span>
          </div>
        ))}
      </div>
      
      <div className="mt-auto pt-4 border-t border-white/30">
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold">Saldo Total Actual:</span>
          <span className="text-2xl font-bold">{formatCurrency(totalBalance)}</span>
        </div>
      </div>
    </div>
  );
};


export const FinancialSummary: React.FC<{ summary: FinancialSummaryData }> = ({ summary }) => {
  // Agregar logs de depuración
  console.log('FinancialSummary - Resumen recibido:', summary);
  
  // Verificar si hay datos válidos
  const hasData = summary.bs.totalBalance > 0 || summary.usd.totalBalance > 0;
  
  if (!hasData) {
    console.warn('FinancialSummary - No hay datos financieros para mostrar');
  }
  return (
    <div className="mb-8 grid md:grid-cols-2 gap-6">
      <SummaryCard
        title="Bolívares (Bs.)"
        currency={Currency.BS}
        periodIncome={summary.bs.periodIncome}
        periodExpenses={summary.bs.periodExpenses}
        balances={[
          { label: 'Saldo en Efectivo (Bs.)', value: summary.bs.cashBalance },
          { label: 'Saldo en Banco (Pago Móvil Bs.)', value: summary.bs.bankBalance },
        ]}
        totalBalance={summary.bs.totalBalance}
        gradient="bg-gradient-to-br from-sky-600 to-cyan-700"
      />
      <SummaryCard
        title="Dólares (USD)"
        currency={Currency.USD}
        periodIncome={summary.usd.periodIncome}
        periodExpenses={summary.usd.periodExpenses}
        balances={[
          { label: 'Saldo en Efectivo (USD)', value: summary.usd.cashBalance },
          { label: 'Saldo Digital (USDT)', value: summary.usd.usdtBalance },
        ]}
        totalBalance={summary.usd.totalBalance}
        gradient="bg-gradient-to-br from-emerald-600 to-green-700"
      />
    </div>
  );
};