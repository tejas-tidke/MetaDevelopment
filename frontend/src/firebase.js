// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Replace with your actual Firebase config values from console
const firebaseConfig = {
  apiKey: "AIzaSyDiLMEr0CM8wQDWpOmfKK5oEa5fm6XwszU",
  authDomain: "sample-app-9e5fc.firebaseapp.com",
  projectId: "sample-app-9e5fc",
  storageBucket: "sample-app-9e5fc.firebasestorage.app",
  messagingSenderId: "993888905229",
  appId: "1:993888905229:web:d5fa9eb875057f791b0d44",
  measurementId: "G-XCT14TLKDW"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
