
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBWJmndz8RpKxW2DwPbl6P--G6QhDTqlqA",
  authDomain: "spt-score.firebaseapp.com",
  projectId: "spt-score",
  storageBucket: "spt-score.firebasestorage.app",
  messagingSenderId: "159154369203",
  appId: "1:159154369203:web:7cfb79bc3b65bb4d75b6c6",
  measurementId: "G-ZH8KVVWWK0"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Export initialized services
export { auth, db };
