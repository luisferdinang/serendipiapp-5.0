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

// Función para calcular el resumen financiero basado en las transacciones proporcionadas
const calculateFinancialSummary = (transactions: Transaction[]): FinancialSummaryData => {
  console.log(`[calculateFinancialSummary] Iniciando cálculo con ${transactions.length} transacciones`);

  // Inicializar resumen financiero
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

  let processedCount = 0;
  let skippedCount = 0;

  // Procesar cada transacción
  transactions.forEach((tx: Transaction, index: number) => {
    try {
      // Validar transacción
      if (!tx) {
        console.warn(`[${index}] Transacción es nula o indefinida`);
        skippedCount++;
        return;
      }

      // Validar monto
      const amount = Number(tx.amount);
      if (isNaN(amount)) {
        console.warn(`[${index}] Transacción con monto inválido:`, tx);
        skippedCount++;
        return;
      }

      // Establecer valores por defecto
      const currency = tx.currency || Currency.BS;
      const type = tx.type || TransactionType.EXPENSE;
      const paymentMethod = tx.paymentMethods?.[0]?.method || 'EFECTIVO_BS';
      
      // Mapear métodos de pago a los valores esperados
      type PaymentMethodType = 'CASH' | 'BANK_TRANSFER' | 'PM' | 'USDT' | 'BINANCE';
      const methodMap: Record<string, PaymentMethodType> = {
        'EFECTIVO_BS': 'CASH',
        'EFECTIVO_USD': 'CASH',
        'PAGO_MOVIL_BS': 'PM',
        'PM': 'PM',
        'TRANSFERENCIA': 'BANK_TRANSFER',
        'USDT': 'USDT',
        'BINANCE': 'BINANCE'
      };
      
      const method = methodMap[paymentMethod] || 'CASH';

      // Determinar si es ingreso o gasto
      const isIncome = type === TransactionType.INCOME || type === TransactionType.ADJUSTMENT;
      const isExpense = type === TransactionType.EXPENSE;

      // Log para depuración
      const txInfo = `[${index}] ${isIncome ? 'INGRESO' : isExpense ? 'GASTO' : 'TIPO_DESCONOCIDO'} | ${currency} ${amount.toFixed(2)} | ${method} | ${tx.description || 'Sin descripción'}`;
      console.log(txInfo);
      
      // Actualizar ingresos y gastos del período
      if (isIncome) {
        if (currency === Currency.BS) {
          summary.bs.periodIncome += amount;
          console.log(`Sumando a ingresos Bs.: ${amount}`);
        } else {
          summary.usd.periodIncome += amount;
          console.log(`Sumando a ingresos USD: ${amount}`);
        }
      } else if (isExpense) {
        if (currency === Currency.BS) {
          summary.bs.periodExpenses += amount;
          console.log(`Sumando a gastos Bs.: ${amount}`);
        } else {
          summary.usd.periodExpenses += amount;
          console.log(`Sumando a gastos USD: ${amount}`);
        }
      }

      // Actualizar saldos según el método de pago
      const amountToAdd = isIncome ? amount : -amount;
      
      if (currency === Currency.BS) {
        if (method === 'CASH') {
          summary.bs.cashBalance += amountToAdd;
          console.log(`Actualizando efectivo Bs.: ${amountToAdd >= 0 ? '+' : ''}${amountToAdd}`);
        } else if (method === 'BANK_TRANSFER' || method === 'PM') {
          summary.bs.bankBalance += amountToAdd;
          console.log(`Actualizando banco Bs.: ${amountToAdd >= 0 ? '+' : ''}${amountToAdd}`);
        }
      } else {
        if (method === 'CASH') {
          summary.usd.cashBalance += amountToAdd;
          console.log(`Actualizando efectivo USD: ${amountToAdd >= 0 ? '+' : ''}${amountToAdd}`);
        } else if (method === 'USDT' || method === 'BINANCE') {
          summary.usd.usdtBalance += amountToAdd;
          console.log(`Actualizando USDT: ${amountToAdd >= 0 ? '+' : ''}${amountToAdd}`);
        }
      }

      processedCount++;
    } catch (error) {
      console.error(`[${index}] Error al procesar transacción:`, error);
      skippedCount++;
    }
  });

  // Calcular saldos totales
  summary.bs.totalBalance = summary.bs.cashBalance + summary.bs.bankBalance;
  summary.usd.totalBalance = summary.usd.cashBalance + summary.usd.usdtBalance;

  // Mostrar resumen
  console.log(`[calculateFinancialSummary] Procesamiento completado:`);
  console.log(`- Transacciones procesadas: ${processedCount}`);
  console.log(`- Transacciones omitidas: ${skippedCount}`);
  console.log('Resumen financiero calculado:', JSON.stringify(summary, null, 2));
  
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
  getCurrentVenezuelaTime: () => string;
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
    console.log('🔍 [useFirebaseTransactions] loadInitialData - Usuario actual:', currentUser?.uid, 'Email:', currentUser?.email);
    if (!currentUser) {
      const errorMsg = 'No hay usuario autenticado';
      console.error('❌ [useFirebaseTransactions]', errorMsg);
      setError(errorMsg);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔄 [useFirebaseTransactions] Cargando transacciones y tasa de cambio...');
      
      // Verificar autenticación
      const user = currentUser;
      if (!user.uid) {
        throw new Error('El usuario no tiene un UID válido');
      }
      
      console.log('🔑 [useFirebaseTransactions] UID del usuario:', user.uid);
      
      // Cargar datos en paralelo
      const [storedTransactions, storedRate] = await Promise.all([
        firebaseService.getTransactions(user.uid).catch(err => {
          console.error('❌ [useFirebaseTransactions] Error al cargar transacciones:', err);
          return []; // Retornar array vacío en caso de error
        }),
        firebaseService.getExchangeRate().catch(err => {
          console.error('❌ [useFirebaseTransactions] Error al cargar tasa de cambio:', err);
          return INITIAL_EXCHANGE_RATE; // Usar valor por defecto en caso de error
        })
      ]);
      
      console.log('✅ [useFirebaseTransactions] Transacciones cargadas:', storedTransactions.length);
      console.log('💰 [useFirebaseTransactions] Tasa de cambio cargada:', storedRate);
      
      // Actualizar estado
      setTransactions(storedTransactions || []);
      setExchangeRateState(storedRate || INITIAL_EXCHANGE_RATE);
      
      // Calcular resumen financiero
      const summary = calculateFinancialSummary(storedTransactions || []);
      setFinancialSummary(summary);
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

  // Función para obtener la fecha actual en Venezuela (UTC-4)
  const getVenezuelaDate = (): Date => {
    // Usar toLocaleString con la zona horaria de América/Caracas
    const options = { timeZone: 'America/Caracas' };
    const dateStr = new Date().toLocaleString('en-US', options);
    return new Date(dateStr);
  };

  
  // Función para formatear fecha a YYYY-MM-DD
  const formatDateToYMD = (date: Date): string => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Función para formatear fecha y hora para mostrar
  const formatVenezuelaDateTime = (date: Date): string => {
    return date.toLocaleString('es-VE', { 
      timeZone: 'America/Caracas',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  // Filtra las transacciones según el período seleccionado
  const filterTransactionsByPeriod = (txs: Transaction[]) => {
    // Si es TODOS, retornar todas las transacciones
    if (filterPeriod === FilterPeriod.ALL) {
      return txs;
    }

    // Obtener la fecha actual en Venezuela
    const now = getVenezuelaDate();
    const todayStr = formatDateToYMD(now);
    
    // Solo mostrar logs una vez al cambiar de filtro
    const logKey = `last-log-${filterPeriod}-${todayStr}`;
    const lastLog = sessionStorage.getItem(logKey);
    
    if (!lastLog) {
      console.log(`Aplicando filtro: ${filterPeriod}`, { fechaActual: todayStr });
      sessionStorage.setItem(logKey, 'true');
    }

    // Si es HOY, comparar directamente los strings YYYY-MM-DD
    if (filterPeriod === FilterPeriod.TODAY) {
      return txs.filter(tx => {
        const txDateStr = tx.date.split('T')[0];
        return txDateStr === todayStr;
      });
    }

    // Para los demás períodos, usar fechas completas
    let startDate = new Date(0); // Fecha muy antigua por defecto
    let endDate = new Date();

    switch (filterPeriod) {
      case FilterPeriod.WEEK: {
        const today = new Date(now);
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Ajuste para que la semana empiece el lunes
        startDate = new Date(today);
        startDate.setDate(diff);
        startDate.setHours(0, 0, 0, 0);
        break;
      }
      case FilterPeriod.MONTH: {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Último día del mes
        endDate.setHours(23, 59, 59, 999);
        break;
      }
      case FilterPeriod.CUSTOM: {
        if (customDateRange.startDate && customDateRange.endDate) {
          startDate = new Date(customDateRange.startDate);
          endDate = new Date(customDateRange.endDate);
          endDate.setHours(23, 59, 59, 999);
        }
        break;
      }
    }

    // Solo mostrar logs de rango una vez
    if (!sessionStorage.getItem(`range-log-${filterPeriod}`)) {
      console.log(`Rango de fechas para ${filterPeriod}:`, {
        inicio: startDate.toISOString(),
        fin: endDate.toISOString()
      });
      sessionStorage.setItem(`range-log-${filterPeriod}`, 'true');
    }

    return txs.filter(tx => {
      const txDate = new Date(tx.date);
      return txDate >= startDate && txDate <= endDate;
    });
  };

  const filteredTransactions = filterTransactionsByPeriod(transactions);
  
  // Actualizar el resumen financiero cuando cambian las transacciones o el filtro
  useEffect(() => {
    if (transactions.length > 0) {
      console.log('Actualizando resumen financiero...', {
        totalTransacciones: transactions.length,
        transaccionesFiltradas: filteredTransactions.length,
        periodoFiltro: filterPeriod,
        rangoPersonalizado: filterPeriod === FilterPeriod.CUSTOM ? customDateRange : null
      });
      
      // Usar las transacciones filtradas según el período seleccionado
      const transactionsToUse = filteredTransactions;
      
      // Calcular el resumen financiero con las transacciones filtradas
      const summary = calculateFinancialSummary(transactionsToUse);
      
      console.log('Resumen financiero calculado:', summary);
      setFinancialSummary(summary);
    }
  }, [transactions, filteredTransactions, filterPeriod, customDateRange]);

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

  // Filtrar transacciones por tipo
  const filteredIncomeAndAdjustments = filteredTransactions.filter(tx => 
    tx.type === TransactionType.INCOME || tx.type === TransactionType.ADJUSTMENT
  );
  
  const filteredExpenses = filteredTransactions.filter(tx => 
    tx.type === TransactionType.EXPENSE
  );

  return {
    transactions: filteredTransactions,
    allTransactions: transactions,
    incomeAndAdjustments: filteredIncomeAndAdjustments,
    expenses: filteredExpenses,
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
    refreshData,
    getCurrentVenezuelaTime: () => formatVenezuelaDateTime(getVenezuelaDate()),
  };
};
