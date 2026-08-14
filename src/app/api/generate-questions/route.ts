import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { generateQuestions } from "@/lib/groq";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    await adminAuth.verifyIdToken(idToken);

    const { material, count } = await request.json();

    if (!material || typeof material !== "string" || material.trim().length < 10) {
      return NextResponse.json(
        { error: "Materi terlalu pendek (minimal 10 karakter)" },
        { status: 400 }
      );
    }

    const questionCount = Math.min(Math.max(count || 10, 1), 30);
    const questions = await generateQuestions(material.trim(), questionCount);

    return NextResponse.json({ questions });
  } catch (error: unknown) {
    console.error("Generate questions error:", error);

    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "auth/id-token-expired"
    ) {
      return NextResponse.json({ error: "Token expired" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Gagal generate soal. Coba lagi." },
      { status: 500 }
    );
  }
}
