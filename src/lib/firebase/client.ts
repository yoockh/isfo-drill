import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let _app: FirebaseApp | undefined;
let _auth: Auth | undefined;
let _db: Firestore | undefined;

function getAppInstance(): FirebaseApp {
  if (!_app) {
    _app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }
  return _app;
}

export const app = typeof window !== "undefined" ? getAppInstance() : (undefined as unknown as FirebaseApp);

export const auth: Auth = typeof window !== "undefined"
  ? (() => { if (!_auth) _auth = getAuth(getAppInstance()); return _auth; })()
  : (undefined as unknown as Auth);

export const db: Firestore = typeof window !== "undefined"
  ? (() => { if (!_db) _db = getFirestore(getAppInstance()); return _db; })()
  : (undefined as unknown as Firestore);
