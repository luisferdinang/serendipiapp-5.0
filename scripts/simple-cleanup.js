const fs = require('fs');
const path = require('path');

// Rutas de archivos
const inputPath = path.join(__dirname, 'db.json');
const outputPath = path.join(__dirname, 'cleaned-transactions.json');

// Leer el archivo de entrada
console.log('Leyendo archivo de entrada...');
const rawData = fs.readFileSync(inputPath, 'utf-8');
const transactions = JSON.parse(rawData);

if (!Array.isArray(transactions)) {
  console.error('❌ El archivo de entrada no contiene un array de transacciones');
  process.exit(1);
}

console.log(`Procesando ${transactions.length} transacciones...`);
const cleanedTransactions = [];
const errors = [];

// Mapeo de tipos de transacción
const typeMap = {
  'venta': 'income',
  'gasto': 'expense',
  'ajuste': 'adjustment',
  'ingreso': 'income',
  'egreso': 'expense'
};

// Mapeo de métodos de pago
const paymentMethodMap = {
  'banco': 'PAGO_MOVIL_BS',
  'efectivo': 'EFECTIVO_BS',
  'usd': 'EFECTIVO_USD',
  'usdt': 'USDT'
};

transactions.forEach((tx, index) => {
  try {
    // Mostrar progreso
    process.stdout.write(`\rProcesando... ${Math.floor(((index + 1) / transactions.length) * 100)}%`);
    
    // Determinar el tipo de transacción
    const typeKey = (tx.type || '').toLowerCase();
    const type = typeMap[typeKey] || 'expense';
    
    // Calcular el monto total
    let amount = 0;
    if (tx.income > 0) {
      amount = tx.income;
    } else if (tx.expense > 0) {
      amount = tx.expense;
    } else if (tx.unitPrice !== null && tx.quantity !== null) {
      amount = tx.unitPrice * tx.quantity;
    }
    
    // Procesar métodos de pago
    const paymentMethods = [];
    
    // Procesar pagos directos
    if (tx.payment && typeof tx.payment === 'object') {
      Object.entries(tx.payment).forEach(([key, value]) => {
        const paymentAmount = Number(value) || 0;
        if (paymentAmount > 0) {
          const normalizedKey = key.toLowerCase().trim();
          const method = paymentMethodMap[normalizedKey] || 'EFECTIVO_BS';
          paymentMethods.push({
            method,
            amount: paymentAmount
          });
        }
      });
    }
    
    // Si no hay métodos de pago pero hay un monto, crear uno por defecto
    if (paymentMethods.length === 0 && amount > 0) {
      paymentMethods.push({
        method: 'EFECTIVO_BS',
        amount: amount
      });
    }
    
    // Determinar la moneda basada en los métodos de pago
    const currency = paymentMethods.length > 0 && 
                    (paymentMethods[0].method.endsWith('_USD') || 
                     paymentMethods[0].method === 'USDT') ? 'USD' : 'BS';
    
    // Crear transacción limpia
    const cleanedTx = {
      id: tx.id || `migrated-${Date.now()}-${index}`,
      date: tx.date ? new Date(tx.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      type,
      description: tx.description || 'Transacción sin descripción',
      quantity: tx.quantity || 1,
      unitPrice: tx.unitPrice || amount,
      amount,
      currency,
      paymentMethods
    };
    
    cleanedTransactions.push(cleanedTx);
    
  } catch (error) {
    console.error(`\nError procesando transacción ${tx.id}:`, error.message);
    errors.push({
      id: tx.id,
      description: tx.description,
      error: error.message
    });
  }
});

// Guardar resultados
console.log('\nGuardando resultados...');
fs.writeFileSync(outputPath, JSON.stringify(cleanedTransactions, null, 2), 'utf-8');

// Guardar errores si los hay
if (errors.length > 0) {
  const errorsPath = path.join(__dirname, 'cleaning-errors.json');
  fs.writeFileSync(errorsPath, JSON.stringify(errors, null, 2), 'utf-8');
  console.warn(`\n⚠️  Se encontraron ${errors.length} errores. Ver ${errorsPath}`);
}

console.log('\n✅ Proceso completado exitosamente!');
console.log(`   - Transacciones procesadas: ${cleanedTransactions.length}`);
console.log(`   - Errores: ${errors.length}`);
console.log(`   - Archivo de salida: ${outputPath}`);
