import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

/*
  Rate limiter sederhana berbasis Firestore (fixed-window).
  Cocok untuk Vercel serverless yang stateless antar-invocation karena state
  disimpan di Firestore (via Admin SDK, bypass security rules — koleksi
  rateLimits tidak pernah diakses dari client). Tidak butuh layanan eksternal
  (Upstash/Vercel KV).

  Setiap window = potongan waktu selebar windowMs. Dokumen counter dibuat per
  (key, window). Field expireAt disertakan agar (opsional) bisa dibersihkan
  otomatis lewat Firestore TTL policy pada field expireAt.
*/

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs = 60_000
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowIndex = Math.floor(now / windowMs);
  const windowEnd = (windowIndex + 1) * windowMs;
  const docId = `${key}:${windowIndex}`;
  const ref = adminDb.collection("rateLimits").doc(docId);

  try {
    const count = await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const current = snap.exists ? ((snap.data()?.count as number) ?? 0) : 0;
      const next = current + 1;
      tx.set(
        ref,
        {
          count: FieldValue.increment(1),
          expireAt: new Date(windowEnd + windowMs), // TTL: window + 1 buffer
        },
        { merge: true }
      );
      return next;
    });

    const allowed = count <= limit;
    return {
      allowed,
      remaining: Math.max(0, limit - count),
      retryAfterSec: Math.ceil((windowEnd - now) / 1000),
    };
  } catch (err) {
    // Fail-open agar gangguan Firestore tidak memblokir pengguna sah,
    // tapi tetap dicatat untuk investigasi.
    console.error("Rate limit check gagal:", err);
    return { allowed: true, remaining: limit, retryAfterSec: 0 };
  }
}
