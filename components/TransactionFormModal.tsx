
import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Transaction, TransactionType, PaymentMethod, Currency, PaymentDetail as CorePaymentDetail, PaymentMethodOption } from '../types';
import { PAYMENT_METHOD_OPTIONS, TRANSACTION_TYPE_OPTIONS, CURRENCY_OPTIONS, formatDateForInput } from '../constants';

// Internal state type for managing payment details within the form
interface FormPaymentDetail {
  method: PaymentMethod;
  amount: string; // Amounts are strings in the form
}

interface TransactionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (transactionData: Omit<Transaction, 'id'>) => void;
  initialData?: Transaction;
}

const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-5 h-5 ${className}`}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12.56 0c1.153 0 2.242.078 3.324.225m8.916-.225c-.342.052-.682.107-1.022.166M6.538 5.79L6.255 3H4.065a1.125 1.125 0 00-1.124 1.125v1.5c0 .621.504 1.125 1.124 1.125h18.75c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-2.298L19.74 5.79M6.538 5.79l-.283-2.79M14.74 9v9" />
    </svg>
);


export const TransactionFormModal: React.FC<TransactionFormModalProps> = ({ isOpen, onClose, onSubmit, initialData }) => {
  const [type, setType] = useState<TransactionType>(TransactionType.INCOME);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [unitPrice, setUnitPrice] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('1');
  const [totalAmount, setTotalAmount] = useState<string>('');
  const [currency, setCurrency] = useState<Currency>(Currency.BS);
  const [date, setDate] = useState(formatDateForInput(new Date()));
  const [paymentDetails, setPaymentDetails] = useState<FormPaymentDetail[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Obtener métodos de pago disponibles para la moneda actual
  const availablePaymentMethods = useMemo(() => {
    const methods = PAYMENT_METHOD_OPTIONS.filter(pm => pm.currency === currency);
    console.log('Métodos de pago disponibles para', currency, ':', methods);
    return methods;
  }, [currency]);

  // Calcular el monto total cuando cambia el precio unitario o la cantidad
  useEffect(() => {
    const price = parseFloat(unitPrice) || 0;
    const qty = parseFloat(quantity) || 0;
    const total = (price * qty).toFixed(2);
    setTotalAmount(total);
    
    // Actualizar el monto del primer método de pago si solo hay uno
    if (paymentDetails.length === 1) {
      setPaymentDetails([{ 
        ...paymentDetails[0], 
        amount: total 
      }]);
    }
  }, [unitPrice, quantity]);

  // Función para normalizar métodos de pago
  const normalizePaymentMethod = (method: any, currency: Currency): PaymentMethod => {
    // Si el método ya es un valor válido de PaymentMethod, devolverlo
    if (method && Object.values(PaymentMethod).includes(method as PaymentMethod)) {
      return method as PaymentMethod;
    }
    
    // Mapear métodos antiguos o alternativos
    const methodMap: Record<string, Record<string, PaymentMethod>> = {
      'BS': {
        'EFECTIVO': PaymentMethod.EFECTIVO_BS,
        'PAGO_MOVIL': PaymentMethod.PAGO_MOVIL_BS,
        'TRANSFERENCIA': PaymentMethod.PAGO_MOVIL_BS,
        'BANCO': PaymentMethod.PAGO_MOVIL_BS,
        'BANK': PaymentMethod.PAGO_MOVIL_BS,
        'TRANSFER': PaymentMethod.PAGO_MOVIL_BS,
        'PAGOMOVIL': PaymentMethod.PAGO_MOVIL_BS,
        'PAGO_MOVIL_BS': PaymentMethod.PAGO_MOVIL_BS,
        'EFECTIVO_BS': PaymentMethod.EFECTIVO_BS
      },
      'USD': {
        'EFECTIVO': PaymentMethod.EFECTIVO_USD,
        'USDT': PaymentMethod.USDT,
        'DOLARES': PaymentMethod.EFECTIVO_USD,
        'EFECTIVO_USD': PaymentMethod.EFECTIVO_USD,
        'CASH': PaymentMethod.EFECTIVO_USD,
        'CRIPTO': PaymentMethod.USDT,
        'CRYPTO': PaymentMethod.USDT,
        'DIGITAL': PaymentMethod.USDT
      }
    };
    
    // Si el método es un objeto (como en los datos migrados), convertirlo a string
    const methodStr = method && typeof method === 'object' 
      ? Object.entries(method as Record<string, any>)
          .filter(([_, value]) => value !== null && value !== undefined && value !== '' && value !== 0)
          .map(([key]) => key.toUpperCase())
          .join('_')
      : String(method || '').toUpperCase();
    
    console.log('Normalizando método de pago:', { original: method, asString: methodStr });
    
    // Intentar mapear el método
    const normalizedMethod = methodMap[currency]?.[methodStr];
    if (normalizedMethod) {
      console.log(`Método normalizado: ${methodStr} -> ${normalizedMethod}`);
      return normalizedMethod;
    }
    
    // Si no se puede mapear, buscar coincidencias parciales
    const methodKey = Object.entries(methodMap[currency] || {})
      .find(([key]) => methodStr.includes(key))?.[0];
      
    if (methodKey) {
      const matchedMethod = methodMap[currency]?.[methodKey];
      console.log(`Coincidencia parcial: ${methodStr} -> ${methodKey} -> ${matchedMethod}`);
      return matchedMethod;
    }
    
    // Si no se puede mapear, usar un valor por defecto
    console.warn(`No se pudo normalizar el método de pago: ${methodStr}. Usando valor por defecto para ${currency}.`);
    return currency === Currency.USD ? PaymentMethod.EFECTIVO_USD : PaymentMethod.EFECTIVO_BS;
  };

  // Inicializar el formulario cuando se abre o cambian los datos iniciales
  useEffect(() => {
    if (!isOpen) return;
    
    // Obtener métodos de pago para la moneda actual del initialData o por defecto
    const initialCurrency = initialData?.currency || Currency.BS;
    const methodsForCurrency = PAYMENT_METHOD_OPTIONS.filter(pm => pm.currency === initialCurrency);
    console.log('Métodos disponibles en inicialización para moneda', initialCurrency, ':', methodsForCurrency);
    
    if (initialData) {
      // Lógica de inicialización para edición
      setType(initialData.type);
      setDescription(initialData.description);
      setCategory(initialData.category || '');
      setNotes(initialData.notes || '');
      setCurrency(initialData.currency);
      setDate(initialData.date);
      
      const qty = initialData.quantity || 1;
      const unitPrice = (initialData.amount / qty).toFixed(2);
      setQuantity(qty.toString());
      setUnitPrice(unitPrice);
      setTotalAmount(initialData.amount.toString());
      
      // Inicializar métodos de pago
      if (initialData.paymentMethods?.length > 0) {
        // Normalizar y validar los métodos de pago
        const validPaymentMethods = initialData.paymentMethods.map(pm => {
          // Normalizar el método de pago
          const normalizedMethod = normalizePaymentMethod(pm.method, initialData.currency);
          
          // Validar que el método normalizado sea compatible con la moneda
          const isValidForCurrency = methodsForCurrency.some(m => m.id === normalizedMethod);
          
          if (!isValidForCurrency) {
            console.warn(`Método ${normalizedMethod} no es válido para la moneda ${initialData.currency}. Usando valor por defecto.`);
            return {
              method: methodsForCurrency[0]?.id || 
                     (initialData.currency === Currency.USD ? 
                      PaymentMethod.EFECTIVO_USD : 
                      PaymentMethod.EFECTIVO_BS),
              amount: typeof pm.amount === 'number' ? pm.amount.toString() : pm.amount || '0.00'
            };
          }
          
          return {
            method: normalizedMethod,
            amount: typeof pm.amount === 'number' ? pm.amount.toString() : pm.amount || '0.00'
          };
        });
        
        console.log('Métodos de pago normalizados:', validPaymentMethods);
        setPaymentDetails(validPaymentMethods);
      } else {
        // Si no hay métodos de pago, usar uno por defecto
        const defaultMethod = methodsForCurrency[0]?.id || 
                             (initialData.currency === Currency.USD ? 
                              PaymentMethod.EFECTIVO_USD : 
                              PaymentMethod.EFECTIVO_BS);
        setPaymentDetails([{ 
          method: defaultMethod, 
          amount: initialData.amount.toString() 
        }]);
      }
    } else {
      // Lógica de inicialización para nuevo registro
      setType(TransactionType.INCOME);
      setDescription('');
      setCategory('');
      setNotes('');
      setUnitPrice('');
      setQuantity('1');
      setTotalAmount('0.00');
      setDate(formatDateForInput(new Date()));
      
      // Inicializar con un método de pago por defecto
      const defaultMethod = methodsForCurrency[0]?.id || PaymentMethod.EFECTIVO_BS;
      setPaymentDetails([{ 
        method: defaultMethod, 
        amount: '0.00' 
      }]);
    }
    
    setErrors({});
  }, [isOpen, initialData]); // Eliminamos currency de las dependencias para evitar bucles

  // Actualizar métodos de pago cuando cambia la moneda
  useEffect(() => {
    if (!isOpen) return;
    
    console.log('Moneda actualizada a:', currency);
    console.log('Métodos disponibles:', availablePaymentMethods);
    
    // Si no hay métodos de pago disponibles para la moneda actual, usar uno por defecto
    if (availablePaymentMethods.length === 0) {
      console.log('No hay métodos disponibles para la moneda, usando valor por defecto');
      const defaultMethod = currency === Currency.USD ? PaymentMethod.EFECTIVO_USD : PaymentMethod.EFECTIVO_BS;
      setPaymentDetails([{ 
        method: defaultMethod, 
        amount: totalAmount || '0.00' 
      }]);
      return;
    }
    
    // Si hay métodos disponibles, asegurarse de que el método actual sea válido
    setPaymentDetails(prev => {
      console.log('Actualizando detalles de pago. Estado anterior:', prev);
      
      if (prev.length === 0) {
        const newDetail = { 
          method: availablePaymentMethods[0].id, 
          amount: totalAmount || '0.00' 
        };
        console.log('No hay detalles previos, creando nuevo:', newDetail);
        return [newDetail];
      }
      
      // Verificar si el método actual es válido para la moneda
      const currentMethod = prev[0]?.method;
      const isCurrentMethodValid = availablePaymentMethods.some(m => m.id === currentMethod);
      
      if (!isCurrentMethodValid) {
        const newDetail = { 
          method: availablePaymentMethods[0].id, 
          amount: prev[0]?.amount || totalAmount || '0.00' 
        };
        console.log('Método actual no válido, actualizando a:', newDetail);
        return [newDetail];
      }
      
      console.log('Método actual es válido, manteniendo:', prev);
      return prev;
    });
  }, [currency, availablePaymentMethods, totalAmount, isOpen]);


  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!description.trim()) newErrors.description = 'La descripción es requerida.';
    if (!unitPrice || isNaN(parseFloat(unitPrice)) || parseFloat(unitPrice) < 0) {
      newErrors.unitPrice = 'El precio unitario debe ser mayor o igual a cero';
    }
    if (!quantity || isNaN(parseInt(quantity)) || parseInt(quantity) < 1) {
      newErrors.quantity = 'La cantidad debe ser mayor a cero';
    }
    if (paymentDetails.length === 0 || paymentDetails.some(pd => !pd.amount || isNaN(parseFloat(pd.amount)) || parseFloat(pd.amount) <= 0)) {
      newErrors.paymentMethods = 'Debe agregar al menos un método de pago válido';
    }
    
    if (type !== TransactionType.ADJUSTMENT) {
       const parsedQuantity = parseInt(quantity);
       if (!quantity.trim() || isNaN(parsedQuantity) || parsedQuantity <= 0) {
           if (type === TransactionType.INCOME || type === TransactionType.EXPENSE) {
             newErrors.quantity = 'La cantidad debe ser un número positivo.';
           }
       }
    }
    if (!date) newErrors.date = 'La fecha es requerida.';
    if (paymentDetails.length === 0) newErrors.paymentDetails = 'Debe agregar al menos un detalle de pago.';

    let sumOfPaymentParts = 0;
    paymentDetails.forEach((pd, index) => {
      if (!pd.method) newErrors[`paymentMethod_${index}`] = 'Seleccione un método de pago.';
      const pdAmount = parseFloat(pd.amount); // pd.amount is string
      if (isNaN(pdAmount) || pdAmount <= 0) newErrors[`paymentAmount_${index}`] = 'El monto debe ser positivo.';
      else sumOfPaymentParts += pdAmount;
    });

    if (!isNaN(parseFloat(totalAmount)) && parseFloat(totalAmount) > 0 && sumOfPaymentParts !== parseFloat(totalAmount)) {
      // Use a small epsilon for float comparison if necessary, but direct comparison is usually fine for sums.
      if (Math.abs(sumOfPaymentParts - parseFloat(totalAmount)) > 0.001) { // Tolerance for floating point issues
        newErrors.paymentPartsSum = `La suma de las partes (${sumOfPaymentParts.toFixed(2)}) no coincide con el monto total (${totalAmount}).`;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const finalPaymentDetails: CorePaymentDetail[] = paymentDetails.map(fd => ({
      method: fd.method,
      amount: parseFloat(fd.amount), // Convert string amount to number
    }));

    const transactionData: Omit<Transaction, 'id'> = {
      description: description.trim(),
      unitPrice: parseFloat(unitPrice) || 0,
      quantity: parseInt(quantity) || 1,
      amount: parseFloat(totalAmount) || 0,
      currency,
      type,
      date,
      paymentMethods: paymentDetails.map(pd => ({
        method: pd.method || PaymentMethod.EFECTIVO_BS,
        amount: parseFloat(pd.amount) || 0
      })),
      ...(category && { category: category.trim() }),
      ...(notes && { notes: notes.trim() })
    };
    if (type !== TransactionType.ADJUSTMENT && quantity.trim()) {
      transactionData.quantity = parseInt(quantity);
    }
    
    onSubmit(transactionData);
    // onClose(); // Original code has onClose here, it's fine.
  };
  
  const handleAddPaymentDetail = () => {
    if (availablePaymentMethods.length === 0) {
      setErrors(prev => ({
        ...prev, 
        paymentMethods: 'No hay métodos de pago disponibles para la moneda seleccionada.'
      }));
      return;
    }
    
    const defaultMethod = availablePaymentMethods[0].id;
    setPaymentDetails(prev => [
      ...prev, 
      { 
        method: defaultMethod, 
        amount: '0.00' 
      }
    ]);
    
    // Limpiar cualquier error previo
    setErrors(prev => {
      const newErrors = {...prev};
      delete newErrors.paymentMethods;
      return newErrors;
    });
  };

  const handleRemovePaymentDetail = (index: number) => {
    const newPaymentDetails = paymentDetails.filter((_, i) => i !== index);
    setPaymentDetails(newPaymentDetails);
  };

  const handlePaymentDetailChange = (index: number, field: keyof FormPaymentDetail, value: string | PaymentMethod) => {
    console.log('Cambio en detalle de pago:', { index, field, value });
    setPaymentDetails(prevDetails => {
      const newDetails = [...prevDetails];
      
      if (field === 'method') {
        // Asegurarse de que el valor es un PaymentMethod válido
        const methodValue = Object.values(PaymentMethod).includes(value as PaymentMethod) 
          ? value as PaymentMethod 
          : PaymentMethod.EFECTIVO_BS;
        
        newDetails[index] = {
          ...newDetails[index],
          method: methodValue
        };
        console.log('Método de pago actualizado a:', methodValue);
      } else if (field === 'amount') {
        newDetails[index] = {
          ...newDetails[index],
          amount: value as string
        };
      }
      
      console.log('Nuevos detalles de pago:', newDetails);
      return newDetails;
    });
  };

  const isAdjustment = type === TransactionType.ADJUSTMENT;
  const currentPaymentPartsSum = paymentDetails.reduce((sum, pd) => sum + (parseFloat(pd.amount) || 0), 0);
  const totalTransactionAmountNum = parseFloat(totalAmount) || 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Editar Transacción' : 'Nueva Transacción'} size="xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              id="type"
              label="Tipo de Transacción"
              options={TRANSACTION_TYPE_OPTIONS.map(t => ({ value: t.id, label: t.label }))}
              value={type}
              onChange={(e) => setType(e.target.value as TransactionType)}
              required
            />
            <div className="mb-4">
              <label htmlFor="currency" className="block text-sm font-medium text-slate-300 mb-1">
                Moneda de la Transacción
              </label>
              <select
                id="currency"
                className="block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm text-slate-100"
                value={currency}
                onChange={(e) => {
                  console.log('Cambiando moneda a:', e.target.value);
                  setCurrency(e.target.value as Currency);
                }}
                required
              >
                {CURRENCY_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
        </div>
        
        <Input
          id="description"
          label="Descripción"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          error={errors.description}
          required
        />
        <Input
          id="category"
          label="Categoría (Opcional)"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Ej: Servicios, Comida, Operativo"
        />

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Precio Unitario</label>
            <Input
              type="number"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
            />
            {errors.unitPrice && <p className="mt-1 text-sm text-red-500">{errors.unitPrice}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Cantidad</label>
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="1"
              min="1"
              step="1"
            />
            {errors.quantity && <p className="mt-1 text-sm text-red-500">{errors.quantity}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Total</label>
            <Input
              type="text"
              value={totalAmount}
              readOnly
              className="bg-gray-700 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1">Calculado automáticamente</p>
          </div>
        </div>
        <Input
          id="date"
          label="Fecha"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          error={errors.date}
          required
        />
        
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-slate-300 mb-1">Notas Adicionales (Opcional)</label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm text-slate-100"
            placeholder="Detalles adicionales sobre la transacción..."
          />
        </div>


        <fieldset className="border border-slate-600 p-4 rounded-md">
            <legend className="text-sm font-medium text-sky-300 px-1">Desglose de Pago</legend>
            {paymentDetails.map((pd, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end mb-3 p-3 bg-slate-700/50 rounded">
                    <div className="w-full">
                      <label htmlFor={`paymentMethod_${index}`} className="block text-sm font-medium text-slate-300 mb-1">
                        Método Parte {index + 1}
                      </label>
                      <div className="w-full">
                        <label htmlFor={`paymentMethod_${index}`} className="block text-sm font-medium text-slate-300 mb-1">
                          Método de Pago {index + 1}
                        </label>
                        <select
                          id={`paymentMethod_${index}`}
                          value={pd.method}
                          onChange={(e) => {
                            console.log('Selección cambiada a:', e.target.value);
                            handlePaymentDetailChange(index, 'method', e.target.value as PaymentMethod);
                          }}
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm text-slate-100"
                          required
                        >
                          {availablePaymentMethods.map(pm => (
                            <option 
                              key={pm.id} 
                              value={pm.id}
                            >
                              {pm.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      {errors[`paymentMethod_${index}`] && (
                        <p className="mt-1 text-xs text-red-400">{errors[`paymentMethod_${index}`]}</p>
                      )}
                    </div>
                    <Input
                        id={`paymentAmount_${index}`}
                        label={`Monto Parte ${index + 1}`}
                        type="number"
                        value={pd.amount} // pd.amount is string
                        onChange={(e) => handlePaymentDetailChange(index, 'amount', e.target.value)}
                        error={errors[`paymentAmount_${index}`]}
                        step="0.01"
                        containerClassName="mb-0"
                        required
                    />
                    <Button 
                        type="button" 
                        variant="danger" 
                        size="sm"
                        onClick={() => handleRemovePaymentDetail(index)} 
                        className="w-full md:w-auto self-center md:self-end h-10"
                        // Disable remove if it's the only part and not editing an existing transaction
                        // (or if editing, allow removal down to 1 if initial data had multiple)
                        disabled={paymentDetails.length === 1 && (!initialData || initialData.paymentMethods.length <=1)}
                        aria-label="Eliminar parte del pago"
                    >
                        <TrashIcon /> <span className="ml-1 hidden md:inline">Eliminar</span>
                    </Button>
                </div>
            ))}
            <Button type="button" variant="secondary" size="sm" onClick={handleAddPaymentDetail}>
                Agregar Parte del Pago
            </Button>
            {errors.paymentDetails && <p className="mt-1 text-xs text-red-400">{errors.paymentDetails}</p>}
            
            <div className="mt-3 text-sm text-slate-300">
                Suma de las partes: <span className={`font-semibold ${(Math.abs(currentPaymentPartsSum - totalTransactionAmountNum) > 0.001) && totalTransactionAmountNum > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {currentPaymentPartsSum.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
                </span>
                {' / '}
                Total: <span className="font-semibold">
                    {totalTransactionAmountNum.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
                </span>
            </div>
            {errors.paymentPartsSum && <p className="mt-1 text-xs text-red-400">{errors.paymentPartsSum}</p>}
        </fieldset>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="primary">{initialData ? 'Actualizar' : 'Agregar'}</Button>
        </div>
      </form>
    </Modal>
  );
};
