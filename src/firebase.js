import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Substitua com suas configurações do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBh-mZCvYaGg_LrtNbb1Ho8e5AZWIauDn4",
    authDomain: "gringo-delivery.firebaseapp.com",
    projectId: "gringo-delivery",
    storageBucket: "gringo-delivery.firebasestorage.app",
    messagingSenderId: "960529837513",
    appId: "1:960529837513:web:b0d49f17513b7c2dd04c18"
  };

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { auth };
export default app;