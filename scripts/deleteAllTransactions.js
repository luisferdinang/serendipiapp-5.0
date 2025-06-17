import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuración
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Rutas de archivos
const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json');

// Leer credenciales
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));

// Inicializar Firebase
const app = initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore(app);

async function deleteAllTransactions() {
  try {
    console.log('🚀 Iniciando eliminación de transacciones...');
    
    // Obtener todas las transacciones
    const transactionsRef = db.collection('transactions');
    const snapshot = await transactionsRef.get();
    
    if (snapshot.empty) {
      console.log('✅ No hay transacciones para eliminar');
      return;
    }
    
    console.log(`🔍 Se encontraron ${snapshot.size} transacciones para eliminar`);
    
    // Eliminar en lotes
    const batchSize = 500;
    let deletedCount = 0;
    let batch = db.batch();
    
    snapshot.docs.forEach((doc, index) => {
      batch.delete(doc.ref);
      deletedCount++;
      
      // Ejecutar lote cada batchSize documentos
      if (deletedCount % batchSize === 0) {
        console.log(`🗑️ Eliminando lote de ${batchSize} transacciones...`);
        await batch.commit();
        batch = db.batch(); // Nuevo lote
      }
    });
    
    // Ejecutar el último lote si es necesario
    if (deletedCount % batchSize !== 0) {
      console.log(`🗑️ Eliminando último lote de ${deletedCount % batchSize} transacciones...`);
      await batch.commit();
    }
    
    console.log(`\n✅ Se eliminaron ${deletedCount} transacciones exitosamente`);
    
  } catch (error) {
    console.error('❌ Error al eliminar transacciones:', error);
    throw error;
  } finally {
    // Cerrar la conexión
    await app.delete();
  }
}

// Ejecutar la función
deleteAllTransactions()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
