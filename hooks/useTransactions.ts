
import { useState, useEffect, useCallback } from 'react';
import { Transaction, FilterPeriod, FinancialSummaryData, BsSummary, UsdSummary, Currency, PaymentMethod, TransactionType, CustomDateRange, PaymentDetail, PaymentMethodOption } from '../types';
import { PAYMENT_METHOD_OPTIONS, INITIAL_EXCHANGE_RATE, formatDateForInput, parseInputDate, getCurrencyOfPaymentMethodType } from '../constants';
import * as transactionService from '../services/transactionService';

const today = new Date();

export const useTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>(FilterPeriod.ALL);
  const [customDateRange, setCustomDateRange] = useState<CustomDateRange>({
    startDate: formatDateForInput(new Date(today.getFullYear(), today.getMonth(), 1)), // First day of current month
    endDate: formatDateForInput(today), // Today
  });

  const [exchangeRate, setExchangeRateState] = useState<number>(INITIAL_EXCHANGE_RATE);

  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [storedTransactions, storedRate] = await Promise.all([
        transactionService.getTransactions(),
        transactionService.getExchangeRate()
      ]);
      setTransactions(storedTransactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      if (storedRate !== null) {
        setExchangeRateState(storedRate);
      }
    } catch (e) {
      setError("Error al cargar datos. Intenta de nuevo.");
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const setAndSaveExchangeRate = async (rate: number) => {
    setExchangeRateState(rate);
    try {
      await transactionService.saveExchangeRate(rate);
    } catch (e) {
      console.error("Failed to save exchange rate", e);
      // Optionally notify user
    }
  };

  const addTransaction = async (transactionData: Omit<Transaction, 'id'>) => {
    const newTransaction: Transaction = {
      ...transactionData,
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9), // Simple unique ID
    };
    const updatedTransactions = [newTransaction, ...transactions].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setTransactions(updatedTransactions);
    await transactionService.saveTransactions(updatedTransactions);
  };

  const updateTransaction = async (updatedTransaction: Transaction) => {
    const updatedTransactions = transactions.map(t => t.id === updatedTransaction.id ? updatedTransaction : t).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setTransactions(updatedTransactions);
    await transactionService.saveTransactions(updatedTransactions);
  };

  const deleteTransaction = async (transactionId: string) => {
    const updatedTransactions = transactions.filter(t => t.id !== transactionId);
    setTransactions(updatedTransactions);
    await transactionService.saveTransactions(updatedTransactions);
  };

  const getPaymentMethodDetails = (methodId: PaymentMethod): PaymentMethodOption | undefined => {
    return PAYMENT_METHOD_OPTIONS.find(m => m.id === methodId);
  };

  const filteredTransactions = transactions.filter(transaction => {
    if (filterPeriod === FilterPeriod.ALL) return true;
    
    const transactionDate = parseInputDate(transaction.date);
    const todayFilter = new Date(); // Renamed to avoid conflict with global today
    todayFilter.setHours(0,0,0,0);

    if (filterPeriod === FilterPeriod.TODAY) {
      return transactionDate.getTime() === todayFilter.getTime();
    }
    if (filterPeriod === FilterPeriod.WEEK) {
      const startOfWeek = new Date(todayFilter);
      startOfWeek.setDate(todayFilter.getDate() - todayFilter.getDay() + (todayFilter.getDay() === 0 ? -6 : 1)); // Monday as start of week
      startOfWeek.setHours(0,0,0,0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23,59,59,999);
      return transactionDate >= startOfWeek && transactionDate <= endOfWeek;
    }
    if (filterPeriod === FilterPeriod.MONTH) {
      const startOfMonth = new Date(todayFilter.getFullYear(), todayFilter.getMonth(), 1);
      const endOfMonth = new Date(todayFilter.getFullYear(), todayFilter.getMonth() + 1, 0);
      endOfMonth.setHours(23,59,59,999);
      return transactionDate >= startOfMonth && transactionDate <= endOfMonth;
    }
    if (filterPeriod === FilterPeriod.CUSTOM && customDateRange.startDate && customDateRange.endDate) {
        const startDate = parseInputDate(customDateRange.startDate);
        startDate.setHours(0,0,0,0);
        const endDate = parseInputDate(customDateRange.endDate);
        endDate.setHours(23,59,59,999);
        return transactionDate >= startDate && transactionDate <= endDate;
    }
    return true;
  });

  const incomeAndAdjustments = filteredTransactions.filter(
    t => t.type === TransactionType.INCOME || t.type === TransactionType.ADJUSTMENT
  );
  const expenses = filteredTransactions.filter(t => t.type === TransactionType.EXPENSE);

  const financialSummary: FinancialSummaryData = transactions.reduce<FinancialSummaryData>((acc, t) => {
    const isWithinFilterPeriod = filteredTransactions.some(ft => ft.id === t.id);

    t.paymentMethods.forEach(pmDetail => {
      const methodDetails = getPaymentMethodDetails(pmDetail.method);
      if (!methodDetails) return; 

      const amount = pmDetail.amount;

      // Calculate total balances regardless of filter period (balances are cumulative)
      if (methodDetails.currency === Currency.BS) {
          if (t.type === TransactionType.INCOME || t.type === TransactionType.ADJUSTMENT) {
              if (methodDetails.accountType === 'cash') acc.bs.cashBalance += amount;
              if (methodDetails.accountType === 'bank') acc.bs.bankBalance += amount;
          } else if (t.type === TransactionType.EXPENSE) {
              if (methodDetails.accountType === 'cash') acc.bs.cashBalance -= amount;
              if (methodDetails.accountType === 'bank') acc.bs.bankBalance -= amount;
          }
      } else if (methodDetails.currency === Currency.USD) {
          if (t.type === TransactionType.INCOME || t.type === TransactionType.ADJUSTMENT) {
              if (methodDetails.accountType === 'cash') acc.usd.cashBalance += amount;
              if (methodDetails.accountType === 'digital') acc.usd.usdtBalance += amount;
          } else if (t.type === TransactionType.EXPENSE) {
              if (methodDetails.accountType === 'cash') acc.usd.cashBalance -= amount;
              if (methodDetails.accountType === 'digital') acc.usd.usdtBalance -= amount;
          }
      }
      
      // Calculate period income and expenses only for transactions within the filter
      if (isWithinFilterPeriod) {
          if (t.type === TransactionType.INCOME || t.type === TransactionType.ADJUSTMENT) {
              if (methodDetails.currency === Currency.BS) {
                  acc.bs.periodIncome += amount;
              } else if (methodDetails.currency === Currency.USD) {
                  acc.usd.periodIncome += amount;
              }
          } else if (t.type === TransactionType.EXPENSE) {
              if (methodDetails.currency === Currency.BS) {
                  acc.bs.periodExpenses += amount;
              } else if (methodDetails.currency === Currency.USD) {
                  acc.usd.periodExpenses += amount;
              }
          }
      }
    });

    return acc;
  }, {
    bs: { periodIncome: 0, periodExpenses: 0, cashBalance: 0, bankBalance: 0, totalBalance: 0 },
    usd: { periodIncome: 0, periodExpenses: 0, cashBalance: 0, usdtBalance: 0, totalBalance: 0 },
  });

  financialSummary.bs.totalBalance = financialSummary.bs.cashBalance + financialSummary.bs.bankBalance;
  financialSummary.usd.totalBalance = financialSummary.usd.cashBalance + financialSummary.usd.usdtBalance;

  return {
    transactions: filteredTransactions,
    allTransactions: transactions, 
    incomeAndAdjustments,
    expenses,
    financialSummary,
    filterPeriod,
    setFilterPeriod,
    customDateRange,
    setCustomDateRange,
    exchangeRate,
    setExchangeRate: setAndSaveExchangeRate,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    isLoading,
    error,
    getPaymentMethodDetails,
  };
};