import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signOut, 
  GoogleAuthProvider,
  onAuthStateChanged,
  User as FirebaseUser 
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAQxw4NLTDlKzmR2SGRIPZ1qWniXnXYumY",
  authDomain: "plato-244d4.firebaseapp.com",
  projectId: "plato-244d4",
  storageBucket: "plato-244d4.firebasestorage.app",
  appId: "1:1006325037584:web:0326976b8bb8ed4df6b49f",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Ensure we only initialize once
if (import.meta.hot) {
  import.meta.hot.accept();
}

// Google Auth Provider
const provider = new GoogleAuthProvider();
provider.addScope('email');
provider.addScope('profile');

// Auth functions
export const signInWithGoogle = () => {
  return signInWithRedirect(auth, provider);
};

export const handleRedirectResult = () => {
  return getRedirectResult(auth);
};

export const logout = () => {
  return signOut(auth);
};

export const onAuthStateChange = (callback: (user: FirebaseUser | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

export type { FirebaseUser };