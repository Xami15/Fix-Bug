// src/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase } from "firebase/database";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCS_s-7PEcmA2CowNI545t2xEv79rMSU2c",
  authDomain: "sep-predictive-dashboard.firebaseapp.com",
  projectId: "sep-predictive-dashboard",
  storageBucket: "sep-predictive-dashboard.firebasestorage.app",
  messagingSenderId: "414611290286",
  appId: "1:414611290286:web:6acdce7c2e78439a20d53f",
  measurementId: "G-DSE80K298C",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const analytics = getAnalytics(app);
const database = getDatabase(app);
const googleProvider = new GoogleAuthProvider();

export {
  auth,
  database,
  googleProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
};
