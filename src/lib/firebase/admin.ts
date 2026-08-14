// Tandai modul ini server-only: Firebase Admin SDK tidak boleh ikut ke
// bundle client. Import ini akan error saat build jika modul terbawa ke sisi
// client, sekaligus menjadi dokumentasi eksplisit batas server/client.
import "server-only";
import {
  initializeApp,
  getApps,
  cert,
  type App,
  type ServiceAccount,
} from "firebase-admin/app";
// CATATAN: firebase-admin/auth SENGAJA TIDAK di-import di sini karena menarik
// jwks-rsa -> require('jose') (ESM-only) -> ERR_REQUIRE_ESM di Vercel.
// Verifikasi ID token dilakukan manual via jose di lib/firebase/verifyToken.ts.
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let _app: App | null = null;
let _db: Firestore | null = null;

function getAdminApp(): App {
  if (_app) return _app;
  if (getApps().length > 0) {
    _app = getApps()[0];
    return _app;
  }

  const serviceAccount: ServiceAccount = {
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  };

  _app = initializeApp({ credential: cert(serviceAccount) });
  return _app;
}

export const adminDb: Firestore = new Proxy({} as Firestore, {
  get(_, prop) {
    if (!_db) _db = getFirestore(getAdminApp());
    return (_db as unknown as Record<string | symbol, unknown>)[prop];
  },
});
