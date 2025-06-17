import * as fs from 'fs';
import * as path from 'path';

// Definir tipos para los datos de entrada
interface MigratedTransaction {
  id: string;
  date: string;
  type: string;
  description: string;
  quantity: number | null;
  unitPrice: number | null;
  income: number;
  expense: number;
  payment: {
    banco?: number;
    efectivo?: number;
    usd?: number;
    usdt?: number;
    [key: string]: any;
  };
  [key: string]: any;
}

// Definir tipos para los datos de salida
interface CleanTransaction {
  id: string;
  date: string;
  type: 'income' | 'expense' | 'adjustment';
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  currency: 'BS' | 'USD';
  paymentMethods: Array<{
    method: string;
    amount: number;
  }>;
  category?: string;
  notes?: string;
}

// Mapeo de tipos de transacción
const typeMap: Record<string, 'income' | 'expense' | 'adjustment'> = {
  'venta': 'income',
  'gasto': 'expense',
  'ajuste': 'adjustment',
  'ingreso': 'income',
  'egreso': 'expense'
};

// Mapeo de métodos de pago
const paymentMethodMap: Record<string, string> = {
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
const getCurrencyFromPaymentMethod = (method: string): 'BS' | 'USD' => {
  return method.endsWith('_USD') || method === 'USDT' ? 'USD' : 'BS';
};

// Función para limpiar una transacción
const cleanTransaction = (tx: MigratedTransaction): CleanTransaction | null => {
  try {
    // Determinar el tipo de transacción
    const typeKey = tx.type.toLowerCase();
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
    const paymentMethods: Array<{ method: string; amount: number }> = [];
    
    // Procesar pagos directos
    if (tx.payment) {
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
      const defaultMethod = amount > 0 ? 'EFECTIVO_BS' : 'EFECTIVO_BS';
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
    let description = tx.description;
    const categoryMatch = tx.description.match(/\[(.*?)\]/);
    if (categoryMatch) {
      category = categoryMatch[1];
      description = tx.description.replace(/\[.*?\]\s*/, '').trim();
    }

    return {
      id: tx.id || Date.now().toString(),
      date: new Date(tx.date).toISOString().split('T')[0], // Formato YYYY-MM-DD
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
};

// Función principal
const main = () => {
  try {
    // Rutas de archivos
    const inputPath = path.join(__dirname, 'db.json');
    const outputPath = path.join(__dirname, 'cleaned-transactions.json');
    
    console.log('Leyendo archivo de entrada...');
    const rawData = fs.readFileSync(inputPath, 'utf-8');
    const transactions: MigratedTransaction[] = JSON.parse(rawData);
    
    console.log(`Procesando ${transactions.length} transacciones...`);
    const cleanedTransactions: CleanTransaction[] = [];
    const errors: any[] = [];
    
    for (const tx of transactions) {
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
    }
    
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
    
    console.log(`\n✅ Proceso completado exitosamente!`);
    console.log(`   - Transacciones procesadas: ${cleanedTransactions.length}`);
    console.log(`   - Errores: ${errors.length}`);
    console.log(`   - Archivo de salida: ${outputPath}`);
    
  } catch (error) {
    console.error('❌ Error en el proceso:', error);
    process.exit(1);
  }
};

// Ejecutar el script
main();
