import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { generateQuestions } from "@/lib/groq";
import { checkRateLimit } from "@/lib/ratelimit";

export const maxDuration = 30;

// Batas input untuk mencegah pemborosan token/kuota dalam satu request.
const MAX_MATERIAL_CHARS = 8000;
const MAX_QUESTIONS = 30;
// Penggunaan wajar: guru tidak generate soal berkali-kali dalam semenit.
const RATE_LIMIT_PER_MIN = 5;

export async function POST(request: NextRequest) {
  try {
    // 1) Autentikasi wajib: hanya guru yang login boleh memanggil endpoint ini.
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    let uid: string;
    try {
      const decoded = await adminAuth.verifyIdToken(idToken);
      uid = decoded.uid;
    } catch {
      return NextResponse.json(
        { error: "Sesi login tidak valid. Silakan login ulang." },
        { status: 401 }
      );
    }

    // 2) Rate limiting per guru (per uid).
    const rl = await checkRateLimit(`gen:${uid}`, RATE_LIMIT_PER_MIN);
    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: `Terlalu banyak permintaan generate. Coba lagi dalam ${rl.retryAfterSec} detik.`,
        },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }

    // 3) Validasi input.
    const { material, count } = await request.json();

    if (!material || typeof material !== "string" || material.trim().length < 10) {
      return NextResponse.json(
        { error: "Materi terlalu pendek (minimal 10 karakter)" },
        { status: 400 }
      );
    }
    if (material.length > MAX_MATERIAL_CHARS) {
      return NextResponse.json(
        {
          error: `Materi terlalu panjang (maksimal ${MAX_MATERIAL_CHARS} karakter).`,
        },
        { status: 400 }
      );
    }

    const questionCount = Math.min(Math.max(Number(count) || 10, 1), MAX_QUESTIONS);
    const questions = await generateQuestions(material.trim(), questionCount);

    return NextResponse.json({ questions });
  } catch (error: unknown) {
    console.error("Generate questions error:", error);
    return NextResponse.json(
      { error: "Gagal generate soal. Coba lagi." },
      { status: 500 }
    );
  }
}
