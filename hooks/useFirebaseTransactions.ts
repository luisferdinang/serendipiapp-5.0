import { useState, useEffect, useCallback } from 'react';
import { 
  Transaction, 
  FilterPeriod, 
  FinancialSummaryData, 
  Currency, 
  PaymentMethod, 
  PaymentMethodOption,
  TransactionType, 
  CustomDateRange 
} from '../types';
import { PAYMENT_METHOD_OPTIONS, INITIAL_EXCHANGE_RATE } from '../constants';
import * as firebaseService from '../services/firebaseTransactionService';
import { useAuth } from '../contexts/AuthContext';

const today = new Date();

// Función auxiliar para formatear fechas
const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const calculateFinancialSummary = (transactions: Transaction[], exchangeRate: number): FinancialSummaryData => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Filtra transacciones del mes en curso
  const currentMonthTransactions = transactions.filter(tx => {
    const txDate = new Date(tx.date);
    return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
  });

  // Inicializar acumuladores
  const summary: FinancialSummaryData = {
    bs: {
      periodIncome: 0,
      periodExpenses: 0,
      cashBalance: 0,
      bankBalance: 0,
      totalBalance: 0,
    },
    usd: {
      periodIncome: 0,
      periodExpenses: 0,
      cashBalance: 0,
      usdtBalance: 0,
      totalBalance: 0,
    },
  };

  // Procesar transacciones del mes
  currentMonthTransactions.forEach(tx => {
    const amount = tx.amount || 0;
    
    if (tx.currency === Currency.BS) {
      if (tx.type === TransactionType.INCOME) {
        summary.bs.periodIncome += amount;
      } else if (tx.type === TransactionType.EXPENSE) {
        summary.bs.periodExpenses += amount;
      }
      
      // Actualizar saldos según método de pago
      tx.paymentMethods.forEach(pm => {
        if (pm.method === PaymentMethod.EFECTIVO_BS) {
          summary.bs.cashBalance += (tx.type === TransactionType.INCOME ? 1 : -1) * pm.amount;
        } else if (pm.method === PaymentMethod.PAGO_MOVIL_BS) {
          summary.bs.bankBalance += (tx.type === TransactionType.INCOME ? 1 : -1) * pm.amount;
        }
      });
    } else if (tx.currency === Currency.USD) {
      if (tx.type === TransactionType.INCOME) {
        summary.usd.periodIncome += amount;
      } else if (tx.type === TransactionType.EXPENSE) {
        summary.usd.periodExpenses += amount;
      }
      
      // Actualizar saldos según método de pago
      tx.paymentMethods.forEach(pm => {
        if (pm.method === PaymentMethod.EFECTIVO_USD) {
          summary.usd.cashBalance += (tx.type === TransactionType.INCOME ? 1 : -1) * pm.amount;
        } else if (pm.method === PaymentMethod.USDT) {
          summary.usd.usdtBalance += (tx.type === TransactionType.INCOME ? 1 : -1) * pm.amount;
        }
      });
    }
  });

  // Calcular saldos totales
  summary.bs.totalBalance = summary.bs.cashBalance + summary.bs.bankBalance;
  summary.usd.totalBalance = summary.usd.cashBalance + summary.usd.usdtBalance;

  // Asegurarse de que no haya valores negativos
  Object.values(summary.bs).forEach((value, index) => {
    if (typeof value === 'number') {
      summary.bs[Object.keys(summary.bs)[index]] = Math.max(0, value);
    }
  });

  Object.values(summary.usd).forEach((value, index) => {
    if (typeof value === 'number') {
      summary.usd[Object.keys(summary.usd)[index]] = Math.max(0, value);
    }
  });

  console.log('Resumen financiero calculado:', summary);
  return summary;
};

interface UseFirebaseTransactionsReturn {
  transactions: Transaction[];
  allTransactions: Transaction[];
  incomeAndAdjustments: Transaction[];
  expenses: Transaction[];
  financialSummary: FinancialSummaryData;
  filterPeriod: FilterPeriod;
  setFilterPeriod: (period: FilterPeriod) => void;
  customDateRange: CustomDateRange;
  setCustomDateRange: (range: CustomDateRange | ((prev: CustomDateRange) => CustomDateRange)) => void;
  exchangeRate: number;
  setExchangeRate: (rate: number) => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<string>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  getPaymentMethodDetails: (method: PaymentMethod) => PaymentMethodOption;
  refreshData: () => Promise<void>;
}

