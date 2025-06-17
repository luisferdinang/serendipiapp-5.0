import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuración de rutas
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Rutas de archivos
const inputFile = path.join(__dirname, 'db.json');
const outputFile = path.join(__dirname, 'transactions-ready-to-import.json');
const reportFile = path.join(__dirname, 'import-report.txt');

// Mapeo de tipos de transacción
const typeMap = {
  'venta': 'income',
  'gasto': 'expense',
  'ajuste': 'adjustment',
  'ingreso': 'income',
  'egreso': 'expense',
  'income': 'income',
  'expense': 'expense',
  'adjustment': 'adjustment'
};

// Mapeo de métodos de pago
const paymentMethodMap = {
  'banco': 'PAGO_MOVIL_BS',
  'efectivo': 'EFECTIVO_BS',
  'efectivo_bs': 'EFECTIVO_BS',
  'efectivo_usd': 'EFECTIVO_USD',
  'efectivo_us': 'EFECTIVO_USD',
  'usd': 'EFECTIVO_USD',
  'usdt': 'USDT',
  'crypto': 'USDT',
  'cripto': 'USDT',
  'pago_movil': 'PAGO_MOVIL_BS',
  'transferencia': 'PAGO_MOVIL_BS',
  'zelle': 'ZELLE',
  'paypal': 'PAYPAL',
  'binance': 'BINANCE',
  'transfer': 'TRANSFERENCIA_BS',
  'punto_venta': 'PUNTO_VENTA_BS'
};

// Función para normalizar métodos de pago
function normalizePaymentMethod(method) {
  if (!method) return 'EFECTIVO_BS';
  
  const normalized = String(method).toLowerCase().trim();
  return paymentMethodMap[normalized] || 'EFECTIVO_BS';
}

// Función para determinar la moneda basada en el método de pago
function getCurrency(method) {
  const upperMethod = String(method).toUpperCase();
  return (upperMethod.endsWith('_USD') || 
          upperMethod === 'USDT' || 
          upperMethod === 'ZELLE' || 
          upperMethod === 'PAYPAL' ||
          upperMethod === 'BINANCE') ? 'USD' : 'BS';
}

