
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

// ATENCIÓN: Estas credenciales están directamente en el código.
// Para producción, utiliza variables de entorno para mayor seguridad.
const firebaseConfig = {
  apiKey: "AIzaSyChWq-3GHenAik2YNoptMXrlJbRFHzp3CA",
  authDomain: "v3ga-firebase.firebaseapp.com",
  databaseURL: "https://v3ga-firebase-default-rtdb.firebaseio.com",
  projectId: "v3ga-firebase",
  storageBucket: "v3ga-firebase.firebasestorage.app",
  messagingSenderId: "534082845337",
  appId: "1:534082845337:web:be6e04de73080a4d311608"
};

// Inicializar Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth = getAuth(app);
const database = getDatabase(app);

export { app, auth, database, firebaseConfig };