export const useFirebaseTransactions = (): UseFirebaseTransactionsReturn => {
  const { currentUser } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>(FilterPeriod.ALL);
  const [customDateRange, setCustomDateRange] = useState<CustomDateRange>({
    startDate: formatDateForInput(new Date(today.getFullYear(), today.getMonth(), 1)),
    endDate: formatDateForInput(today),
  });

  console.log('useFirebaseTransactions - currentUser:', currentUser?.email);

  const [exchangeRate, setExchangeRateState] = useState<number>(INITIAL_EXCHANGE_RATE);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummaryData>({
    bs: {
      periodIncome: 0,
      periodExpenses: 0,
      cashBalance: 0,
      bankBalance: 0,
      totalBalance: 0,
    },
    usd: {
      periodIncome: 0,
      periodExpenses: 0,
      cashBalance: 0,
      usdtBalance: 0,
      totalBalance: 0,
    },
  });

  const loadInitialData = useCallback(async () => {
    console.log('loadInitialData - Usuario actual:', currentUser?.uid);
    if (!currentUser) {
      console.log('loadInitialData - No hay usuario autenticado');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Cargando transacciones y tasa de cambio...');
      const [storedTransactions, storedRate] = await Promise.all([
        firebaseService.getTransactions(currentUser.uid),
        firebaseService.getExchangeRate()
      ]);
      
      console.log('Transacciones cargadas:', storedTransactions);
      console.log('Tasa de cambio cargada:', storedRate);
      
      setTransactions(storedTransactions);
      if (storedRate !== null) {
        setExchangeRateState(storedRate);
      }
    } catch (e) {
      setError("Error al cargar datos. Intenta de nuevo.");
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const setAndSaveExchangeRate = async (rate: number) => {
    setExchangeRateState(rate);
    try {
      await firebaseService.saveExchangeRate(rate);
    } catch (e) {
      console.error("Failed to save exchange rate", e);
      throw e;
    }
  };

  const addTransaction = async (transactionData: Omit<Transaction, 'id'>) => {
    console.log('Iniciando addTransaction con datos:', transactionData);
    if (!currentUser) {
      const errorMsg = 'No hay usuario autenticado';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
    
    try {
      console.log('Llamando a firebaseService.addTransaction...');
      const id = await firebaseService.addTransaction(transactionData, currentUser.uid);
      console.log('Transacción agregada con ID:', id);
      
      // Crear la nueva transacción con el ID devuelto
      const newTransaction: Transaction = { ...transactionData, id };
      
      // Actualizar el estado local
      setTransactions(prev => {
        const updated = [newTransaction, ...prev];
        console.log('Estado de transacciones actualizado:', updated);
        return updated;
      });
      
      return id;
    } catch (error) {
      const errorMsg = `Error al agregar transacción: ${error instanceof Error ? error.message : String(error)}`;
      console.error(errorMsg, error);
      setError(errorMsg);
      throw error;
    }
  };

  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    try {
      await firebaseService.updateTransaction(id, updates);
      setTransactions(prev => 
        prev.map(tx => tx.id === id ? { ...tx, ...updates } : tx)
      );
    } catch (e) {
      console.error("Error updating transaction:", e);
      throw e;
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      await firebaseService.deleteTransaction(id);
      setTransactions(prev => prev.filter(tx => tx.id !== id));
    } catch (e) {
      console.error("Error deleting transaction:", e);
      throw e;
    }
  };

  // Filtra las transacciones según el período seleccionado
  const filterTransactionsByPeriod = (txs: Transaction[]) => {
    const now = new Date();
    const startDate = new Date(customDateRange.startDate);
    const endDate = new Date(customDateRange.endDate);
    endDate.setHours(23, 59, 59, 999);

    return txs.filter(tx => {
      const txDate = new Date(tx.date);
      
      switch (filterPeriod) {
        case FilterPeriod.TODAY:
          return txDate.toDateString() === now.toDateString();
        case FilterPeriod.WEEK: {
          const weekAgo = new Date();
          weekAgo.setDate(now.getDate() - 7);
          return txDate >= weekAgo && txDate <= now;
        }
        case FilterPeriod.MONTH: {
          const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          return txDate >= firstDayOfMonth && txDate <= now;
        }
        case FilterPeriod.CUSTOM:
          return txDate >= startDate && txDate <= endDate;
        case FilterPeriod.ALL:
        default:
          return true;
      }
    });
  };

  const filteredTransactions = filterTransactionsByPeriod(transactions);
  
  // Actualizar el resumen financiero cuando cambian las transacciones o la tasa de cambio
  useEffect(() => {
    if (transactions.length > 0) {
      const summary = calculateFinancialSummary(transactions, exchangeRate);
      setFinancialSummary(summary);
    }
  }, [transactions, exchangeRate, setFinancialSummary]);

  // Función para recargar los datos manualmente
  const refreshData = useCallback(async () => {
    if (!currentUser) return;
    console.log('Recargando datos...');
    try {
      setIsLoading(true);
      const [storedTransactions, storedRate] = await Promise.all([
        firebaseService.getTransactions(currentUser.uid),
        firebaseService.getExchangeRate()
      ]);
      
      console.log('Datos recargados:', { transactions: storedTransactions, rate: storedRate });
      
      setTransactions(storedTransactions);
      if (storedRate !== null) {
        setExchangeRateState(storedRate);
      }
    } catch (e) {
      setError("Error al recargar los datos. Intenta de nuevo.");
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [transactions, exchangeRate]);

  return {
    transactions: filteredTransactions,
    allTransactions: transactions,
    incomeAndAdjustments: transactions.filter(tx => tx.type !== TransactionType.EXPENSE),
    expenses: transactions.filter(tx => tx.type === TransactionType.EXPENSE),
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
    getPaymentMethodDetails: (method: PaymentMethod) => {
      return PAYMENT_METHOD_OPTIONS.find(opt => opt.id === method) || {
        id: method,
        label: method,
        currency: Currency.USD,
        accountType: 'cash'
      };
    },
    refreshData: loadInitialData,
  };
};
