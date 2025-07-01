import React, { useState } from 'react';
import { Transaction } from '../types';
import { FinancialAnalysis } from './FinancialAnalysis';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { SparklesIcon, ArrowLeftIcon, ChartBarIcon, LightBulbIcon, ClipboardDocumentCheckIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';

type AnalysisType = 'summary' | 'insights' | 'recommendations' | 'spending' | 'custom';

interface AnalysisOption {
  id: AnalysisType;
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface AnalyzeButtonProps {
  transactions: Transaction[];
  disabled?: boolean;
  className?: string;
}

export const AnalyzeButton: React.FC<AnalyzeButtonProps> = ({ 
  transactions, 
  disabled = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisType | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [triggerAnalysis, setTriggerAnalysis] = useState(0);
  
  const analysisOptions: AnalysisOption[] = [
    {
      id: 'summary',
      title: 'Resumen General',
      description: 'Un resumen completo de tu situación financiera actual',
      icon: <ChartBarIcon className="h-6 w-6 text-blue-500" />
    },
    {
      id: 'insights',
      title: 'Ideas Clave',
      description: 'Descubre patrones y tendencias en tus finanzas',
      icon: <LightBulbIcon className="h-6 w-6 text-yellow-500" />
    },
    {
      id: 'recommendations',
      title: 'Recomendaciones',
      description: 'Sugerencias personalizadas para mejorar tus finanzas',
      icon: <ClipboardDocumentCheckIcon className="h-6 w-6 text-green-500" />
    },
    {
      id: 'spending',
      title: 'Análisis de Gastos',
      description: 'Desglose detallado de tus hábitos de gasto',
      icon: <CurrencyDollarIcon className="h-6 w-6 text-purple-500" />
    },
    {
      id: 'custom',
      title: 'Pregunta Personalizada',
      description: 'Haz una pregunta específica sobre tus finanzas',
      icon: <SparklesIcon className="h-6 w-6 text-pink-500" />
    }
  ];

  const handleOpen = () => {
    if (transactions.length === 0) {
      alert('No hay transacciones para analizar.');
      return;
    }
    setSelectedAnalysis(null); // Mostrar el menú de opciones al abrir
    setCustomPrompt('');
    setShowAnalysis(false);
    setIsOpen(true);
  };

  const handleAnalysisSelect = (type: AnalysisType) => {
    setSelectedAnalysis(type);
    setShowAnalysis(true);
    
    if (type === 'custom') {
      setCustomPrompt('');
      setTriggerAnalysis(0); // Resetear el trigger para la pregunta personalizada
    } else {
      // Forzar un nuevo análisis cuando se selecciona otra opción
      setTriggerAnalysis(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setSelectedAnalysis(null);
    setShowAnalysis(false);
    setCustomPrompt('');
  };

  const renderContent = () => {
    // Mostrar el menú de opciones si no hay un análisis seleccionado
    if (!selectedAnalysis || !showAnalysis) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
          {analysisOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => handleAnalysisSelect(option.id)}
              className="flex flex-col items-start p-6 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-left h-full"
            >
              <div className="p-2 mb-3 rounded-lg bg-opacity-20" style={{ backgroundColor: `${option.icon.props.className.includes('text-blue') ? 'rgba(59, 130, 246, 0.1)' : 
                                                                                option.icon.props.className.includes('text-yellow') ? 'rgba(234, 179, 8, 0.1)' : 
                                                                                option.icon.props.className.includes('text-green') ? 'rgba(34, 197, 94, 0.1)' : 
                                                                                option.icon.props.className.includes('text-purple') ? 'rgba(168, 85, 247, 0.1)' : 
                                                                                'rgba(236, 72, 153, 0.1)'}` }}>
                {React.cloneElement(option.icon, { className: 'h-6 w-6' })}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                {option.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {option.description}
              </p>
            </button>
          ))}
        </div>
      );
    }

    // Si hay un análisis seleccionado, mostrarlo
    if (selectedAnalysis) {
      return (
        <div className="max-h-[70vh] flex flex-col">
          <div className="sticky top-0 bg-white dark:bg-slate-800 p-4 border-b border-gray-200 dark:border-gray-700 flex items-center">
            <button 
              onClick={handleBack}
              className="mr-2 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </button>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {analysisOptions.find(o => o.id === selectedAnalysis)?.title}
            </h3>
          </div>
          
          {selectedAnalysis === 'custom' && (
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="mb-4">
                <label htmlFor="custom-prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  ¿Qué te gustaría saber sobre tus finanzas?
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="custom-prompt"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                    placeholder="Ej: ¿Cómo puedo reducir mis gastos en comida?"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && customPrompt.trim()) {
                        // El análisis se disparará automáticamente cuando cambie el prompt
                      }
                    }}
                  />
                  <Button 
                    onClick={() => setTriggerAnalysis(prev => prev + 1)}
                    disabled={!customPrompt.trim()}
                  >
                    Analizar
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex-1 overflow-y-auto p-4">
            <FinancialAnalysis 
              key={`${selectedAnalysis}-${triggerAnalysis}`}
              transactions={transactions} 
              analysisType={selectedAnalysis}
              customPrompt={selectedAnalysis === 'custom' ? customPrompt : ''}
              onClose={() => setIsOpen(false)}
            />
          </div>
        </div>
      );
    }
  };

  return (
    <>
      <Button 
        onClick={handleOpen} 
        disabled={disabled}
        className={className}
        variant="primary"
      >
        <SparklesIcon className="h-4 w-4 mr-2" />
        Analizar con IA
      </Button>

      <Modal 
        isOpen={isOpen} 
        onClose={() => {
          setIsOpen(false);
          setSelectedAnalysis(null);
          setShowAnalysis(false);
        }}
        title={selectedAnalysis ? 
          analysisOptions.find(o => o.id === selectedAnalysis)?.title : 
          'Seleccionar tipo de análisis'}
        size="xl"
      >
        {renderContent()}
      </Modal>
    </>
  );
};
