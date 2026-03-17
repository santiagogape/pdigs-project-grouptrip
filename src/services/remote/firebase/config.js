import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD5sxAqmABm0Mw6Z956Y03Coia4QSM0H0M",
  authDomain: "triply-dd509.firebaseapp.com",
  projectId: "triply-dd509",
  storageBucket: "triply-dd509.firebasestorage.app",
  messagingSenderId: "609285574850",
  appId: "1:609285574850:web:20b3fc66aae744810bab5b",
  measurementId: "G-90BV45FQPN"
};

// Inicializamos Firebase
const app = initializeApp(firebaseConfig);

// Exportamos los servicios que necesites
export { app };
export const db = getFirestore(app);
export const auth = getAuth(app);