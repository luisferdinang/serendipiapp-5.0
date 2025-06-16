
import { Transaction, TransactionType, PaymentMethod, Currency, PaymentDetail, PaymentMethodOption } from '../types'; // Added PaymentMethodOption
import { PAYMENT_METHOD_OPTIONS } from '../constants'; // Added PAYMENT_METHOD_OPTIONS

const TRANSACTIONS_STORAGE_KEY = 'serendipiaFinanceTransactions';
const EXCHANGE_RATE_STORAGE_KEY = 'serendipiaFinanceExchangeRate';

// Initialize with some demo data if storage is empty
const initialDemoTransactions: Transaction[] = [
  { 
    id: '1', 
    description: 'Ingreso inicial Efectivo USD', 
    amount: 500, 
    currency: Currency.USD,
    date: '2024-07-01', 
    type: TransactionType.ADJUSTMENT, 
    paymentMethods: [{ method: PaymentMethod.EFECTIVO_USD, amount: 500 }],
    category: 'Saldo Inicial',
    notes: 'Ajuste inicial de fondos en efectivo USD.'
  },
  { 
    id: '2', 
    description: 'Ingreso inicial Pago Móvil Bs.', 
    amount: 10000, 
    currency: Currency.BS,
    date: '2024-07-01', 
    type: TransactionType.ADJUSTMENT, 
    paymentMethods: [{ method: PaymentMethod.PAGO_MOVIL_BS, amount: 10000 }],
    category: 'Saldo Inicial'
  },
  { 
    id: '3', 
    description: 'Venta de Diseño Web', 
    amount: 150, 
    currency: Currency.USD,
    quantity: 1, 
    date: '2024-07-10', 
    type: TransactionType.INCOME, 
    paymentMethods: [{ method: PaymentMethod.USDT, amount: 150 }],
    category: 'Servicios de Diseño',
    notes: 'Cliente X - Proyecto Y.'
  },
  { 
    id: '4', 
    description: 'Pago de Hosting', 
    amount: 20, 
    currency: Currency.USD,
    date: '2024-07-15', 
    type: TransactionType.EXPENSE, 
    paymentMethods: [{ method: PaymentMethod.USDT, amount: 20 }],
    category: 'Operativo',
    notes: 'Hosting anual del sitio web.'
  },
  { 
    id: '5', 
    description: 'Almuerzo equipo', 
    amount: 750, 
    currency: Currency.BS,
    date: '2024-07-20', 
    type: TransactionType.EXPENSE, 
    paymentMethods: [
      { method: PaymentMethod.PAGO_MOVIL_BS, amount: 500 },
      { method: PaymentMethod.EFECTIVO_BS, amount: 250 }
    ],
    category: 'Comida y Bebidas',
    notes: 'Reunión de equipo post-proyecto.'
  },
];


export const getTransactions = (): Promise<Transaction[]> => {
  return new Promise((resolve) => {
    const data = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
    if (data) {
      const parsedData = JSON.parse(data) as Transaction[];
      // Ensure all transactions have a currency field and paymentMethods array (for migration from old format)
      const migratedData = parsedData.map(t => {
        const currency = t.currency || (t.paymentMethods && t.paymentMethods.length > 0 ? PAYMENT_METHOD_OPTIONS.find(pm => pm.id === t.paymentMethods[0].method)?.currency : Currency.BS);
        const paymentMethods = t.paymentMethods || [{ method: (t as any).paymentMethod, amount: t.amount }];
        return {
          ...t,
          currency: currency as Currency,
          paymentMethods: paymentMethods as PaymentDetail[],
          // category and notes are optional, so they will be undefined if not present, which is fine.
        };
      });
      resolve(migratedData);
    } else {
      // For demo purposes, initialize with some data if none exists
      localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(initialDemoTransactions));
      resolve(initialDemoTransactions);
    }
  });
};

export const saveTransactions = (transactions: Transaction[]): Promise<void> => {
  return new Promise((resolve) => {
    localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(transactions));
    resolve();
  });
};

export const getExchangeRate = (): Promise<number | null> => {
    return new Promise((resolve) => {
        const data = localStorage.getItem(EXCHANGE_RATE_STORAGE_KEY);
        resolve(data ? parseFloat(data) : null);
    });
};

export const saveExchangeRate = (rate: number): Promise<void> => {
    return new Promise((resolve) => {
        localStorage.setItem(EXCHANGE_RATE_STORAGE_KEY, rate.toString());
        resolve();
    });
};
