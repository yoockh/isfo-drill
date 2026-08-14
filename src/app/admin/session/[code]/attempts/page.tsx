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
        <p className="text-slate-500">Memuat...</p>
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
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
        <div className="mb-6">
          <a
            href={`/admin/session/${code}`}
            className="text-sm text-slate-500 hover:text-primary-700"
          >
            ← Kembali ke sesi
          </a>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">
            Hasil: {session?.title || code}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {attempts.length} attempt dari peserta
          </p>
        </div>

        {/* Rekap peserta */}
        <section className="card p-5 mb-6">
          <h2 className="font-bold text-slate-900 mb-4">Rekap Peserta</h2>

          {attempts.length === 0 ? (
            <p className="text-slate-400 text-center py-6">
              Belum ada peserta yang mengerjakan.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-200">
                    <th className="text-left font-medium py-2 pr-4">Tim</th>
                    <th className="text-center font-medium py-2 px-2">Skor</th>
                    <th className="text-center font-medium py-2 px-2">Benar</th>
                    <th className="text-center font-medium py-2 px-2">Salah</th>
                    <th className="text-center font-medium py-2 px-2">Timeout</th>
                    <th className="text-right font-medium py-2 pl-4">Waktu</th>
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
                      <tr key={i} className="border-b border-slate-100">
                        <td className="py-2.5 pr-4 font-medium text-slate-900">
                          {attempt.teamName}
                        </td>
                        <td className="text-center py-2.5 px-2 font-bold text-slate-900">
                          {attempt.score}/{attempt.totalQuestions}
                        </td>
                        <td className="text-center py-2.5 px-2 text-primary-600">
                          {attempt.score}
                        </td>
                        <td className="text-center py-2.5 px-2 text-red-600">
                          {wrong}
                        </td>
                        <td className="text-center py-2.5 px-2 text-amber-500">
                          {timedOut}
                        </td>
                        <td className="text-right py-2.5 pl-4 text-slate-400">
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
        </section>

        {/* Statistik per soal */}
        {questionStats && questionStats.length > 0 && attempts.length > 0 && (
          <section className="card p-5">
            <h2 className="font-bold text-slate-900 mb-4">Statistik Per Soal</h2>
            <div className="space-y-3">
              {questionStats.map((stat, i) => {
                const correctPct =
                  stat.total > 0
                    ? Math.round((stat.correct / stat.total) * 100)
                    : 0;
                const barColor =
                  correctPct >= 70
                    ? "bg-primary-500"
                    : correctPct >= 40
                      ? "bg-amber-400"
                      : "bg-red-500";
                const pctColor =
                  correctPct >= 70
                    ? "text-primary-700"
                    : correctPct >= 40
                      ? "text-amber-600"
                      : "text-red-600";

                return (
                  <div
                    key={stat.question.id}
                    className="border border-slate-200 rounded-[var(--radius-control)] p-3"
                  >
                    <div className="flex justify-between items-start gap-3 mb-1">
                      <p className="text-sm font-medium text-slate-800 flex-1">
                        {i + 1}. {stat.question.text}
                      </p>
                      <span className={`text-sm font-bold ${pctColor}`}>
                        {correctPct}%
                      </span>
                    </div>
                    <div className="flex gap-4 text-xs text-slate-400 mb-2">
                      <span>
                        Benar: {stat.correct}/{stat.total}
                      </span>
                      <span>Timeout: {stat.timedOut}</span>
                      <span>Rata-rata: {(stat.avgTime / 1000).toFixed(1)}d</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barColor}`}
                        style={{ width: `${correctPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
