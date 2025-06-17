// @ts-check
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Configuración de rutas para módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: path.join(process.cwd(), '.env') });

// Mostrar las variables de entorno cargadas (solo para depuración)
console.log('🔍 Variables de entorno cargadas:');
console.log('- FIREBASE_PROJECT_ID:', process.env.VITE_FIREBASE_PROJECT_ID);

// Leer el archivo CSV
async function testReadFile() {
  try {
    const inputFile = path.join(process.cwd(), 'financial-report.csv');
    console.log(`\n📂 Intentando leer archivo: ${inputFile}`);
    
    // Verificar si el archivo existe
    try {
      await fs.access(inputFile);
      console.log('✅ El archivo existe');
    } catch (error) {
      console.error('❌ El archivo no existe:', error.message);
      return;
    }
    
    // Leer el archivo
    const fileContent = await fs.readFile(inputFile, 'utf-8');
    console.log('✅ Archivo leído correctamente');
    console.log('\n📄 Contenido del archivo (primeras 5 líneas):');
    console.log(fileContent.split('\n').slice(0, 5).join('\n'));
    
  } catch (error) {
    console.error('❌ Error al leer el archivo:', error.message);
  }
}

// Ejecutar la prueba
testReadFile();
