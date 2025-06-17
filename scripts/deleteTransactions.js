// @ts-check
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuración
const USER_ID = '8LAM1j7oH1Sq3xwnglSPQW9zxfw2'; // Tu ID de usuario
const FIREBASE_CONFIG = {
  // Tu configuración de Firebase
};

// Crear archivo temporal de configuración
const tempConfigPath = path.join(__dirname, 'temp-firebase-config.js');
fs.writeFileSync(tempConfigPath, `
  import { initializeApp } from 'firebase/app';
  import { getFirestore, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
  
  const firebaseConfig = ${JSON.stringify(FIREBASE_CONFIG, null, 2)};
  
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  
  async function deleteTransactions() {
    try {
      console.log('🔍 Buscando transacciones del usuario: ${USER_ID}');
      
      const transactionsRef = collection(db, 'transactions');
      const q = query(transactionsRef, where('userId', '==', '${USER_ID}'));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.log('ℹ️ No se encontraron transacciones para el usuario: ${USER_ID}');
        return;
      }
      
      console.log(`🗑️ Se encontraron ${querySnapshot.size} transacciones para eliminar`);
      
      const batch = writeBatch(db);
      const batchSize = 500;
      let deletedCount = 0;
      
      for (let i = 0; i < querySnapshot.docs.length; i += batchSize) {
        const batchDocs = querySnapshot.docs.slice(i, i + batchSize);
        batchDocs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        deletedCount += batchDocs.length;
        console.log(`✅ Eliminadas ${deletedCount}/${querySnapshot.size} transacciones`);
      }
      
      console.log(`\n🎉 ¡Se eliminaron todas las transacciones (${deletedCount} en total)!`);
      
    } catch (error) {
      console.error('❌ Error al eliminar transacciones:', error);
      process.exit(1);
    } finally {
      process.exit(0);
    }
  }
  
  deleteTransactions();
`);

// Instalar dependencias si no existen
console.log('🔍 Verificando dependencias...');
try {
  require.resolve('firebase');
} catch (e) {
  console.log('Instalando dependencias...');
  execSync('npm install firebase@10.0.0', { stdio: 'inherit' });
}

// Ejecutar el script
console.log('🚀 Iniciando eliminación de transacciones...');
require('esbuild-runner/register');
require(tempConfigPath);

// Limpiar archivo temporal al salir
process.on('exit', () => {
  try {
    fs.unlinkSync(tempConfigPath);
  } catch (e) {}
});