// Función para formatear moneda
function formatCurrency(amount, currency) {
  return new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'es-VE', {
    style: 'currency',
    currency: currency === 'USD' ? 'USD' : 'VES',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

// Función principal
async function main() {
  try {
    console.log('🔍 Leyendo archivo de entrada...');
    const data = await fs.readFile(inputFile, 'utf8');
    const transactions = JSON.parse(data);
    
    if (!Array.isArray(transactions)) {
      throw new Error('El archivo no contiene un array de transacciones');
    }
    
    console.log(`🔄 Procesando ${transactions.length} transacciones...`);
    
    const cleanedTransactions = [];
    const errors = [];
    const stats = {
      total: transactions.length,
      success: 0,
      errors: 0,
      byType: {},
      byCurrency: { BS: 0, USD: 0 },
      byPaymentMethod: {},
      totals: { BS: 0, USD: 0 }
    };
    
    for (const [index, tx] of transactions.entries()) {
      try {
        // Mostrar progreso
        process.stdout.write(`\r📊 Progreso: ${index + 1}/${transactions.length} (${Math.round(((index + 1) / transactions.length) * 100)}%)`);
        
        // Validar transacción básica
        if (!tx.id) tx.id = `generated-${Date.now()}-${index}`;
        if (!tx.date) tx.date = new Date().toISOString().split('T')[0];
        
        // Determinar tipo de transacción
        const txType = String(tx.type || '').toLowerCase();
        const type = typeMap[txType] || 'expense';
        
        // Calcular montos
        let amount = 0;
        if (tx.income > 0) amount = tx.income;
        else if (tx.expense > 0) amount = tx.expense;
        else if (tx.amount) amount = tx.amount;
        else if (tx.unitPrice !== undefined && tx.quantity !== undefined) amount = tx.unitPrice * tx.quantity;
        
        // Procesar métodos de pago
        const paymentMethods = [];
        
        // Caso 1: Ya tiene paymentMethods (formato nuevo)
        if (Array.isArray(tx.paymentMethods)) {
          tx.paymentMethods.forEach(pm => {
            if (pm && pm.method) {
              const method = normalizePaymentMethod(pm.method);
              const amount = Number(pm.amount) || 0;
              if (amount > 0) {
                paymentMethods.push({ method, amount });
              }
            }
          });
        } 
        // Caso 2: Tiene payment (formato antiguo)
        else if (tx.payment && typeof tx.payment === 'object') {
          Object.entries(tx.payment).forEach(([key, value]) => {
            const paymentAmount = Number(value) || 0;
            if (paymentAmount > 0) {
              const method = normalizePaymentMethod(key);
              paymentMethods.push({ method, amount: paymentAmount });
            }
          });
        }
        
        // Si no hay métodos de pago pero hay un monto, crear uno por defecto
        if (paymentMethods.length === 0 && amount > 0) {
          const defaultMethod = amount > 1000 ? 'PAGO_MOVIL_BS' : 'EFECTIVO_BS';
          paymentMethods.push({ method: defaultMethod, amount });
        }
        
        // Determinar moneda
        const currency = paymentMethods.length > 0 
          ? getCurrency(paymentMethods[0].method)
          : 'BS';
        
        // Crear transacción limpia
        const cleanedTx = {
          id: tx.id,
          date: tx.date,
          type,
          description: tx.description || 'Sin descripción',
          quantity: tx.quantity || 1,
          unitPrice: tx.unitPrice || amount,
          amount,
          currency,
          paymentMethods,
          category: tx.category || '',
          notes: tx.notes || ''
        };
        
        // Actualizar estadísticas
        stats.success++;
        stats.byType[type] = (stats.byType[type] || 0) + 1;
        stats.byCurrency[currency] = (stats.byCurrency[currency] || 0) + 1;
        
        paymentMethods.forEach(pm => {
          stats.byPaymentMethod[pm.method] = (stats.byPaymentMethod[pm.method] || 0) + 1;
        });
        
        // Actualizar totales por moneda
        if (type === 'income') {
          stats.totals[currency] = (stats.totals[currency] || 0) + amount;
        } else if (type === 'expense') {
          stats.totals[currency] = (stats.totals[currency] || 0) - amount;
        }
        
        cleanedTransactions.push(cleanedTx);
        
      } catch (error) {
        errors.push({
          id: tx.id,
          description: tx.description,
          error: error.message,
          originalData: tx
        });
        stats.errors++;
      }
    }
    
    // Ordenar transacciones por fecha
    cleanedTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Guardar transacciones limpias
    await fs.writeFile(
      outputFile,
      JSON.stringify(cleanedTransactions, null, 2),
      'utf8'
    );
    
    // Generar reporte
    const report = [
      '=== REPORTE DE LIMPIEZA DE DATOS ===',
      `Fecha: ${new Date().toISOString()}`,
      `Total de transacciones procesadas: ${stats.total}`,
      `  - Correctas: ${stats.success}`,
      `  - Con errores: ${stats.errors}`,
      '',
      '=== TOTALES POR MONEDA ===',
      `  - BS: ${formatCurrency(stats.totals.BS || 0, 'BS')}`,
      `  - USD: ${formatCurrency(stats.totals.USD || 0, 'USD')}`,
      '',
      '=== DISTRIBUCIÓN POR TIPO ===',
      ...Object.entries(stats.byType).map(([type, count]) => `  - ${type}: ${count} transacciones`),
      '',
      '=== DISTRIBUCIÓN POR MONEDA ===',
      ...Object.entries(stats.byCurrency).map(([currency, count]) => `  - ${currency}: ${count} transacciones`),
      '',
      '=== MÉTODOS DE PAGO UTILIZADOS ===',
      ...Object.entries(stats.byPaymentMethod).map(([method, count]) => `  - ${method}: ${count} transacciones`),
      '',
      errors.length > 0 ? '=== ERRORES ENCONTRADOS ===' : '✅ No se encontraron errores',
      ...errors.map((err, i) => `\nError #${i + 1}:\n  ID: ${err.id}\n  Descripción: ${err.description}\n  Error: ${err.error}`)
    ].join('\n');
    
    await fs.writeFile(reportFile, report, 'utf8');
    
    console.log('\n\n✅ ¡Proceso completado con éxito!');
    console.log(`   - Transacciones procesadas: ${stats.success}`);
    console.log(`   - Errores: ${stats.errors}`);
    console.log(`\n📊 Estadísticas guardadas en: ${reportFile}`);
    console.log(`📦 Datos limpios guardados en: ${outputFile}`);
    
    if (errors.length > 0) {
      console.log('\n⚠️  Se encontraron algunos errores durante el proceso.');
      console.log('   Por favor revisa el archivo de reporte para más detalles.');
    }
    
  } catch (error) {
    console.error('\n❌ Error durante el proceso:', error.message);
    process.exit(1);
  }
}

// Ejecutar
main().catch(console.error);
