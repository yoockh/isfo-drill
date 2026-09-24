import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "@/lib/firebase/verifyToken";
import { parseQuestions } from "@/lib/groq";
import { checkRateLimit } from "@/lib/ratelimit";

export const maxDuration = 60;

// Materi impor bisa panjang (daftar puluhan soal); dipotong otomatis di groq.ts.
const MAX_MATERIAL_CHARS = 60000;
const RATE_LIMIT_PER_MIN = 5;

export async function POST(request: NextRequest) {
  try {
    // 1) Autentikasi wajib.
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const idToken = authHeader.split("Bearer ")[1];
    let uid: string;
    try {
      const decoded = await verifyFirebaseIdToken(idToken);
      uid = decoded.uid;
    } catch {
      return NextResponse.json(
        { error: "Sesi login tidak valid. Silakan login ulang." },
        { status: 401 }
      );
    }

    // 2) Rate limit per guru.
    const rl = await checkRateLimit(`import:${uid}`, RATE_LIMIT_PER_MIN);
    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: `Terlalu banyak permintaan impor. Coba lagi dalam ${rl.retryAfterSec} detik.`,
        },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }

    // 3) Validasi input.
    const { material } = await request.json();
    if (!material || typeof material !== "string" || material.trim().length < 10) {
      return NextResponse.json(
        { error: "Teks soal terlalu pendek (minimal 10 karakter)" },
        { status: 400 }
      );
    }
    if (material.length > MAX_MATERIAL_CHARS) {
      return NextResponse.json(
        { error: `Teks terlalu panjang (maksimal ${MAX_MATERIAL_CHARS} karakter).` },
        { status: 400 }
      );
    }

    const questions = await parseQuestions(material);
    if (questions.length === 0) {
      return NextResponse.json(
        {
          error:
            "Tidak ada soal pilihan ganda yang terdeteksi. Pastikan teks berisi soal beserta opsi jawabannya.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({ questions });
  } catch (error: unknown) {
    console.error("Import questions error:", error);
    return NextResponse.json(
      { error: "Gagal mengimpor soal. Coba lagi." },
      { status: 500 }
    );
  }
}
