
import { initializeApp } from "firebase/app";

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

// Export just the initialized app
export { app };
