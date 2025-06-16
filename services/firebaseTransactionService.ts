import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  doc, 
  query, 
  where, 
  orderBy, 
  getDoc,
  setDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  Transaction, 
  PaymentMethod, 
  Currency,
  TransactionType,
  PaymentDetail 
} from '../types';

const TRANSACTIONS_COLLECTION = 'transactions';
const EXCHANGE_RATES_COLLECTION = 'exchangeRates';

export const getTransactions = async (userId: string): Promise<Transaction[]> => {
  try {
    console.log('Obteniendo transacciones para el usuario:', userId);
    const transactionsRef = collection(db, TRANSACTIONS_COLLECTION);
    
    // Solo filtramos por usuario (índice simple)
    const q = query(
      transactionsRef,
      where('userId', '==', userId)
    );
    
    console.log('Ejecutando consulta...');
    const querySnapshot = await getDocs(q);
    console.log(`Se encontraron ${querySnapshot.docs.length} documentos`);
    
    if (querySnapshot.empty) {
      console.log('No se encontraron transacciones para el usuario:', userId);
      return [];
    }
    
    // Procesar y ordenar los resultados en memoria
    const transactions = querySnapshot.docs.map(doc => {
      const data = doc.data();
      console.log('Procesando documento:', { id: doc.id, ...data });
      
      // Validar y formatear los datos
      const transaction: Transaction = {
        id: doc.id,
        description: data.description || '',
        amount: typeof data.amount === 'number' ? data.amount : parseFloat(data.amount) || 0,
        currency: (data.currency as Currency) || Currency.USD,
        type: (data.type as TransactionType) || TransactionType.EXPENSE,
        date: data.date || new Date().toISOString().split('T')[0],
        paymentMethods: Array.isArray(data.paymentMethods) 
          ? data.paymentMethods.map((pm: any) => ({
              method: (pm.method as PaymentMethod) || PaymentMethod.EFECTIVO_USD,
              amount: typeof pm.amount === 'number' ? pm.amount : parseFloat(pm.amount) || 0
            }))
          : [],
        quantity: data.quantity !== undefined 
          ? (typeof data.quantity === 'number' ? data.quantity : parseFloat(data.quantity) || 0)
          : undefined,
        category: data.category,
        notes: data.notes
      };
      
      return transaction;
    });
    
    // Ordenar por fecha descendente (más reciente primero)
    const sortedTransactions = [...transactions].sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
    
    console.log(`Se procesaron ${sortedTransactions.length} transacciones`);
    return sortedTransactions;
  } catch (error) {
    console.error('Error getting transactions:', error);
    throw error;
  }
};

export const addTransaction = async (transactionData: Omit<Transaction, 'id'>, userId: string): Promise<string> => {
  console.log('Iniciando addTransaction con datos:', { transactionData, userId });
  
  try {
    // Validar que userId existe
    if (!userId) {
      const errorMsg = 'Se requiere un ID de usuario para agregar una transacción';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
    
    // Validar campos requeridos
    if (!transactionData.description?.trim()) {
      const errorMsg = 'La descripción es requerida';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
    
    const amount = Number(transactionData.amount);
    if (isNaN(amount) || amount <= 0) {
      const errorMsg = 'El monto debe ser un número mayor a cero';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
    
    if (!Object.values(Currency).includes(transactionData.currency as Currency)) {
      const errorMsg = `Moneda no válida: ${transactionData.currency}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
    
    if (!Object.values(TransactionType).includes(transactionData.type as TransactionType)) {
      const errorMsg = `Tipo de transacción no válido: ${transactionData.type}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
    
    // Preparar los datos para Firestore
    const transactionToSave: Record<string, any> = {
      description: transactionData.description.trim(),
      amount: amount,
      currency: transactionData.currency,
      type: transactionData.type,
      date: transactionData.date || new Date().toISOString().split('T')[0],
      paymentMethods: (transactionData.paymentMethods || []).map(pm => ({
        method: pm.method,
        amount: Number(pm.amount) || 0
      })),
      userId: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    // Solo agregar campos opcionales si tienen valor
    if (transactionData.quantity !== undefined && transactionData.quantity !== null) {
      transactionToSave.quantity = Number(transactionData.quantity);
    }
    
    if (transactionData.category?.trim()) {
      transactionToSave.category = transactionData.category.trim();
    }
    
    if (transactionData.notes?.trim()) {
      transactionToSave.notes = transactionData.notes.trim();
    }
    
    console.log('Datos validados de la transacción a guardar:', transactionToSave);
    
    // Guardar en Firestore
    const transactionsRef = collection(db, TRANSACTIONS_COLLECTION);
    console.log('Agregando documento a la colección...');
    
    const docRef = await addDoc(transactionsRef, transactionToSave);
    console.log('✅ Transacción guardada con ID:', docRef.id);
    
    // Opcional: Verificar que el documento se guardó correctamente
    try {
      const docSnap = await getDoc(doc(db, TRANSACTIONS_COLLECTION, docRef.id));
      if (docSnap.exists()) {
        console.log('📄 Documento verificado en Firestore:', { id: docSnap.id, ...docSnap.data() });
      } else {
        console.warn('⚠️ El documento no se encontró después de guardar');
      }
    } catch (verifyError) {
      console.error('Error al verificar el documento guardado:', verifyError);
      // No lanzamos el error para no fallar la operación principal
    }
    
    return docRef.id;
  } catch (error) {
    const errorMsg = `Error al agregar transacción: ${error instanceof Error ? error.message : String(error)}`;
    console.error(errorMsg, error);
    throw new Error(errorMsg);
  }
};

export const updateTransaction = async (id: string, transaction: Partial<Transaction>): Promise<void> => {
  try {
    const transactionRef = doc(db, TRANSACTIONS_COLLECTION, id);
    await updateDoc(transactionRef, {
      ...transaction,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating transaction:', error);
    throw error;
  }
};

export const deleteTransaction = async (id: string): Promise<void> => {
  try {
    const transactionRef = doc(db, TRANSACTIONS_COLLECTION, id);
    await deleteDoc(transactionRef);
  } catch (error) {
    console.error('Error deleting transaction:', error);
    throw error;
  }
};

export const getExchangeRate = async (): Promise<number | null> => {
  try {
    const exchangeRateRef = doc(db, EXCHANGE_RATES_COLLECTION, 'current');
    const docSnap = await getDoc(exchangeRateRef);
    
    if (docSnap.exists()) {
      return docSnap.data().rate as number;
    }
    return null;
  } catch (error) {
    console.error('Error getting exchange rate:', error);
    throw error;
  }
};

export const saveExchangeRate = async (rate: number): Promise<void> => {
  try {
    const exchangeRateRef = doc(db, EXCHANGE_RATES_COLLECTION, 'current');
    await setDoc(exchangeRateRef, { 
      rate,
      updatedAt: serverTimestamp() 
    }, { merge: true });
  } catch (error) {
    console.error('Error saving exchange rate:', error);
    throw error;
  }
};
