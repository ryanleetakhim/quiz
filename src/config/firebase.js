import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// Replace with your own Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyCn9fO06A5xvo2APwJ9jz3FleYInP7unJQ",
    authDomain: "quiz-43e4a.firebaseapp.com",
    projectId: "quiz-43e4a",
    storageBucket: "quiz-43e4a.firebasestorage.app",
    messagingSenderId: "453708079864",
    appId: "1:453708079864:web:62a6ea0cb29c26f3c4110d",
    measurementId: "G-XBL97GGHK8",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
