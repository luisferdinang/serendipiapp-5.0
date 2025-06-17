
export enum Currency {
  BS = 'Bs.',
  USD = 'USD',
}

export enum PaymentMethod {
  PAGO_MOVIL_BS = 'PAGO_MOVIL_BS',
  EFECTIVO_BS = 'EFECTIVO_BS',
  EFECTIVO_USD = 'EFECTIVO_USD',
  USDT = 'USDT',
}

export interface PaymentMethodOption {
  id: PaymentMethod;
  label: string;
  currency: Currency;
  accountType: 'bank' | 'cash' | 'digital';
}

export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
  ADJUSTMENT = 'adjustment',
}

export interface PaymentDetail {
  method: PaymentMethod;
  amount: number;
}

export interface TransactionBase {
  id: string;
  userId: string; // ID del usuario propietario
  description: string;
  unitPrice: number; // Precio unitario
  quantity: number; // Cantidad
  amount: number; // Total amount of the transaction (unitPrice * quantity)
  currency: Currency; // Currency of the transaction
  date: string; // YYYY-MM-DD
  type: TransactionType;
  paymentMethods: PaymentDetail[]; // Multiple payment methods
  category?: string; // Optional category for the transaction
  notes?: string; // Optional additional notes
  createdAt?: Date; // Fecha de creación
  updatedAt?: Date; // Fecha de última actualización
}

export interface Transaction extends Omit<TransactionBase, 'createdAt' | 'updatedAt'> {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum FilterPeriod {
  ALL = 'all',
  TODAY = 'today',
  WEEK = 'week',
  MONTH = 'month',
  CUSTOM = 'custom',
}

export interface BsSummary {
  periodIncome: number;
  periodExpenses: number; // Added field for expenses in the period
  cashBalance: number;
  bankBalance: number; // Pago Movil
  totalBalance: number;
}

export interface UsdSummary {
  periodIncome: number;
  periodExpenses: number; // Added field for expenses in the period
  cashBalance: number;
  usdtBalance: number;
  totalBalance: number;
}

export interface FinancialSummaryData {
  bs: BsSummary;
  usd: UsdSummary;
}

export interface CustomDateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}