"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { QuizRunner } from "@/components/quiz/QuizRunner";
import type { Session } from "@/lib/types";

export default function QuizPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const code = params.code as string;
  const teamName = decodeURIComponent(searchParams.get("team") || "Anonim");

  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSession() {
      try {
        const sessionRef = doc(db, "sessions", code);
        const snap = await getDoc(sessionRef);

        if (!snap.exists()) {
          setError("Sesi tidak ditemukan");
          return;
        }

        const data = snap.data() as Session;
        if (!data.published) {
          setError("Sesi belum dipublikasikan");
          return;
        }

        if (!data.questions || data.questions.length === 0) {
          setError("Sesi belum memiliki soal");
          return;
        }

        setSession(data);
      } catch {
        setError("Gagal memuat sesi");
      } finally {
        setLoading(false);
      }
    }

    loadSession();
  }, [code]);

  if (loading) {
    return (
      <div className="flex-1 grid place-items-center bg-[var(--paper)]">
        <p className="text-lg font-bold text-[#1a1a1a]/60">Memuat soal...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 grid place-items-center px-4 bg-[var(--paper)]">
        <div className="nb-card nb-red p-8 text-center max-w-sm">
          <p className="font-extrabold text-lg mb-5">{error}</p>
          <a href="/" className="nb-btn nb-white nb-btn-lg">
            Kembali
          </a>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <QuizRunner
      questions={session.questions}
      timerSeconds={session.timerSeconds}
      sessionCode={code}
      teamName={teamName}
    />
  );
}
