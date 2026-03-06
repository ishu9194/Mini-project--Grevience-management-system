import { initializeApp } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

import { getAuth } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { getFirestore } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC384YFO8-0ejFraSyhSD4P8jp_EMQUZBk",
  authDomain: "student-grievance-e3c67.firebaseapp.com",
  projectId: "student-grievance-e3c67",
  storageBucket: "student-grievance-e3c67.firebasestorage.app",
  messagingSenderId: "602169659018",
  appId: "1:602169659018:web:98e92640ebaa72b6e62773"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);