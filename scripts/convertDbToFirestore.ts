import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Configuración
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Rutas de archivos
const inputFile = path.resolve(process.cwd(), 'db.json');
const outputFile = path.resolve(process.cwd(), 'firestore-import.json');

// Mapeo de tipos de transacción
const mapTransactionType = (oldType: string): 'INCOME' | 'EXPENSE' | 'ADJUSTMENT' => {
  switch (oldType) {
    case 'venta':
    case 'ingreso':
      return 'INCOME';
    case 'gasto':
      return 'EXPENSE';
    case 'ajuste':
      return 'ADJUSTMENT';
    default:
      return 'EXPENSE';
  }
};

// Mapeo de métodos de pago
const mapPaymentMethod = (method: string): string => {
  const methodMap: Record<string, string> = {
    'banco': 'BANCO_BS',
    'efectivo': 'EFECTIVO_BS',
    'usd': 'EFECTIVO_USD',
    'usdt': 'EFECTIVO_USDT',
    'pago móvil': 'PAGO_MOVIL_BS',
    'zelle': 'ZELLE',
    'transferencia': 'TRANSFERENCIA_BS',
    'paypal': 'PAYPAL',
    'binance': 'BINANCE'
  };
  
  return methodMap[method.toLowerCase()] || 'EFECTIVO_BS';
};

// Función principal
async function convertData() {
  try {
    console.log('📂 Leyendo archivo de entrada...');
    
    // Leer el archivo de entrada
    const rawData = fs.readFileSync(inputFile, 'utf-8');
    const transactions = JSON.parse(rawData);
    
    if (!Array.isArray(transactions)) {
      throw new Error('El archivo de entrada debe contener un array de transacciones');
    }
    
    console.log(`🔍 Procesando ${transactions.length} transacciones...`);
    
    // Convertir transacciones
    const convertedTransactions = transactions.map((tx, index) => {
      try {
        // Determinar el monto total
        const amount = tx.income > 0 ? tx.income : tx.expense;
        
        // Crear array de métodos de pago
        const paymentMethods = [];
        
        // Procesar métodos de pago del objeto payment
        if (tx.payment) {
          Object.entries(tx.payment).forEach(([method, amount]) => {
            const numericAmount = Number(amount) || 0;
            if (numericAmount > 0) {
              paymentMethods.push({
                method: mapPaymentMethod(method),
                amount: numericAmount
              });
            }
          });
        }
        
        // Si no hay métodos de pago, usar el monto total
        if (paymentMethods.length === 0 && amount) {
          paymentMethods.push({
            method: 'EFECTIVO_BS',
            amount: Math.abs(amount)
          });
        }
        
        // Crear transacción convertida
        return {
          id: tx.id || `tx-${Date.now()}-${index}`,
          amount: Math.abs(amount || 0),
          currency: 'BS',
          date: tx.date ? tx.date.split('T')[0] : new Date().toISOString().split('T')[0],
          description: tx.description || 'Sin descripción',
          paymentMethods,
          quantity: tx.quantity ? Number(tx.quantity) : 1,
          type: mapTransactionType(tx.type),
          category: tx.type === 'venta' ? 'venta' : 
                  tx.type === 'gasto' ? 'gasto' :
                  tx.type === 'ingreso' ? 'ingreso' : 
                  tx.type === 'ajuste' ? 'Ajuste de Saldo' : 'otros',
          userId: '8LAM1j7oH1Sq3xwnglSPQW9zxfw2', // Asegúrate de usar el ID de usuario correcto
          unitPrice: tx.unitPrice ? Number(tx.unitPrice) : amount || 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      } catch (error) {
        console.error(`❌ Error procesando transacción ${index + 1}:`, error);
        return null;
      }
    }).filter(Boolean); // Filtrar transacciones nulas
    
    // Guardar transacciones convertidas
    const outputData = {
      transactions: convertedTransactions
    };
    
    fs.writeFileSync(outputFile, JSON.stringify(outputData, null, 2), 'utf-8');
    
    console.log(`\n✅ Conversión completada exitosamente!`);
    console.log(`📊 Transacciones convertidas: ${convertedTransactions.length}`);
    console.log(`💾 Archivo guardado en: ${outputFile}`);
    
  } catch (error) {
    console.error('❌ Error durante la conversión:', error);
    process.exit(1);
  }
}

// Ejecutar la conversión
convertData();
