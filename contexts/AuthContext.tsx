import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, User, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';

type AuthContextType = {
  currentUser: User | null;
  user: User | null; // Alias para compatibilidad
  loading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  getVenezuelaDate: () => Date;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      setError('Error al cerrar sesión. Por favor, inténtalo de nuevo.');
    }
  }, [navigate]);

  useEffect(() => {
    console.log('🔐 [AuthProvider] Configurando observador de autenticación...');
    
    // Configurar el estado inicial de carga
    setLoading(true);
    
    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        try {
          console.log('👤 [AuthProvider] Estado de autenticación cambiado:', 
            user ? `Usuario autenticado (${user.email}, UID: ${user.uid})` : 'Usuario no autenticado'
          );
          
          if (user) {
            // Verificar si el token está disponible
            try {
              const idTokenResult = await user.getIdTokenResult(true);
              console.log('🔑 [AuthProvider] Token info:', {
                tokenExpiration: idTokenResult.expirationTime,
                claims: idTokenResult.claims,
                authTime: idTokenResult.authTime
              });
              // Solo actualizamos el usuario si el token es válido
              setCurrentUser(user);
            } catch (tokenError) {
              console.error('❌ [AuthProvider] Error obteniendo token:', tokenError);
              setError('La sesión ha expirado. Por favor, inicia sesión nuevamente.');
              await signOut();
              return;
            }
          } else {
            setCurrentUser(null);
          }
        } catch (error) {
          console.error('❌ [AuthProvider] Error en el observador de autenticación:', error);
          setError('Error al verificar la sesión. Por favor, recarga la página.');
          setCurrentUser(null);
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.error('❌ [AuthProvider] Error en el observador de autenticación:', error);
        setError('Error de conexión. Por favor, verifica tu conexión a internet.');
        setCurrentUser(null);
        setLoading(false);
      }
    );

    return () => {
      console.log('🔒 [AuthProvider] Limpiando observador de autenticación');
      unsubscribe();
    };
  }, [signOut]);

  // Función para obtener la fecha actual en Venezuela (UTC-4)
  const getVenezuelaDate = (): Date => {
    // Usar toLocaleString con la zona horaria de América/Caracas
    const options = { timeZone: 'America/Caracas' };
    const dateStr = new Date().toLocaleString('en-US', options);
    return new Date(dateStr);
  };

  const value: AuthContextType = {
    currentUser,
    user: currentUser, // Alias para compatibilidad
    login: async (email: string, password: string) => {
      // Implementación de login si es necesaria
      throw new Error('Login no implementado');
    },
    logout: signOut, // Alias para signOut
    getVenezuelaDate,
    loading,
    error,
    signOut,
    clearError,
  };

  // Mostrar pantalla de carga mientras se verifica la autenticación
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {error && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-md shadow-lg z-50 flex items-center space-x-2">
          <span>{error}</span>
          <button 
            onClick={clearError}
            className="text-white hover:text-gray-200"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
      )}
      {children}
    </AuthContext.Provider>
  );
};
