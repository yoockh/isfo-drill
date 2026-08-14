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
import { Pagination } from "@/components/ui/Pagination";
import { Star } from "@/components/ui/Decor";
import type { Session, Attempt } from "@/lib/types";

const OPTION_LABELS = ["A", "B", "C", "D"];
const PAGE_SIZE = 5;

export default function AttemptsPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  const { user, loading: authLoading } = useAuth();

  const [session, setSession] = useState<Session | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [page, setPage] = useState(0);

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

  const pageCount = Math.ceil(attempts.length / PAGE_SIZE);
  const pageStart = page * PAGE_SIZE;
  const pageItems = attempts.slice(pageStart, pageStart + PAGE_SIZE);

  const selected = attempts[selectedIndex];
  // Breakdown jawaban KHUSUS tim yang sedang dipilih (bukan agregat).
  const answerByQuestion = new Map(
    selected?.answers.map((a) => [a.questionId, a]) ?? []
  );

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
          <h2 className="font-extrabold text-lg mb-1">REKAP PESERTA</h2>
          <p className="text-sm font-bold text-[#1a1a1a]/60 mb-4">
            Klik baris tim untuk melihat rincian jawabannya di bawah.
          </p>

          {attempts.length === 0 ? (
            <p className="font-bold text-[#1a1a1a]/50 text-center py-6">
              Belum ada peserta yang mengerjakan.
            </p>
          ) : (
            <>
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
                    {pageItems.map((attempt, i) => {
                      const globalIndex = pageStart + i;
                      const isActive = globalIndex === selectedIndex;
                      const wrong = attempt.answers.filter(
                        (a) => a.selectedIndex !== null && !a.correct
                      ).length;
                      const timedOut = attempt.answers.filter(
                        (a) => a.selectedIndex === null
                      ).length;
                      const completedDate = attempt.completedAt?.toDate?.();

                      return (
                        <tr
                          key={globalIndex}
                          onClick={() => setSelectedIndex(globalIndex)}
                          className={`cursor-pointer border-b-[2px] border-[#1a1a1a]/15 transition-colors ${
                            isActive ? "nb-mustard" : "hover:bg-[#1a1a1a]/5"
                          }`}
                        >
                          <td className="py-2.5 pr-4 font-extrabold">
                            {isActive && <span className="mr-1">▸</span>}
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

              {attempts.length > PAGE_SIZE && (
                <Pagination
                  page={page}
                  pageCount={pageCount}
                  onChange={setPage}
                  className="mt-5"
                />
              )}
            </>
          )}
        </Card>

        {/* Rincian jawaban tim terpilih */}
        {selected && session && (
          <Card className="p-5">
            <h2 className="font-extrabold text-lg mb-1">
              RINCIAN JAWABAN
            </h2>
            <p className="text-sm font-bold text-[#1a1a1a]/60 mb-4">
              Tim: <span className="nb-badge nb-mustard">{selected.teamName}</span>{" "}
              &middot; Skor {selected.score}/{selected.totalQuestions}
            </p>

            <div className="space-y-3">
              {session.questions.map((q, i) => {
                const ans = answerByQuestion.get(q.id);
                const timedOut = !ans || ans.selectedIndex === null;
                const isCorrect = ans?.correct ?? false;

                return (
                  <div
                    key={q.id}
                    className={`border-[2.5px] border-[#1a1a1a] rounded-[6px] p-3 ${
                      isCorrect ? "nb-green" : "nb-red"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-3 mb-2">
                      <p className="text-sm font-extrabold flex-1">
                        {i + 1}. {q.text}
                      </p>
                      <span className="nb-badge nb-white shrink-0">
                        {isCorrect ? "BENAR" : timedOut ? "TIMEOUT" : "SALAH"}
                      </span>
                    </div>
                    <div className="text-xs font-bold space-y-0.5">
                      <p>
                        Jawaban tim:{" "}
                        {timedOut
                          ? "— (tidak dijawab)"
                          : `${OPTION_LABELS[ans!.selectedIndex!]}. ${
                              q.options[ans!.selectedIndex!]
                            }`}
                      </p>
                      <p>
                        Jawaban benar:{" "}
                        {`${OPTION_LABELS[q.correctIndex]}. ${q.options[q.correctIndex]}`}
                      </p>
                      <p className="text-[#1a1a1a]/60">
                        {timedOut
                          ? "Waktu habis"
                          : `Dijawab dalam ${(ans!.timeSpentMs / 1000).toFixed(1)} detik`}
                      </p>
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
