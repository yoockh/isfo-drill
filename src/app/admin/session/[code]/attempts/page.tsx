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
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">Memuat...</p>
      </div>
    );
  }

  const questionsMap = new Map<string, Question>();
  session?.questions.forEach((q) => questionsMap.set(q.id, q));

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
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <a
          href={`/admin/session/${code}`}
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          &larr; Kembali
        </a>
        <h1 className="text-2xl font-bold">
          Hasil: {session?.title || code}
        </h1>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-8">
        <h2 className="text-lg font-bold mb-1">Ringkasan</h2>
        <p className="text-gray-500 text-sm mb-4">
          {attempts.length} attempt dari peserta
        </p>

        {attempts.length === 0 ? (
          <p className="text-gray-400">Belum ada peserta yang mengerjakan.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 pr-4">Tim</th>
                  <th className="text-center py-2 px-2">Skor</th>
                  <th className="text-center py-2 px-2">Benar</th>
                  <th className="text-center py-2 px-2">Salah</th>
                  <th className="text-center py-2 px-2">Timeout</th>
                  <th className="text-right py-2 pl-4">Waktu</th>
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
                      className="border-b border-gray-100 dark:border-gray-800"
                    >
                      <td className="py-2 pr-4 font-medium">
                        {attempt.teamName}
                      </td>
                      <td className="text-center py-2 px-2 font-bold">
                        {attempt.score}/{attempt.totalQuestions}
                      </td>
                      <td className="text-center py-2 px-2 text-green-600">
                        {attempt.score}
                      </td>
                      <td className="text-center py-2 px-2 text-red-600">
                        {wrong}
                      </td>
                      <td className="text-center py-2 px-2 text-yellow-600">
                        {timedOut}
                      </td>
                      <td className="text-right py-2 pl-4 text-gray-500">
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
      </div>

      {questionStats && questionStats.length > 0 && attempts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-bold mb-4">Statistik Per Soal</h2>
          <div className="space-y-3">
            {questionStats.map((stat, i) => {
              const correctPct =
                stat.total > 0
                  ? Math.round((stat.correct / stat.total) * 100)
                  : 0;

              return (
                <div
                  key={stat.question.id}
                  className="p-3 border border-gray-200 dark:border-gray-700 rounded-xl"
                >
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-sm font-medium flex-1">
                      {i + 1}. {stat.question.text}
                    </p>
                    <span
                      className={`text-sm font-bold ml-2 ${
                        correctPct >= 70
                          ? "text-green-600"
                          : correctPct >= 40
                            ? "text-yellow-600"
                            : "text-red-600"
                      }`}
                    >
                      {correctPct}%
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span>Benar: {stat.correct}/{stat.total}</span>
                    <span>Timeout: {stat.timedOut}</span>
                    <span>Rata-rata: {(stat.avgTime / 1000).toFixed(1)}d</span>
                  </div>
                  <div className="mt-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        correctPct >= 70
                          ? "bg-green-500"
                          : correctPct >= 40
                            ? "bg-yellow-500"
                            : "bg-red-500"
                      }`}
                      style={{ width: `${correctPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
