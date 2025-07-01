import React, { useState, useEffect } from 'react';
import { Transaction } from '../types';
import { analyzeTransactions } from '../services/geminiService';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Spinner } from './ui/Spinner';


export type AnalysisType = 'summary' | 'insights' | 'recommendations' | 'spending' | 'custom';

export interface FinancialAnalysisProps {
  transactions: Transaction[];
  onClose?: () => void;
  analysisType: AnalysisType;
  customPrompt?: string;
}

export const FinancialAnalysis: React.FC<FinancialAnalysisProps> = ({ 
  transactions, 
  onClose,
  analysisType = 'summary',
  customPrompt = ''
}) => {
  interface FinancialAnalysisResult {
    summary: string;
    insights: string[];
    recommendations: string[];
    spendingByCategory: Record<string, number>;
    monthlyTrend: Array<{
      month: string;
      income: number;
      expense: number;
    }>;
  }

  const [analysis, setAnalysis] = useState<FinancialAnalysisResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalysis = async () => {
      // No hacer nada si no hay transacciones
      if (transactions.length === 0) return;
      
      // Para preguntas personalizadas, verificar que haya texto
      if (analysisType === 'custom' && !customPrompt?.trim()) {
        setAnalysis(null);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        console.log('Solicitando análisis con:', { analysisType, customPrompt });
        const result = await analyzeTransactions(transactions, analysisType, customPrompt);
        console.log('Análisis recibido:', result);
        setAnalysis(result);
      } catch (err) {
        console.error('Error en el análisis financiero:', err);
        setError('No se pudo cargar el análisis. Por favor, inténtalo de nuevo más tarde.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
    
    // Limpiar el análisis cuando cambia el tipo de análisis
    return () => {
      setAnalysis(null);
    };
  }, [transactions, analysisType, customPrompt]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <Spinner size="lg" />
        <p className="mt-4 text-gray-800 dark:text-gray-200">Analizando tus finanzas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6 text-center">
        <div className="text-red-500 mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-white">Error en el análisis</h3>
        <p className="text-gray-800 dark:text-gray-200 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()} variant="secondary">
          Reintentar
        </Button>
      </Card>
    );
  }

  if (!analysis) {
    if (analysisType === 'custom' && !customPrompt?.trim()) {
      return (
        <Card className="p-6 text-center">
          <p className="text-gray-800 dark:text-gray-200">
            Escribe tu pregunta en el campo de texto de arriba y haz clic en "Analizar".
          </p>
        </Card>
      );
    }
    
    return (
      <Card className="p-6 text-center">
        <p className="text-gray-800 dark:text-gray-200">
          {transactions.length === 0 
            ? 'No hay transacciones para analizar.' 
            : 'No hay suficientes datos para el análisis.'}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6 text-gray-900 dark:text-gray-100">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Análisis Financiero con IA</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Cerrar análisis"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Resumen */}
      <Card className="p-6 bg-white dark:bg-slate-800">
        <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Resumen</h3>
        <p className="text-gray-800 dark:text-gray-200 whitespace-pre-line">{analysis.summary}</p>
      </Card>

      {/* Ideas clave */}
      <Card className="p-6 bg-white dark:bg-slate-800">
        <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Ideas Clave</h3>
        <ul className="space-y-3">
          {analysis.insights.map((insight: string, index: number) => (
            <li key={index} className="flex items-start p-3 rounded-lg bg-gray-50 dark:bg-slate-700">
              <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-gray-800 dark:text-gray-200">{insight}</span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Recomendaciones */}
      <Card className="p-6 bg-white dark:bg-slate-800">
        <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Recomendaciones</h3>
        <ul className="space-y-3">
          {analysis.recommendations.map((rec: string, index: number) => (
            <li key={index} className="flex items-start p-3 rounded-lg bg-gray-50 dark:bg-slate-700">
              <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-semibold px-2.5 py-0.5 rounded-full mr-3 mt-0.5">
                {index + 1}
              </span>
              <span className="text-gray-800 dark:text-gray-200">{rec}</span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Gráfico de gastos por categoría */}
      {analysis.spendingByCategory && Object.keys(analysis.spendingByCategory).length > 0 && (
        <Card className="p-6 bg-white dark:bg-slate-800">
          <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Gastos por Categoría</h3>
          <div className="space-y-3">
            {Object.entries(analysis.spendingByCategory)
              ?.sort((a: [string, number], b: [string, number]) => b[1] - a[1])
              .map(([category, amount]: [string, number]) => (
                <div key={category} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{category || 'Sin categoría'}</span>
                    <span className="text-gray-600">{amount} {transactions[0]?.currency || ''}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{
                        width: `${(Number(amount) / Math.max(...Object.values(analysis.spendingByCategory).map(Number))) * 100}%`
                      }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* Tendencias mensuales */}
      {analysis.monthlyTrend && analysis.monthlyTrend.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Tendencias Mensuales</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mes</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ingresos</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Gastos</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {analysis.monthlyTrend.map((month: any) => (
                  <tr key={month.month}>
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                      {new Date(month.month).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-right text-sm text-green-600">
                      +{month.income.toLocaleString()} {transactions[0]?.currency || ''}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-right text-sm text-red-600">
                      -{month.expense.toLocaleString()} {transactions[0]?.currency || ''}
                    </td>
                    <td className={`px-4 py-2 whitespace-nowrap text-right text-sm font-medium ${
                      month.income - month.expense >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {month.income - month.expense >= 0 ? '+' : ''}
                      {(month.income - month.expense).toLocaleString()} {transactions[0]?.currency || ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div className="text-xs text-gray-500 text-center mt-4">
        <p>Análisis generado con IA. Los resultados son sugerencias y no deben considerarse como asesoramiento financiero profesional.</p>
      </div>
    </div>
  );
};
