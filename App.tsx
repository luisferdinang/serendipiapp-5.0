
import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { FilterControls } from './components/FilterControls';
import { FinancialSummary } from './components/FinancialSummary';
import { TransactionList } from './components/TransactionList';
import { CurrencyConverter } from './components/CurrencyConverter';
import { TransactionFormModal } from './components/TransactionFormModal';
import { Button } from './components/ui/Button';
import { DeleteConfirmationModal } from './components/DeleteConfirmationModal';
import { useAuth } from './contexts/AuthContext';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase';
import { Transaction, CustomDateRange, FilterPeriod } from './types';
import { generateFinancialReportPDF } from './services/pdfReportService';
import { DashboardTab } from './components/DashboardTab'; // Import DashboardTab
import { PAYMENT_METHOD_OPTIONS, CURRENCY_OPTIONS } from './constants'; // Import constants for DashboardTab
import { useFirebaseTransactions } from './hooks/useFirebaseTransactions';
import { VenezuelaTime } from './components/VenezuelaTime';

const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-5 h-5 ${className}`}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
);

const DocumentDownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-5 h-5 ${className}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

const ChartBarIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-5 h-5 ${className}`}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
);

const CashIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-5 h-5 ${className}`}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v15c0 .621-.504 1.125-1.125 1.125h-15a1.125 1.125 0 01-1.125-1.125v-15A1.125 1.125 0 013.75 4.5M3 13.5h18M3.75 18h16.5" />
    </svg>
);



const ITEMS_PER_PAGE_OPTIONS = [
  { value: 10, label: '10 por página' },
  { value: 25, label: '25 por página' },
  { value: 50, label: '50 por página' },
  { value: 100, label: '100 por página' },
];

type ActiveTab = 'finanzas' | 'dashboard';

const App: React.FC = () => {
  const { currentUser, getVenezuelaDate } = useAuth();
  const isAuthenticated = !!currentUser;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Efecto para verificar el estado de autenticación
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(() => {
      // El estado de autenticación ya se maneja a través del contexto
    });
    return () => unsubscribe();
  }, []);

  // Manejar el inicio de sesión
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setAuthError(null);
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      setAuthError('Error al iniciar sesión. Verifica tus credenciales.');
      console.error(error);
    }
  };

  // Cargar datos solo si el usuario está autenticado
  const {
    allTransactions, 
    incomeAndAdjustments,
    expenses,
    financialSummary,
    filterPeriod,
    setFilterPeriod,
    customDateRange,
    setCustomDateRange,
    exchangeRate,
    setExchangeRate,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    isLoading,
    error,
    getPaymentMethodDetails,
    refreshData,
    getCurrentVenezuelaTime
  } = useFirebaseTransactions();

  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>(undefined);
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<{ id: string, description: string } | null>(null);

  const [itemsPerPage, setItemsPerPage] = useState<number>(ITEMS_PER_PAGE_OPTIONS[0].value);
  const [currentPageIncomeAdjustments, setCurrentPageIncomeAdjustments] = useState(1);
  const [currentPageExpenses, setCurrentPageExpenses] = useState(1);

  const [activeTab, setActiveTab] = useState<ActiveTab>('finanzas');

  useEffect(() => {
    setCurrentPageIncomeAdjustments(1);
    setCurrentPageExpenses(1);
  }, [filterPeriod, customDateRange.startDate, customDateRange.endDate, itemsPerPage]);


  const handleOpenTransactionModal = (transaction?: Transaction) => {
    setEditingTransaction(transaction);
    setIsTransactionModalOpen(true);
  };

  const handleCloseTransactionModal = () => {
    setEditingTransaction(undefined);
    setIsTransactionModalOpen(false);
  };

  const handleSubmitTransaction = (transactionData: Omit<Transaction, 'id'>) => {
    if (editingTransaction) {
      // Asegurarse de que solo se actualicen los campos permitidos
      const { id } = editingTransaction;
      updateTransaction(id, transactionData);
    } else {
      addTransaction(transactionData);
    }
  };

  const handleOpenDeleteModal = (id: string, description: string) => {
    setTransactionToDelete({ id, description });
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (transactionToDelete) {
      deleteTransaction(transactionToDelete.id);
      setTransactionToDelete(null);
    }
    setIsDeleteModalOpen(false);
  };

  const handleCustomRangeChange = (name: keyof CustomDateRange, value: string) => {
    setCustomDateRange({
      ...customDateRange,
      [name]: value
    });
  };
  
  const handleItemsPerPageChange = (newItemsPerPage: string) => {
    setItemsPerPage(Number(newItemsPerPage));
  };

  // Función para formatear fecha a YYYY-MM-DD
  const formatDateToYMD = (date: Date): string => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleGenerateReport = () => {
    // Usar las transacciones ya filtradas del hook useFirebaseTransactions
    // para mantener consistencia con lo que se muestra en la UI
    let reportIncomeAndAdjustments = [...incomeAndAdjustments];
    let reportExpenses = [...expenses];
    
    // Si el filtro es HOY, asegurarnos de usar la misma lógica que en useFirebaseTransactions
    if (filterPeriod === FilterPeriod.TODAY) {
      const now = getVenezuelaDate();
      const todayStr = formatDateToYMD(now);
      
      const filterToday = (tx: Transaction) => {
        const txDateStr = tx.date.split('T')[0];
        return txDateStr === todayStr;
      };
      
      reportIncomeAndAdjustments = incomeAndAdjustments.filter(filterToday);
      reportExpenses = expenses.filter(filterToday);
    } else if (filterPeriod !== FilterPeriod.ALL) {
      // Para los demás períodos, usar la lógica existente
      const now = new Date();
      let startDate: Date;
      let endDate: Date = new Date();
      
      switch (filterPeriod) {
        case FilterPeriod.WEEK:
          startDate = new Date(now);
          startDate.setDate(now.getDate() - now.getDay()); // Domingo de esta semana
          startDate.setHours(0, 0, 0, 0);
          break;
        case FilterPeriod.MONTH:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case FilterPeriod.CUSTOM:
          startDate = new Date(customDateRange.startDate);
          endDate = new Date(customDateRange.endDate);
          endDate.setHours(23, 59, 59, 999);
          break;
        default:
          startDate = new Date(0); // Todas las fechas
      }
      
      const filterByDate = (tx: Transaction) => {
        const txDate = new Date(tx.date);
        return txDate >= startDate && txDate <= endDate;
      };
      
      reportIncomeAndAdjustments = incomeAndAdjustments.filter(filterByDate);
      reportExpenses = expenses.filter(filterByDate);
    }
    
    // Generar el PDF con las transacciones filtradas
    console.log('Generando reporte con:', {
      ingresos: reportIncomeAndAdjustments.length,
      gastos: reportExpenses.length,
      periodo: filterPeriod
    });
    
    generateFinancialReportPDF(
      reportIncomeAndAdjustments, 
      reportExpenses,           
      financialSummary,
      filterPeriod,
      customDateRange,
      exchangeRate
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-100">Gestión Financiera</h1>
        <div className="flex items-center space-x-4">
          <button 
            onClick={refreshData}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Cargando...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Recargar Datos
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-black">
      <Header />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex space-x-2 mb-6 border-b border-slate-700 pb-3">
              <Button
                  variant={activeTab === 'finanzas' ? 'primary' : 'secondary'}
                  onClick={() => setActiveTab('finanzas')}
                  leftIcon={<CashIcon />}
              >
                  Finanzas
              </Button>
              <Button
                  variant={activeTab === 'dashboard' ? 'primary' : 'secondary'}
                  onClick={() => setActiveTab('dashboard')}
                  leftIcon={<ChartBarIcon />}
              >
                  Dashboard de Gráficos
              </Button>
          </div>
      </div>
      
      <main className="container mx-auto p-4 md:p-6 lg:p-8 pt-0"> {/* Adjusted pt-0 here */}
        {error && <div className="bg-red-500/20 border border-red-700 text-red-300 p-4 rounded-md mb-6">{error}</div>}
        
        {activeTab === 'finanzas' && (
          <>
            <div className="flex flex-col sm:flex-row justify-end items-center gap-4 mb-6">
              <Button onClick={handleGenerateReport} variant="secondary" size="lg" leftIcon={<DocumentDownloadIcon />}>
                Generar Informe PDF
              </Button>
              <Button onClick={() => handleOpenTransactionModal()} variant="primary" size="lg" leftIcon={<PlusIcon />}>
                Nueva Transacción
              </Button>
            </div>

            <FilterControls 
              currentFilter={filterPeriod}
              onFilterChange={(newFilter) => setFilterPeriod(newFilter as FilterPeriod)}
              customRange={customDateRange}
              onCustomRangeChange={handleCustomRangeChange}
            />
            
            <FinancialSummary summary={financialSummary} />

            <div className="my-6">
                <label htmlFor="itemsPerPage" className="block text-sm font-medium text-gray-700 mb-1">
                  Mostrar por página:
                </label>
                <select
                  id="itemsPerPage"
                  value={itemsPerPage}
                  onChange={(e) => handleItemsPerPageChange(e.target.value)}
                  className="block w-full sm:max-w-xs rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
            </div>

            <div className="grid lg:grid-cols-2 gap-6 mb-8">
              <TransactionList
                title="Historial de Ingresos y Ajustes"
                transactions={incomeAndAdjustments}
                onEdit={handleOpenTransactionModal}
                onDelete={handleOpenDeleteModal}
                getPaymentMethodDetails={getPaymentMethodDetails}
                currentPage={currentPageIncomeAdjustments}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPageIncomeAdjustments}
              />
              <TransactionList
                title="Historial de Gastos"
                transactions={expenses}
                onEdit={handleOpenTransactionModal}
                onDelete={handleOpenDeleteModal}
                getPaymentMethodDetails={getPaymentMethodDetails}
                currentPage={currentPageExpenses}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPageExpenses}
              />
            </div>

            <CurrencyConverter 
              bsTotal={financialSummary.bs.totalBalance}
              exchangeRate={exchangeRate}
              onExchangeRateChange={setExchangeRate}
            />
          </>
        )}

        {activeTab === 'dashboard' && (
          <DashboardTab
            allTransactions={allTransactions} // Pass the full list for dashboard's internal filtering and historical charts
            exchangeRate={exchangeRate}
            paymentMethodOptions={PAYMENT_METHOD_OPTIONS} // Keep for potential future use
            currencyOptions={CURRENCY_OPTIONS} // Keep for potential future use
            financialSummary={financialSummary} // Pass global financialSummary for total balance KPI
          />
        )}


        <TransactionFormModal
          isOpen={isTransactionModalOpen}
          onClose={handleCloseTransactionModal}
          onSubmit={(data) => {
            handleSubmitTransaction(data);
            handleCloseTransactionModal();
          }}
          initialData={editingTransaction}
        />
        <DeleteConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleConfirmDelete}
          itemName={transactionToDelete?.description}
        />
      </main>
      <footer className="text-center p-6 text-slate-500 border-t border-slate-700/50 mt-12">
        <p>&copy; {new Date().getFullYear()} Serendipia Studio. Todos los derechos reservados.</p>
        <p className="text-xs mt-1">Hecho con amor y código.</p>
        <VenezuelaTime getCurrentVenezuelaTime={getCurrentVenezuelaTime} />
      </footer>
    </div>
  );
};

export default App;
