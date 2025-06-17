import { collection, getDocs, query, where, writeBatch, getFirestore } from 'firebase/firestore';
import { auth, db } from '../firebase';

/**
 * Elimina todas las transacciones del usuario actual
 */
export async function deleteAllUserTransactions(userId: string) {
  try {
    console.log('🔍 Buscando transacciones del usuario:', userId);
    
    // Obtener referencia a la colección de transacciones
    const transactionsRef = collection(db, 'transactions');
    const q = query(transactionsRef, where('userId', '==', userId));
    
    // Obtener todas las transacciones del usuario
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log('ℹ️ No se encontraron transacciones para el usuario:', userId);
      return { success: true, deletedCount: 0 };
    }
    
    console.log(`🗑️ Se encontraron ${querySnapshot.size} transacciones para eliminar`);
    
    // Crear un lote (batch) para eliminar documentos
    const batch = writeBatch(db);
    const batchSize = 500; // Tamaño máximo del lote
    let deletedCount = 0;
    
    // Procesar en lotes para evitar exceder los límites
    for (let i = 0; i < querySnapshot.docs.length; i += batchSize) {
      const batchDocs = querySnapshot.docs.slice(i, i + batchSize);
      
      // Agregar operaciones de eliminación al lote
      batchDocs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // Ejecutar el lote
      await batch.commit();
      deletedCount += batchDocs.length;
      console.log(`✅ Eliminadas ${deletedCount}/${querySnapshot.size} transacciones`);
    }
    
    console.log(`\n🎉 ¡Se eliminaron todas las transacciones (${deletedCount} en total)!`);
    return { success: true, deletedCount };
    
  } catch (error) {
    console.error('❌ Error al eliminar transacciones:', error);
    throw error;
  }
}

// Si se ejecuta directamente desde la línea de comandos
if (require.main === module) {
  const userId = process.argv[2];
  if (!userId) {
    console.error('❌ Error: Se requiere el ID de usuario como argumento');
    console.log('Uso: npx ts-node deleteTransactionsUtil.ts <userId>');
    process.exit(1);
  }
  
  deleteAllUserTransactions(userId)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
