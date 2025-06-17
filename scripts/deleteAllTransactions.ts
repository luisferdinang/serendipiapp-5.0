import * as admin from 'firebase-admin';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Configuración para __dirname en módulos ES
const __filename = new URL(import.meta.url).pathname;
const __dirname = path.dirname(__filename);

// Cargar credenciales desde el archivo serviceAccountKey.json
const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
console.log('Buscando archivo de credenciales en:', serviceAccountPath);

if (!require('fs').existsSync(serviceAccountPath)) {
  console.error('❌ Error: No se encontró el archivo serviceAccountKey.json en la ruta:', serviceAccountPath);
  console.log('Por favor, verifica que el archivo exista y tenga permisos de lectura.');
  process.exit(1);
}

// Inicializar Firebase Admin
let serviceAccount;
try {
  serviceAccount = JSON.parse(require('fs').readFileSync(serviceAccountPath, 'utf-8'));
  console.log('✅ Archivo de credenciales cargado correctamente');
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('✅ Firebase Admin inicializado correctamente');
} catch (error: any) {
  console.error('❌ Error al inicializar Firebase Admin:', error.message);
  process.exit(1);
}

const db = admin.firestore();

async function deleteAllTransactions() {
  try {
    console.log('🔍 Buscando todas las transacciones...');
    
    // Obtener referencia a la colección de transacciones
    const transactionsRef = db.collection('transactions');
    const snapshot = await transactionsRef.get();
    
    if (snapshot.empty) {
      console.log('ℹ️ No se encontraron transacciones para eliminar');
      return;
    }
    
    console.log(`🗑️ Se encontraron ${snapshot.size} transacciones para eliminar`);
    
    // Eliminar documentos en lotes para evitar exceder los límites
    const batchSize = 500;
    let deletedCount = 0;
    
    while (snapshot.docs.length > 0) {
      const batch = db.batch();
      const batchDocs = snapshot.docs.splice(0, batchSize);
      
      batchDocs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      deletedCount += batchDocs.length;
      console.log(`✅ Eliminadas ${deletedCount}/${snapshot.size + batchDocs.length} transacciones`);
    }
    
    console.log(`\n🎉 ¡Se eliminaron todas las transacciones (${deletedCount} en total)!`);
    
  } catch (error) {
    console.error('❌ Error al eliminar transacciones:', error);
    process.exit(1);
  } finally {
    // Cerrar la conexión
    await admin.app().delete();
    console.log('🔒 Conexión con Firebase cerrada');
  }
}

// Ejecutar la función principal
deleteAllTransactions()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
