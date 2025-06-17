const fs = require('fs');
const path = require('path');

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
  'efectivo_bs': 'EFECTIVO_BS',
  'efectivo': 'EFECTIVO_BS',
  'efectivo_usd': 'EFECTIVO_USD',
  'efectivo_us': 'EFECTIVO_USD',
  'usd': 'EFECTIVO_USD',
  'usdt': 'USDT',
  'crypto': 'USDT',
  'cripto': 'USDT'
};

// Función para determinar la moneda basada en el método de pago
function getCurrencyFromPaymentMethod(method) {
  return method.endsWith('_USD') || method === 'USDT' ? 'USD' : 'BS';
}

// Función para limpiar una transacción
function cleanTransaction(tx) {
  try {
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
      const defaultMethod = 'EFECTIVO_BS';
      paymentMethods.push({
        method: defaultMethod,
        amount: amount
      });
    }

    // Determinar la moneda basada en los métodos de pago o usar BS por defecto
    const currency = paymentMethods.length > 0 
      ? getCurrencyFromPaymentMethod(paymentMethods[0].method)
      : 'BS';

    // Extraer categoría de la descripción (si existe)
    let category = '';
    let description = tx.description || '';
    const categoryMatch = description.match(/\[(.*?)\]/);
    if (categoryMatch) {
      category = categoryMatch[1];
      description = description.replace(/\[.*?\]\s*/, '').trim();
    }

    // Formatear fecha
    let formattedDate = '';
    try {
      formattedDate = new Date(tx.date).toISOString().split('T')[0];
    } catch (e) {
      console.warn(`Fecha inválida para transacción ${tx.id}, usando fecha actual`);
      formattedDate = new Date().toISOString().split('T')[0];
    }

    return {
      id: tx.id || Date.now().toString(),
      date: formattedDate,
      type,
      description,
      quantity: tx.quantity || 1,
      unitPrice: tx.unitPrice || amount,
      amount,
      currency,
      paymentMethods,
      ...(category && { category }),
      ...(tx.notes && { notes: tx.notes })
    };
  } catch (error) {
    console.error('Error procesando transacción:', tx.id, error);
    return null;
  }
}

// Función principal
function main() {
  try {
    // Rutas de archivos
    const inputPath = path.join(__dirname, 'db.json');
    const outputPath = path.join(__dirname, 'cleaned-transactions.json');
    
    console.log('Leyendo archivo de entrada...');
    const rawData = fs.readFileSync(inputPath, 'utf-8');
    const transactions = JSON.parse(rawData);
    
    if (!Array.isArray(transactions)) {
      throw new Error('El archivo de entrada no contiene un array de transacciones');
    }
    
    console.log(`Procesando ${transactions.length} transacciones...`);
    const cleanedTransactions = [];
    const errors = [];
    
    transactions.forEach((tx, index) => {
      process.stdout.write(`\rProcesando... ${Math.floor((index / transactions.length) * 100)}%`);
      const cleaned = cleanTransaction(tx);
      if (cleaned) {
        cleanedTransactions.push(cleaned);
      } else {
        errors.push({
          id: tx.id,
          description: tx.description,
          error: 'No se pudo procesar la transacción'
        });
      }
    });
    
    console.log('\nGuardando resultados...');
    
    // Guardar transacciones limpias
    fs.writeFileSync(
      outputPath,
      JSON.stringify(cleanedTransactions, null, 2),
      'utf-8'
    );
    
    // Guardar errores si los hay
    if (errors.length > 0) {
      const errorsPath = path.join(__dirname, 'cleaning-errors.json');
      fs.writeFileSync(
        errorsPath,
        JSON.stringify(errors, null, 2),
        'utf-8'
      );
      console.warn(`\n⚠️  Se encontraron ${errors.length} errores. Ver ${errorsPath}`);
    }
    
    console.log('\n✅ Proceso completado exitosamente!');
    console.log(`   - Transacciones procesadas: ${cleanedTransactions.length}`);
    console.log(`   - Errores: ${errors.length}`);
    console.log(`   - Archivo de salida: ${outputPath}`);
    
  } catch (error) {
    console.error('❌ Error en el proceso:', error.message);
    process.exit(1);
  }
}

// Ejecutar el script
main();
