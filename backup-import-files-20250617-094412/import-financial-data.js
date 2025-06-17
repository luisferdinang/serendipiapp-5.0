// @ts-check
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, writeBatch } from 'firebase/firestore';
import dotenv from 'dotenv';

// Configuración de rutas para módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: path.join(process.cwd(), '.env') });

// Mostrar las variables de entorno cargadas (solo para depuración)
console.log('🔍 Variables de entorno cargadas:');
console.log('- FIREBASE_PROJECT_ID:', process.env.VITE_FIREBASE_PROJECT_ID);

// Configuración de Firebase desde variables de entorno
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Verificar que todas las variables de entorno estén definidas
const envVars = Object.entries(firebaseConfig);
const missingVars = envVars.filter(([_, value]) => !value).map(([key]) => key);

if (missingVars.length > 0) {
  console.error('❌ Error: Faltan variables de entorno de Firebase:');
  missingVars.forEach(v => console.error(`  - ${v}`));
  console.log('\nAsegúrate de tener un archivo .env con las credenciales de Firebase.');
  process.exit(1);
}

// Inicializar Firebase
console.log('\n🚀 Inicializando Firebase...');
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Parsea una fecha en formato DD/MM/YYYY a objeto Date
 */
function parseDate(dateStr) {
  if (!dateStr) return new Date();
  const [day, month, year] = dateStr.split('/').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Parsea un monto de texto a número
 */
function parseAmount(amountStr) {
  if (!amountStr) return 0;
  // Remover caracteres no numéricos excepto punto decimal y signo negativo
  const numberStr = amountStr.replace(/[^\d.-]/g, '');
  return parseFloat(numberStr) || 0;
}

/**
 * Obtiene la categoría basada en el tipo y descripción
 */
function getCategory(type, description) {
  const lowerDesc = (description || '').toLowerCase();
  const lowerType = (type || '').toLowerCase();
  
  if (lowerType.includes('ajuste')) return 'Ajuste';
  if (lowerType.includes('venta')) {
    if (lowerDesc.includes('impresion') || lowerDesc.includes('impresión')) return 'Impresiones';
    if (lowerDesc.includes('foto')) return 'Fotografías';
    return 'Ventas';
  }
  if (lowerType.includes('gasto')) return 'Gastos';
  
  return 'Otros';
}

/**
 * Procesa una fila del CSV y la convierte en una transacción
 */
function processTransaction(row) {
  const [
    fecha, tipo, descripcion, 
    cantidad, precioUnitario, 
    ingreso, gasto, 
    boo, efec, 
    usd, usdt
  ] = row;

  // Determinar monto y moneda
  let amount = 0;
  let currency = 'BOB';
  let paymentMethod = 'efectivo';
  
  if (boo) {
    amount = parseAmount(boo);
    paymentMethod = 'banco';
  } else if (efec) {
    amount = parseAmount(efec);
  } else if (usd) {
    amount = parseAmount(usd);
    currency = 'USD';
  } else if (usdt) {
    amount = parseAmount(usdt);
    currency = 'USDT';
  } else if (ingreso) {
    amount = parseAmount(ingreso);
  } else if (gasto) {
    amount = -Math.abs(parseAmount(gasto));
  }

  // Si es un gasto, el monto debe ser negativo
  if (tipo && tipo.toLowerCase() === 'gasto' && amount > 0) {
    amount = -amount;
  }

  return {
    date: parseDate(fecha),
    type: (tipo || 'otro').toLowerCase(),
    description: (descripcion || '').trim(),
    amount,
    currency,
    paymentMethod,
    category: getCategory(tipo, descripcion),
    quantity: cantidad ? parseFloat(cantidad) : null,
    unitPrice: precioUnitario ? parseFloat(precioUnitario) : null,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

// Función principal
async function main() {
  try {
    // Rutas de archivos
    const inputFile = path.join(process.cwd(), 'financial-report.csv');
    const backupFile = path.join(process.cwd(), `transactions-backup-${Date.now()}.json`);
    
    console.log(`\n📂 Leyendo archivo: ${inputFile}`);
    
    // Leer el archivo CSV
    const fileContent = await fs.readFile(inputFile, 'utf-8');
    
    // Parsear el CSV
    const rows = fileContent
      .split('\n')
      .filter(line => line.trim() !== '')
      .map(row => row.split(',').map(cell => cell.trim()));
    
    if (rows.length < 2) {
      throw new Error('El archivo CSV está vacío o no tiene el formato correcto');
    }
    
    // Obtener encabezados y datos
    const headers = rows[0];
    const dataRows = rows.slice(1);
    
    console.log(`\n📊 Se encontraron ${dataRows.length} transacciones en el archivo`);
    console.log('\n🔍 Muestra de datos (primeras 3 filas):');
    console.table(dataRows.slice(0, 3));
    
    // Procesar transacciones
    console.log('\n🔄 Procesando transacciones...');
    const transactions = dataRows.map(processTransaction);
    
    console.log('\n✅ Transacciones procesadas correctamente');
    console.log('📋 Resumen de transacciones a importar:');
    console.table(transactions.slice(0, 3)); // Mostrar las primeras 3 transacciones
    
    // Confirmar antes de importar
    console.log(`\n⚠️  Se importarán ${transactions.length} transacciones a Firestore.`);
    console.log('¿Deseas continuar? (s/n)');
    
    // Esperar confirmación del usuario
    process.stdin.setRawMode(true);
    process.stdin.resume();
    
    const onData = (data) => {
      const input = data.toString().trim().toLowerCase();
      if (input === 's') {
        process.stdin.removeListener('data', onData);
        importToFirestore(transactions, backupFile);
      } else {
        console.log('\n❌ Importación cancelada por el usuario');
        process.exit(0);
      }
    };
    
    process.stdin.on('data', onData);
    
  } catch (error) {
    console.error('\n❌ Error en el proceso de importación:');
    console.error(error);
    process.exit(1);
  }
}

/**
 * Importa las transacciones a Firestore
 */
async function importToFirestore(transactions, backupFile) {
  try {
    console.log('\n🚀 Iniciando importación a Firestore...');
    
    // Crear un lote para importar todas las transacciones en una sola operación atómica
    const batch = writeBatch(db);
    const collectionRef = collection(db, 'transactions');
    
    // Agregar cada transacción al lote
    transactions.forEach((tx, index) => {
      const docRef = doc(collectionRef);
      batch.set(docRef, tx);
      
      // Mostrar progreso cada 10 transacciones
      if ((index + 1) % 10 === 0) {
        console.log(`🔄 Procesando transacción ${index + 1}/${transactions.length}...`);
      }
    });
    
    // Guardar respaldo local
    await fs.writeFile(backupFile, JSON.stringify(transactions, null, 2));
    
    // Confirmar antes de hacer commit
    console.log(`\n⚠️  Se importarán ${transactions.length} transacciones.`);
    console.log('¿Confirmar la importación? (s/n)');
    
    const onConfirm = async (data) => {
      const input = data.toString().trim().toLowerCase();
      if (input === 's') {
        process.stdin.removeListener('data', onConfirm);
        
        console.log('\n⏳ Realizando commit del lote...');
        await batch.commit();
        
        console.log('\n🎉 ¡Importación completada con éxito!');
        console.log(`   - Transacciones importadas: ${transactions.length}`);
        console.log(`   - Respaldo guardado en: ${backupFile}`);
        console.log('\n💡 Puedes verificar los datos en la consola de Firebase: https://console.firebase.google.com/');
        process.exit(0);
      } else {
        console.log('\n❌ Importación cancelada. Los cambios no se han guardado.');
        process.exit(0);
      }
    };
    
    process.stdin.on('data', onConfirm);
    
  } catch (error) {
    console.error('\n❌ Error al importar a Firestore:');
    console.error(error);
    process.exit(1);
  }
}

// Ejecutar la función principal
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
