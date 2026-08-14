import "server-only";
import { createRemoteJWKSet, jwtVerify } from "jose";

/*
  Verifikasi Firebase ID token secara manual pakai `jose` (ESM, di-import
  langsung — bukan lewat require). Ini menggantikan firebase-admin/auth yang
  menarik jwks-rsa; jwks-rsa melakukan require('jose') sedangkan jose v6
  ESM-only -> ERR_REQUIRE_ESM di runtime Vercel. Dengan jalur ini jwks-rsa
  tidak pernah dimuat.
*/

const JWKS = createRemoteJWKSet(
  new URL(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
  )
);

function projectId(): string {
  const id =
    process.env.FIREBASE_ADMIN_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!id) throw new Error("Project ID Firebase tidak dikonfigurasi");
  return id;
}

export async function verifyFirebaseIdToken(
  token: string
): Promise<{ uid: string }> {
  const pid = projectId();
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: `https://securetoken.google.com/${pid}`,
    audience: pid,
    algorithms: ["RS256"],
  });
  if (!payload.sub) throw new Error("Token tidak memiliki subject (uid)");
  return { uid: payload.sub };
}
