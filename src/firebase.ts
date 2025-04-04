import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDGYniekk40H1BdDvt8vIrgxR1YQy-X7XY",
  authDomain: "domenico-gestionale.firebaseapp.com",
  projectId: "domenico-gestionale",
  storageBucket: "domenico-gestionale.firebasestorage.app",
  messagingSenderId: "1087236065408",
  appId: "1:1087236065408:web:6d32cdb6dc7da6a90efe65"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app); 