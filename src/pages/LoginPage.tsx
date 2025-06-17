import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../firebase';
import { LockClosedIcon, EnvelopeIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    // Limpiar errores al cambiar entre login y reset
    setError('');
  }, [isResetPassword]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Por favor completa todos los campos');
      return;
    }

    // Evitar múltiples intentos de inicio de sesión simultáneos
    if (isLoading) return;
    
    setIsLoading(true);

    try {
      // Limpiar cualquier estado previo
      setError('');
      
      // Intentar iniciar sesión
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Verificar que el usuario esté autenticado antes de redirigir
      if (userCredential.user) {
        console.log('✅ Inicio de sesión exitoso, redirigiendo...');
        // Usar window.location.href para forzar una recarga completa
        window.location.href = '/';
      }
    } catch (err: any) {
      console.error('Error al iniciar sesión:', err);
      
      let errorMessage = 'Error al iniciar sesión';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        errorMessage = 'Correo o contraseña incorrectos';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Demasiados intentos. Por favor, intente más tarde o restablezca su contraseña.';
      } else if (err.code === 'auth/user-disabled') {
        errorMessage = 'Esta cuenta ha sido deshabilitada';
      } else if (err.code === 'auth/network-request-failed') {
        errorMessage = 'Error de conexión. Por favor, verifica tu conexión a internet.';
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('Por favor ingresa tu correo electrónico');
      return;
    }

    setIsLoading(true);
    
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
      setError('');
    } catch (err: any) {
      console.error('Error al enviar correo de restablecimiento:', err);
      setError(err.message || 'Error al enviar el correo de restablecimiento');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 mb-4">
              <LockClosedIcon className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">
              {isResetPassword ? 'Restablecer Contraseña' : 'Iniciar Sesión'}
            </h1>
            <p className="mt-2 text-sm text-gray-400">
              {isResetPassword 
                ? 'Ingresa tu correo para restablecer tu contraseña'
                : 'Ingresa tus credenciales para continuar'}
            </p>
          </div>
          
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-3 bg-red-500/20 border border-red-500/30 text-red-100 text-sm rounded-lg flex items-start space-x-2"
            >
              <ExclamationCircleIcon className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {resetSent ? (
            <div className="text-center py-8">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-500/20 mb-4">
                <EnvelopeIcon className="h-8 w-8 text-green-400" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">¡Correo enviado!</h3>
              <p className="text-sm text-gray-400 mb-6">
                Hemos enviado un correo a <span className="text-blue-400">{email}</span> con las instrucciones para restablecer tu contraseña.
              </p>
              <button
                onClick={() => {
                  setIsResetPassword(false);
                  setResetSent(false);
                }}
                className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                Volver al inicio de sesión
              </button>
            </div>
          ) : (
            <form onSubmit={isResetPassword ? handlePasswordReset : handleLogin} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                  Correo Electrónico
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <EnvelopeIcon className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="tucorreo@ejemplo.com"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              {!isResetPassword && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                      Contraseña
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsResetPassword(true)}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <LockClosedIcon className="h-5 w-5 text-gray-500" />
                    </div>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="••••••••"
                      autoComplete="current-password"
                      required={!isResetPassword}
                    />
                  </div>
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${isLoading ? 'opacity-80 cursor-not-allowed' : ''}`}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {isResetPassword ? 'Enviando...' : 'Iniciando sesión...'}
                    </>
                  ) : isResetPassword ? (
                    'Enviar enlace'
                  ) : (
                    'Iniciar Sesión'
                  )}
                </button>
              </div>

              {!isResetPassword && (
                <p className="mt-4 text-center text-sm text-gray-400">
                  ¿No tienes una cuenta?{' '}
                  <button
                    type="button"
                    className="text-blue-400 hover:text-blue-300 font-medium"
                    onClick={() => setError('Por favor contacta al administrador para crear una cuenta')}
                  >
                    Contáctanos
                  </button>
                </p>
              )}
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
