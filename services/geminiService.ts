import { GoogleGenerativeAI } from '@google/generative-ai';
import { Transaction, TransactionType } from '../types';

type AnalysisType = 'summary' | 'insights' | 'recommendations' | 'spending' | 'custom';

// La clave de API se inyecta a través de Vite
const API_KEY = (import.meta.env.VITE_GEMINI_API_KEY || '') as string;
const genAI = new GoogleGenerativeAI(API_KEY);

interface FinancialAnalysis {
  summary: string;
  insights: string[];
  recommendations: string[];
  spendingByCategory: Record<string, number>;
  monthlyTrend: {
    month: string;
    income: number;
    expense: number;
  }[];
}

const getAnalysisPrompt = (type: AnalysisType, transactions: Transaction[], customPrompt?: string): string => {
  const transactionSummary = transactions
    .slice(0, 20) // Limitar a las primeras 20 transacciones para no exceder el límite de tokens
    .map(t => `- ${t.date}: ${t.description} (${t.type}): $${t.amount}${t.category ? ` [${t.category}]` : ''}`)
    .join('\n');

  const baseContext = `Analiza las siguientes transacciones financieras y proporciona un análisis detallado.\n\n` +
    `Resumen de transacciones (últimas 20):\n${transactionSummary}\n\n`;

  switch (type) {
    case 'summary':
      return baseContext + 'Proporciona un resumen general de la situación financiera, incluyendo ingresos, gastos y saldo actual.';
    case 'insights':
      return baseContext + 'Identifica patrones, tendencias y hallazgos interesantes en estos datos financieros.';
    case 'recommendations':
      return baseContext + 'Sugiere recomendaciones prácticas para mejorar la situación financiera basadas en estos datos.';
    case 'spending':
      return baseContext + 'Analiza los hábitos de gasto, categorías principales y oportunidades de ahorro.';
    case 'custom':
      return baseContext + (customPrompt || 'Analiza estos datos financieros.');
    default:
      return baseContext + 'Analiza estos datos financieros.';
  }
};

