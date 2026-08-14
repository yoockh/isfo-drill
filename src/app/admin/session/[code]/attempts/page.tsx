"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/hooks/useAuth";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Card } from "@/components/ui/Card";
import { Star } from "@/components/ui/Decor";
import type { Session, Attempt, Question } from "@/lib/types";

export default function AttemptsPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  const { user, loading: authLoading } = useAuth();

  const [session, setSession] = useState<Session | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/admin");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;

    async function loadData() {
      try {
        const sessionSnap = await getDoc(doc(db, "sessions", code));
        if (sessionSnap.exists()) {
          setSession({ ...sessionSnap.data(), code } as Session);
        }

        const q = query(
          collection(db, "attempts"),
          where("sessionCode", "==", code),
          orderBy("completedAt", "desc")
        );
        const snap = await getDocs(q);
        setAttempts(snap.docs.map((d) => d.data() as Attempt));
      } catch (error) {
        console.error("Gagal memuat data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user, code]);

  if (authLoading || loading) {
    return (
      <div className="flex-1 grid place-items-center">
        <p className="font-bold text-[#1a1a1a]/60">Memuat...</p>
      </div>
    );
  }

  const questionStats = session?.questions.map((q) => {
    const answersForQ = attempts.flatMap((a) =>
      a.answers.filter((ans) => ans.questionId === q.id)
    );
    const total = answersForQ.length;
    const correct = answersForQ.filter((a) => a.correct).length;
    const timedOut = answersForQ.filter((a) => a.selectedIndex === null).length;
    const avgTime =
      total > 0
        ? answersForQ.reduce((sum, a) => sum + a.timeSpentMs, 0) / total
        : 0;

    return { question: q, total, correct, timedOut, avgTime };
  });

  return (
    <>
      <AdminHeader />
      <main className="relative flex-1 max-w-4xl w-full mx-auto px-4 py-8 overflow-hidden">
        <Star className="hidden md:block absolute top-6 right-4 w-9 h-9" color="var(--color-teal)" />

        <div className="mb-6">
          <a
            href={`/admin/session/${code}`}
            className="inline-block text-sm font-extrabold hover:underline"
          >
            ← KEMBALI KE SESI
          </a>
          <h1 className="text-3xl font-extrabold tracking-tight mt-2">
            Hasil: {session?.title || code}
          </h1>
          <p className="font-bold text-[#1a1a1a]/70 mt-1">
            {attempts.length} attempt dari peserta
          </p>
        </div>

        {/* Rekap peserta */}
        <Card className="p-5 mb-6">
          <h2 className="font-extrabold text-lg mb-4">REKAP PESERTA</h2>

          {attempts.length === 0 ? (
            <p className="font-bold text-[#1a1a1a]/50 text-center py-6">
              Belum ada peserta yang mengerjakan.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b-[2.5px] border-[#1a1a1a]">
                    <th className="text-left font-extrabold py-2 pr-4">Tim</th>
                    <th className="text-center font-extrabold py-2 px-2">Skor</th>
                    <th className="text-center font-extrabold py-2 px-2">Benar</th>
                    <th className="text-center font-extrabold py-2 px-2">Salah</th>
                    <th className="text-center font-extrabold py-2 px-2">Timeout</th>
                    <th className="text-right font-extrabold py-2 pl-4">Waktu</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((attempt, i) => {
                    const wrong = attempt.answers.filter(
                      (a) => a.selectedIndex !== null && !a.correct
                    ).length;
                    const timedOut = attempt.answers.filter(
                      (a) => a.selectedIndex === null
                    ).length;
                    const completedDate = attempt.completedAt?.toDate?.();

                    return (
                      <tr
                        key={i}
                        className="border-b-[2px] border-[#1a1a1a]/15"
                      >
                        <td className="py-2.5 pr-4 font-extrabold">
                          {attempt.teamName}
                        </td>
                        <td className="text-center py-2.5 px-2 font-extrabold">
                          {attempt.score}/{attempt.totalQuestions}
                        </td>
                        <td className="text-center py-2.5 px-2 font-bold text-[var(--color-nb-green)]">
                          {attempt.score}
                        </td>
                        <td className="text-center py-2.5 px-2 font-bold text-[var(--color-nb-red)]">
                          {wrong}
                        </td>
                        <td className="text-center py-2.5 px-2 font-bold">
                          {timedOut}
                        </td>
                        <td className="text-right py-2.5 pl-4 font-bold text-[#1a1a1a]/60">
                          {completedDate
                            ? completedDate.toLocaleString("id-ID", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Statistik per soal */}
        {questionStats && questionStats.length > 0 && attempts.length > 0 && (
          <Card className="p-5">
            <h2 className="font-extrabold text-lg mb-4">STATISTIK PER SOAL</h2>
            <div className="space-y-3">
              {questionStats.map((stat, i) => {
                const correctPct =
                  stat.total > 0
                    ? Math.round((stat.correct / stat.total) * 100)
                    : 0;
                const barColor =
                  correctPct >= 70
                    ? "var(--color-nb-green)"
                    : correctPct >= 40
                      ? "var(--color-mustard)"
                      : "var(--color-nb-red)";

                return (
                  <div
                    key={stat.question.id}
                    className="border-[2.5px] border-[#1a1a1a] rounded-[6px] p-3"
                  >
                    <div className="flex justify-between items-start gap-3 mb-1">
                      <p className="text-sm font-bold flex-1">
                        {i + 1}. {stat.question.text}
                      </p>
                      <span className="text-sm font-extrabold">{correctPct}%</span>
                    </div>
                    <div className="flex gap-4 text-xs font-bold text-[#1a1a1a]/60 mb-2">
                      <span>
                        Benar: {stat.correct}/{stat.total}
                      </span>
                      <span>Timeout: {stat.timedOut}</span>
                      <span>Rata-rata: {(stat.avgTime / 1000).toFixed(1)}d</span>
                    </div>
                    <div className="h-3 border-[2px] border-[#1a1a1a] rounded-[5px] overflow-hidden bg-white">
                      <div
                        className="h-full"
                        style={{
                          width: `${correctPct}%`,
                          backgroundColor: barColor,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </main>
    </>
  );
}
