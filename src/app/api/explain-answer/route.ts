import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { generateExplanation } from "@/lib/groq";
import { checkRateLimit } from "@/lib/ratelimit";

export const maxDuration = 30;

const MAX_TEXT = 2000;
// Batas wajar untuk berjaga dari script yang men-trigger banyak soal sekaligus.
const RATE_LIMIT_PER_SESSION = 20; // pembahasan baru / menit / sesi
const RATE_LIMIT_PER_IP = 30; // pembahasan baru / menit / IP

function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionCode, questionId, question, options, correctIndex, selectedIndex } =
      body ?? {};

    // Validasi input.
    if (
      typeof sessionCode !== "string" ||
      !/^[A-Z0-9]{6}$/.test(sessionCode) ||
      typeof questionId !== "string" ||
      questionId.length === 0 ||
      questionId.length > 64 ||
      typeof question !== "string" ||
      question.length === 0 ||
      question.length > MAX_TEXT ||
      !Array.isArray(options) ||
      options.length !== 4 ||
      options.some((o) => typeof o !== "string" || o.length > MAX_TEXT) ||
      !Number.isInteger(correctIndex) ||
      correctIndex < 0 ||
      correctIndex > 3 ||
      !Number.isInteger(selectedIndex) ||
      selectedIndex < 0 ||
      selectedIndex > 3
    ) {
      return badRequest("Data soal tidak valid.");
    }

    // Cache key deterministik: sesi + soal + jawaban salah yang dipilih.
    // Siswa berbeda yang memilih opsi salah sama akan berbagi cache (hemat kuota).
    const cacheId = `${sessionCode}_${questionId}_${selectedIndex}`;
    const cacheRef = adminDb.collection("explanations").doc(cacheId);

    // 1) Cek cache dulu — kalau ada, tidak memanggil Groq sama sekali.
    const cached = await cacheRef.get();
    if (cached.exists) {
      return NextResponse.json({
        explanation: cached.data()?.explanation as string,
        cached: true,
      });
    }

    // 2) Rate limit (hanya untuk request yang benar-benar akan memanggil Groq).
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    const [sessRl, ipRl] = await Promise.all([
      checkRateLimit(`explain-sess:${sessionCode}`, RATE_LIMIT_PER_SESSION),
      checkRateLimit(`explain-ip:${ip}`, RATE_LIMIT_PER_IP),
    ]);
    if (!sessRl.allowed || !ipRl.allowed) {
      const retry = Math.max(sessRl.retryAfterSec, ipRl.retryAfterSec);
      return NextResponse.json(
        { error: `Terlalu banyak permintaan. Coba lagi dalam ${retry} detik.` },
        { status: 429, headers: { "Retry-After": String(retry) } }
      );
    }

    // 3) Generate + simpan ke cache.
    const explanation = await generateExplanation({
      question,
      options,
      correctIndex,
      selectedIndex,
    });

    await cacheRef.set({
      explanation,
      sessionCode,
      questionId,
      selectedIndex,
      createdAt: new Date(),
    });

    return NextResponse.json({ explanation, cached: false });
  } catch (error) {
    console.error("Explain answer error:", error);
    return NextResponse.json(
      { error: "Gagal memuat pembahasan. Coba lagi." },
      { status: 500 }
    );
  }
}
