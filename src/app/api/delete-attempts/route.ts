import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import {
  verifyTeacher,
  ownsSession,
  deleteQueryInBatches,
} from "@/lib/adminDelete";

export const maxDuration = 20;

// Hapus satu attempt (body.attemptId) atau semua attempt sebuah sesi.
export async function POST(request: NextRequest) {
  try {
    const uid = await verifyTeacher(request.headers.get("Authorization"));
    if (!uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionCode, attemptId } = (await request.json()) ?? {};
    if (typeof sessionCode !== "string" || !/^[A-Z0-9]{6}$/.test(sessionCode)) {
      return NextResponse.json({ error: "Kode sesi tidak valid" }, { status: 400 });
    }

    if (!(await ownsSession(sessionCode, uid))) {
      return NextResponse.json({ error: "Bukan sesi milik Anda" }, { status: 403 });
    }

    // Hapus satu attempt tertentu.
    if (attemptId) {
      if (typeof attemptId !== "string" || attemptId.length > 200) {
        return NextResponse.json({ error: "attemptId tidak valid" }, { status: 400 });
      }
      const ref = adminDb.collection("attempts").doc(attemptId);
      const snap = await ref.get();
      if (!snap.exists) {
        return NextResponse.json({ deleted: 0 });
      }
      // Pastikan attempt benar-benar milik sesi tersebut.
      if (snap.data()?.sessionCode !== sessionCode) {
        return NextResponse.json({ error: "Attempt bukan milik sesi ini" }, { status: 403 });
      }
      await ref.delete();
      return NextResponse.json({ deleted: 1 });
    }

    // Hapus semua attempt untuk sesi.
    const deleted = await deleteQueryInBatches(
      adminDb.collection("attempts").where("sessionCode", "==", sessionCode)
    );
    return NextResponse.json({ deleted });
  } catch (error) {
    console.error("Delete attempts error:", error);
    return NextResponse.json({ error: "Gagal menghapus" }, { status: 500 });
  }
}
