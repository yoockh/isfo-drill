import { adminAuth, adminDb } from "@/lib/firebase/admin";
import type { Query } from "firebase-admin/firestore";

/*
  Helper server-side untuk aksi hapus milik guru.
  Verifikasi ID token + kepemilikan sesi dilakukan di sini agar penghapusan
  (attempt/sesi) memakai Admin SDK — bersih dari data orphan (termasuk koleksi
  explanations yang tidak bisa diakses dari client) tanpa melonggarkan rules.
*/

export async function verifyTeacher(authHeader: string | null): Promise<string | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const idToken = authHeader.split("Bearer ")[1];
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    return decoded.uid;
  } catch {
    return null;
  }
}

/** Pastikan sesi ada dan dimiliki uid. Mengembalikan true bila boleh. */
export async function ownsSession(sessionCode: string, uid: string): Promise<boolean> {
  const snap = await adminDb.collection("sessions").doc(sessionCode).get();
  return snap.exists && snap.data()?.createdBy === uid;
}

/** Hapus semua dokumen hasil sebuah query, dibagi per batch (aman >500). */
export async function deleteQueryInBatches(query: Query): Promise<number> {
  const snap = await query.get();
  let deleted = 0;
  const docs = snap.docs;
  for (let i = 0; i < docs.length; i += 400) {
    const batch = adminDb.batch();
    for (const d of docs.slice(i, i + 400)) batch.delete(d.ref);
    await batch.commit();
    deleted += Math.min(400, docs.length - i);
  }
  return deleted;
}
