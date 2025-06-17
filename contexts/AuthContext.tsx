import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../firebase';

type AuthContextType = {
  currentUser: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔐 [AuthProvider] Configurando observador de autenticación...');
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('👤 [AuthProvider] Estado de autenticación cambiado:', 
        user ? `Usuario autenticado (${user.email}, UID: ${user.uid})` : 'Usuario no autenticado'
      );
      
      setCurrentUser(user);
      setLoading(false);
      
      if (user) {
        // Verificar si el token está disponible
        user.getIdTokenResult()
          .then((idTokenResult) => {
            console.log('🔑 [AuthProvider] Token info:', {
              tokenExpiration: idTokenResult.expirationTime,
              claims: idTokenResult.claims,
              authTime: idTokenResult.authTime
            });
          })
          .catch(error => {
            console.error('❌ [AuthProvider] Error obteniendo token:', error);
          });
      }
    }, (error) => {
      console.error('❌ [AuthProvider] Error en el observador de autenticación:', error);
      setLoading(false);
    });

    return () => {
      console.log('🔒 [AuthProvider] Limpiando observador de autenticación');
      unsubscribe();
    };
  }, []);

  const value = {
    currentUser,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
