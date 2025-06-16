import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

// Configuración de Firebase desde variables de entorno
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Verificar que todas las variables de entorno estén definidas
const envVars = Object.values(firebaseConfig);
if (envVars.some(v => v === undefined)) {
  console.error('Error: Faltan variables de entorno de Firebase');
  console.table(firebaseConfig);
  throw new Error('Configuración de Firebase incompleta. Verifica tus variables de entorno.');
}

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar Analytics (solo en cliente)
let analytics;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

// Obtener instancias de Firestore y Auth
export const db = getFirestore(app);
export const auth = getAuth(app);

// Exportar tipos de Firebase para facilitar las importaciones
export { doc, collection, addDoc, updateDoc, deleteDoc, getDoc, getDocs, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
export { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
export { analytics };
