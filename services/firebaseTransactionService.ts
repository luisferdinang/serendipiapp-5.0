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
  console.log('🔍 [getTransactions] Obteniendo todas las transacciones');
  
  // Verificar autenticación pero no filtrar por userId
  if (!userId) {
    console.error('❌ [getTransactions] Error: Usuario no autenticado');
    return [];
  }
  
  try {
    const transactionsRef = collection(db, TRANSACTIONS_COLLECTION);
    console.log('🔍 [getTransactions] Construyendo consulta para userId:', userId);
    
    // Consulta todas las transacciones ordenadas por fecha
    const q = query(
      transactionsRef,
      orderBy('date', 'desc')
    );
    
    console.log('🔍 [getTransactions] Ejecutando consulta...');
    const querySnapshot = await getDocs(q);
    
    console.log(`✅ [getTransactions] Consulta completada. Encontrados ${querySnapshot.docs.length} documentos`);
    
    if (querySnapshot.empty) {
      console.log('ℹ️ [getTransactions] No se encontraron transacciones para el usuario');
      return [];
    }
    
    const transactions = querySnapshot.docs.map(doc => {
      const data = doc.data();
      
        // Validar y formatear los datos
      const transaction: Transaction = {
        id: doc.id,
        userId: data.userId || userId, // Usar el userId del parámetro si no está en los datos
        description: data.description || 'Sin descripción',
        amount: typeof data.amount === 'number' ? data.amount : (parseFloat(data.amount) || 0),
        quantity: data.quantity || 1,
        unitPrice: data.unitPrice || 0,
        currency: data.currency || Currency.BS,
        type: data.type || TransactionType.EXPENSE,
        date: data.date || new Date().toISOString().split('T')[0],
        paymentMethods: Array.isArray(data.paymentMethods) 
          ? data.paymentMethods.map((pm: any) => ({
              method: pm.method || PaymentMethod.EFECTIVO_BS,
              amount: typeof pm.amount === 'number' ? pm.amount : (parseFloat(pm.amount) || 0)
            }))
          : [],
        category: data.category || '',
        notes: data.notes || '',
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date()
      };
      
      return transaction;
    });
    
    return transactions;
  } catch (error) {
    console.error('❌ [getTransactions] Error al cargar transacciones:', error);
    return [];
  }
  try {
    console.log('🔍 [getTransactions] Obteniendo transacciones para el usuario ID:', userId);
    
    if (!userId) {
      throw new Error('El ID de usuario es requerido');
    }
    
    const transactionsRef = collection(db, TRANSACTIONS_COLLECTION);
    
    console.log('🔍 [getTransactions] Construyendo consulta...');
    const q = query(
      transactionsRef,
      where('userId', '==', userId)
    );
    
    console.log('🔍 [getTransactions] Ejecutando consulta en Firestore...');
    const querySnapshot = await getDocs(q);
    console.log(`✅ [getTransactions] Consulta completada. Encontrados ${querySnapshot.docs.length} documentos`);
    
    if (querySnapshot.empty) {
      console.log('ℹ️ [getTransactions] No se encontraron transacciones para el usuario ID:', userId);
      return [];
    }
    
    // Procesar y ordenar los resultados en memoria
    const transactions = querySnapshot.docs.map(doc => {
      const data = doc.data();
      console.log('📄 [getTransactions] Procesando documento ID:', doc.id, 'Datos:', JSON.stringify(data, null, 2));
      
      // Validar datos requeridos
      if (!data.userId || data.userId !== userId) {
        console.warn(`⚠️ [getTransactions] Documento ${doc.id} no pertenece al usuario ${userId}`);
      }
      
      // Validar y formatear los datos
      const amount = typeof data.amount === 'number' ? data.amount : (parseFloat(data.amount) || 0);
      const quantity = (() => {
        if (data.quantity === undefined || data.quantity === null) return 1; // Valor por defecto
        if (typeof data.quantity === 'number') return data.quantity;
        if (typeof data.quantity === 'string') {
          const parsed = parseFloat(data.quantity);
          return isNaN(parsed) ? 1 : parsed; // 1 como valor por defecto si no se puede parsear
        }
        return 1; // Valor por defecto para cualquier otro caso
      })();
      
      // Asegurarse de que todos los campos requeridos estén presentes
      const transaction: Transaction = {
        id: doc.id,
        userId: data.userId || '', // Asegurar que userId esté presente
        description: data.description || 'Sin descripción',
        unitPrice: data.unitPrice || amount, // Usar unitPrice si existe, de lo contrario usar amount
        quantity: quantity,
        amount: amount,
        currency: (data.currency as Currency) || Currency.BS,
        type: (data.type as TransactionType) || TransactionType.EXPENSE,
        date: data.date || new Date().toISOString().split('T')[0],
        paymentMethods: Array.isArray(data.paymentMethods) 
          ? (data.paymentMethods as Array<{method: string, amount: number | string}>).map((pm) => ({
              method: (pm.method as PaymentMethod) || PaymentMethod.EFECTIVO_USD,
              amount: typeof pm.amount === 'number' ? pm.amount : (parseFloat(pm.amount as string) || 0)
            }))
          : [],
        category: data.category || '',
        notes: data.notes || '',
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date()
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
    console.error('❌ [getTransactions] Error al obtener transacciones:', error);
    // En lugar de lanzar el error, retornamos un array vacío para evitar romper la UI
    // La UI ya manejará el estado de error apropiadamente
    return [];
  }
};

interface TransactionInput {
  description: string;
  unitPrice: number;
  quantity: number;
  amount: number;
  currency: Currency;
  type: TransactionType;
  date: string;
  paymentMethods: PaymentDetail[];
  category?: string;
  notes?: string;
}

export const addTransaction = async (transactionData: TransactionInput, userId: string): Promise<string> => {
  console.log('➕ [addTransaction] Iniciando con userId:', userId);
  console.log('📝 Datos de la transacción:', JSON.stringify(transactionData, null, 2));
  
  if (!userId) {
    const errorMsg = 'Error: userId no proporcionado';
    console.error('❌', errorMsg);
    throw new Error(errorMsg);
  }

  try {
    // Validar campos requeridos
    if (!transactionData.description?.trim()) {
      throw new Error('La descripción es requerida');
    }
    
    const amount = Number(transactionData.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new Error('El monto debe ser un número mayor a cero');
    }
    
    if (!Object.values(Currency).includes(transactionData.currency as Currency)) {
      throw new Error(`Moneda no válida: ${transactionData.currency}`);
    }
    
    if (!Object.values(TransactionType).includes(transactionData.type as TransactionType)) {
      throw new Error(`Tipo de transacción no válido: ${transactionData.type}`);
    }

    // Preparar los datos para Firestore
    const transactionToSave = {
      description: transactionData.description.trim(),
      amount: amount,
      currency: transactionData.currency,
      type: transactionData.type,
      date: transactionData.date || new Date().toISOString().split('T')[0],
      paymentMethods: (transactionData.paymentMethods || []).map(pm => ({
        method: pm.method,
        amount: Number(pm.amount) || 0
      })),
      category: transactionData.category || '',
      notes: transactionData.notes || '',
      userId: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    console.log('📤 [addTransaction] Guardando transacción en Firestore...', {
      transactionData: transactionToSave,
      userId
    });
    
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
  console.log('🔄 [updateTransaction] Actualizando transacción ID:', id);
  
  if (!id) {
    throw new Error('El ID de la transacción es requerido');
  }
  
  try {
    const transactionRef = doc(db, TRANSACTIONS_COLLECTION, id);
    await updateDoc(transactionRef, {
      ...transaction,
      updatedAt: serverTimestamp()
    });
    console.log('✅ [updateTransaction] Transacción actualizada correctamente');
  } catch (error) {
    console.error('❌ [updateTransaction] Error al actualizar transacción:', error);
    throw error;
  }
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
  console.log('🗑️ [deleteTransaction] Eliminando transacción ID:', id);
  
  if (!id) {
    throw new Error('El ID de la transacción es requerido');
  }
  
  try {
    await deleteDoc(doc(db, TRANSACTIONS_COLLECTION, id));
    console.log('✅ [deleteTransaction] Transacción eliminada correctamente');
  } catch (error) {
    console.error('❌ [deleteTransaction] Error al eliminar transacción:', error);
    throw error;
  }
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
