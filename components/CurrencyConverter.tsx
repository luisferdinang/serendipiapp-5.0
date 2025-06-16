
import React, { useState, useEffect } from 'react';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Currency } from '../types';

interface CurrencyConverterProps {
  bsTotal: number;
  exchangeRate: number;
  onExchangeRateChange: (rate: number) => void;
}

const ExchangeIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-5 h-5 ${className}`}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h18M16.5 3L21 7.5m0 0L16.5 12M21 7.5H3" />
    </svg>
);


export const CurrencyConverter: React.FC<CurrencyConverterProps> = ({ bsTotal, exchangeRate, onExchangeRateChange }) => {
  const [currentRateInput, setCurrentRateInput] = useState<string>(exchangeRate.toString());
  const [convertedAmount, setConvertedAmount] = useState<number>(0);

  useEffect(() => {
    setCurrentRateInput(exchangeRate.toString());
  }, [exchangeRate]);

  useEffect(() => {
    if (bsTotal > 0 && parseFloat(currentRateInput) > 0) {
      setConvertedAmount(bsTotal / parseFloat(currentRateInput));
    } else {
      setConvertedAmount(0);
    }
  }, [bsTotal, currentRateInput]);

  const handleRateUpdate = () => {
    const newRate = parseFloat(currentRateInput);
    if (!isNaN(newRate) && newRate > 0) {
      onExchangeRateChange(newRate);
    } else {
      // Maybe show an error, for now, it just won't update if invalid
      setCurrentRateInput(exchangeRate.toString()); // Reset to last valid rate
    }
  };

  return (
    <div className="p-6 bg-slate-800 rounded-xl shadow-xl mt-8">
      <h3 className="text-xl font-semibold text-amber-300 mb-4 flex items-center">
        <ExchangeIcon className="mr-2" />
        Conversor Bs. a USD
      </h3>
      <div className="grid md:grid-cols-3 gap-4 items-end">
        <Input
          label={`Saldo Total en ${Currency.BS}`}
          id="bsTotal"
          value={bsTotal.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          readOnly
          className="bg-slate-700 cursor-not-allowed"
          containerClassName="mb-0"
        />
        <div className="flex flex-col">
            <Input
            label="Tasa de Cambio (Bs. por USD)"
            id="exchangeRate"
            type="number"
            value={currentRateInput}
            onChange={(e) => setCurrentRateInput(e.target.value)}
            step="0.01"
            containerClassName="mb-0 grow"
            />
            <Button onClick={handleRateUpdate} size="sm" variant="secondary" className="mt-1 w-full md:w-auto">
                Actualizar Tasa
            </Button>
        </div>
        <Input
          label={`Equivalente Estimado en ${Currency.USD}`}
          id="usdEquivalent"
          value={convertedAmount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          readOnly
          className="bg-slate-700 cursor-not-allowed text-green-400 font-semibold"
          containerClassName="mb-0"
        />
      </div>
       <p className="text-xs text-slate-400 mt-3 text-center md:text-right">
        La tasa de cambio se guarda para futuras sesiones.
      </p>
    </div>
  );
};