export const analyzeTransactions = async (
  transactions: Transaction[], 
  type: AnalysisType = 'summary',
  customPrompt?: string
): Promise<FinancialAnalysis> => {
  // Respuesta por defecto en caso de error
  const defaultResponse: FinancialAnalysis = {
    summary: 'No se pudo generar el análisis. Por favor, inténtalo de nuevo.',
    insights: [],
    recommendations: [],
    spendingByCategory: {},
    monthlyTrend: []
  };

  if (!API_KEY) {
    console.error('Clave de API de Gemini no configurada');
    return defaultResponse;
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  // Procesar datos para análisis
  const expenses = transactions.filter(t => t.type === TransactionType.EXPENSE);
  const income = transactions.filter(t => t.type === TransactionType.INCOME);
  
  const spendingByCategory = expenses.reduce((acc, curr) => {
    const category = curr.category || 'Sin categoría';
    acc[category] = (acc[category] || 0) + curr.amount;
    return acc;
  }, {} as Record<string, number>);

  // Agrupar por mes
  const monthlyData = transactions.reduce((acc, curr) => {
    const date = new Date(curr.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!acc[monthKey]) {
      acc[monthKey] = { income: 0, expense: 0 };
    }
    
    if (curr.type === TransactionType.INCOME) {
      acc[monthKey].income += curr.amount;
    } else if (curr.type === TransactionType.EXPENSE) {
      acc[monthKey].expense += curr.amount;
    }
    
    return acc;
  }, {} as Record<string, { income: number; expense: number }>);

  const monthlyTrend = Object.entries(monthlyData)
    .map(([month, data]) => ({
      month,
      income: data.income,
      expense: data.expense
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // Generar el prompt para el análisis basado en el tipo
  const prompt = getAnalysisPrompt(type, transactions, customPrompt);
  console.log('Tipo de análisis solicitado:', type);
  console.log('Prompt generado:', prompt);
  
  // Crear una respuesta estructurada basada en el tipo de análisis
  const structuredResponse: FinancialAnalysis = {
    summary: '',
    insights: [],
    recommendations: [],
    spendingByCategory: {},
    monthlyTrend: []
  };

  // Llenar la respuesta según el tipo de análisis
  switch (type) {
    case 'summary':
      structuredResponse.summary = `Resumen financiero basado en ${transactions.length} transacciones. ` +
        `Ingresos totales: $${income.reduce((sum, t) => sum + t.amount, 0).toFixed(2)}, ` +
        `Gastos totales: $${expenses.reduce((sum, t) => sum + t.amount, 0).toFixed(2)}.`;
      structuredResponse.insights = [
        `Saldo neto: $${(income.reduce((sum, t) => sum + t.amount, 0) - expenses.reduce((sum, t) => sum + t.amount, 0)).toFixed(2)}`,
        `Promedio de gasto por transacción: $${(expenses.reduce((sum, t) => sum + t.amount, 0) / transactions.length).toFixed(2)}`
      ];
      break;
      
    case 'insights':
      structuredResponse.summary = 'Análisis detallado de patrones financieros.';
      structuredResponse.insights = [
        `Categoría con mayor gasto: ${Object.entries(spendingByCategory)
          .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'}`,
        `Mes con mayores ingresos: ${monthlyTrend.sort((a, b) => b.income - a.income)[0]?.month || 'N/A'}`,
        `Tendencia de gastos: ${getTrendDescription(monthlyTrend.map(m => m.expense))}`
      ];
      break;
      
    case 'recommendations':
      structuredResponse.summary = 'Recomendaciones para mejorar tu salud financiera.';
      structuredResponse.recommendations = [
        'Establece un presupuesto mensual y haz un seguimiento de tus gastos.',
        'Considera ahorrar al menos el 20% de tus ingresos.',
        'Revisa tus suscripciones recurrentes y cancela las que no uses con frecuencia.'
      ];
      break;
      
    case 'spending':
      structuredResponse.summary = 'Análisis detallado de tus gastos.';
      structuredResponse.spendingByCategory = spendingByCategory;
      structuredResponse.insights = [
        `Categorías de gasto: ${Object.keys(spendingByCategory).join(', ')}`,
        `Gasto total por mes: $${expenses.reduce((sum, t) => sum + t.amount, 0).toFixed(2)}`
      ];
      break;
      
    case 'custom':
      structuredResponse.summary = 'Análisis personalizado de tus finanzas.';
      break;
  }
  
  // Función auxiliar para describir la tendencia
  const getTrendDescription = (values: number[]): string => {
    if (values.length < 2) return 'Datos insuficientes para determinar la tendencia';
    
    const first = values[0];
    const last = values[values.length - 1];
    const diff = first !== 0 ? ((last - first) / first) * 100 : 0;
    
    if (Math.abs(diff) < 5) return 'Estable';
    return diff > 0 ? `En aumento (${Math.abs(diff).toFixed(1)}%)` : `En disminución (${Math.abs(diff).toFixed(1)}%)`;
  };

  // Agregar la tendencia mensual a la respuesta
  structuredResponse.monthlyTrend = monthlyTrend;

  try {
    // Si es una pregunta personalizada, usar la API de Gemini
    if (type === 'custom' && customPrompt) {
      const result = await model.generateContent({
        contents: [
          { 
            role: 'user', 
            parts: [{ 
              text: `Basado en estos datos financieros: ${JSON.stringify({
                analysisType: type, 
                totalTransactions: transactions.length,
                totalIncome: income.reduce((sum, t) => sum + t.amount, 0),
                totalExpenses: expenses.reduce((sum, t) => sum + t.amount, 0),
                balance: income.reduce((sum, t) => sum + t.amount, 0) - expenses.reduce((sum, t) => sum + t.amount, 0),
                spendingByCategory,
                monthlyTrend
              }, null, 2)}\n\n${customPrompt}` 
            }] 
          }
        ]
      });
      
      const response = await result.response;
      const responseText = response.text();
      
      // Para preguntas personalizadas, devolver la respuesta directa de la API
      return {
        ...structuredResponse,
        summary: responseText,
        monthlyTrend
      };
    } else {
      // Para análisis predefinidos, devolver la respuesta estructurada
      return structuredResponse;
    }
  } catch (e) {
    console.error('Error al generar el análisis:', e);
    return defaultResponse;
  }
};
