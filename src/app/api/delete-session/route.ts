import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import {
  verifyTeacher,
  ownsSession,
  deleteQueryInBatches,
} from "@/lib/adminDelete";

export const maxDuration = 20;

// Hapus sesi + cascade: seluruh attempt & explanations terkait (anti-orphan).
export async function POST(request: NextRequest) {
  try {
    const uid = await verifyTeacher(request.headers.get("Authorization"));
    if (!uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionCode } = (await request.json()) ?? {};
    if (typeof sessionCode !== "string" || !/^[A-Z0-9]{6}$/.test(sessionCode)) {
      return NextResponse.json({ error: "Kode sesi tidak valid" }, { status: 400 });
    }

    if (!(await ownsSession(sessionCode, uid))) {
      return NextResponse.json({ error: "Bukan sesi milik Anda" }, { status: 403 });
    }

    // Hapus attempts & explanations terkait dulu, baru dokumen sesi.
    const attemptsDeleted = await deleteQueryInBatches(
      adminDb.collection("attempts").where("sessionCode", "==", sessionCode)
    );
    const explanationsDeleted = await deleteQueryInBatches(
      adminDb.collection("explanations").where("sessionCode", "==", sessionCode)
    );
    await adminDb.collection("sessions").doc(sessionCode).delete();

    return NextResponse.json({
      ok: true,
      attemptsDeleted,
      explanationsDeleted,
    });
  } catch (error) {
    console.error("Delete session error:", error);
    return NextResponse.json({ error: "Gagal menghapus sesi" }, { status: 500 });
  }
}
