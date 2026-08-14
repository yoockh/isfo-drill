import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // firebase-admin menarik jwks-rsa -> jose (ESM-only). Bila di-bundle oleh
  // Turbopack (default bundler Next 16), jose salah di-resolve ke entry ESM
  // walau dipanggil lewat require(), memicu ERR_REQUIRE_ESM di serverless
  // Vercel. Mengeksternalkan firebase-admin membiarkan Node me-resolve jose
  // lewat export condition "require" (build CJS) -> tidak error.
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
