"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";
import { Trash2, Search } from "lucide-react";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/hooks/useAuth";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Star } from "@/components/ui/Decor";
import type { Session, Attempt } from "@/lib/types";

type AttemptWithId = Attempt & { id: string };

const OPTION_LABELS = ["A", "B", "C", "D"];
const PAGE_SIZE = 5;

export default function AttemptsPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  const { user, loading: authLoading } = useAuth();

  const [session, setSession] = useState<Session | null>(null);
  const [attempts, setAttempts] = useState<AttemptWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  // Hapus
  const [deleteTarget, setDeleteTarget] = useState<AttemptWithId | null>(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState("");

  // Search navigator
  const [searchTerm, setSearchTerm] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

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
        const data = snap.docs.map((d) => ({ ...(d.data() as Attempt), id: d.id }));
        setAttempts(data);
        setSelectedId(data[0]?.id ?? null);
      } catch (error) {
        console.error("Gagal memuat data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user, code]);

  // Jaga agar halaman pagination tetap valid setelah penghapusan.
  useEffect(() => {
    const pc = Math.ceil(attempts.length / PAGE_SIZE);
    if (page > 0 && page >= pc) setPage(Math.max(0, pc - 1));
  }, [attempts.length, page]);

  // Jaga agar selection tetap valid.
  useEffect(() => {
    if (attempts.length === 0) {
      setSelectedId(null);
    } else if (!attempts.some((a) => a.id === selectedId)) {
      setSelectedId(attempts[0].id);
    }
  }, [attempts, selectedId]);

  async function confirmDeleteSingle() {
    if (!deleteTarget) return;
    setDeleting(true);
    setActionError("");
    try {
      // Hapus langsung via Firestore (rules mengizinkan guru pemilik sesi).
      await deleteDoc(doc(db, "attempts", deleteTarget.id));
      setAttempts((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error("Gagal menghapus hasil:", err);
      setActionError("Gagal menghapus hasil. Coba lagi.");
    } finally {
      setDeleting(false);
    }
  }

  async function confirmDeleteAll() {
    setDeleting(true);
    setActionError("");
    try {
      // Hapus semua attempt (yang sudah dimuat) dalam batch ber-chunk 400.
      const ids = attempts.map((a) => a.id);
      for (let i = 0; i < ids.length; i += 400) {
        const batch = writeBatch(db);
        for (const id of ids.slice(i, i + 400)) {
          batch.delete(doc(db, "attempts", id));
        }
        await batch.commit();
      }
      setAttempts([]);
      setDeleteAllOpen(false);
    } catch (err) {
      console.error("Gagal menghapus riwayat:", err);
      setActionError("Gagal menghapus riwayat. Coba lagi.");
    } finally {
      setDeleting(false);
    }
  }

  function jumpToTeam(attempt: AttemptWithId) {
    const idx = attempts.findIndex((a) => a.id === attempt.id);
    if (idx >= 0) setPage(Math.floor(idx / PAGE_SIZE));
    setSelectedId(attempt.id);
    setSearchTerm("");
    setShowSuggestions(false);
  }

  const suggestions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return [];
    return attempts
      .filter((a) => a.teamName.toLowerCase().includes(term))
      .slice(0, 8);
  }, [searchTerm, attempts]);

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

  const selected = attempts.find((a) => a.id === selectedId) ?? attempts[0] ?? null;
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

        {actionError && (
          <Card color="red" className="p-3 mb-4 font-bold text-sm">
            {actionError}
          </Card>
        )}

        {/* Rekap peserta */}
        <Card className="p-5 mb-6">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
            <h2 className="font-extrabold text-lg">REKAP PESERTA</h2>
            {attempts.length > 0 && (
              <Button
                color="red"
                onClick={() => setDeleteAllOpen(true)}
                className="text-xs py-1.5 px-2.5"
              >
                <Trash2 size={14} strokeWidth={2.5} /> Hapus Semua Riwayat
              </Button>
            )}
          </div>
          <p className="text-sm font-bold text-[#1a1a1a]/60 mb-4">
            Klik baris tim untuk melihat rincian jawabannya di bawah.
          </p>

          {attempts.length === 0 ? (
            <p className="font-bold text-[#1a1a1a]/50 text-center py-6">
              Belum ada peserta yang mengerjakan.
            </p>
          ) : (
            <>
              {/* Search navigator */}
              <div className="relative mb-4 max-w-xs">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1a1a1a]/50">
                    <Search size={18} strokeWidth={2.5} />
                  </span>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    placeholder="Cari & lompat ke tim..."
                    className="nb-input pl-10 text-sm"
                  />
                </div>
                {showSuggestions && searchTerm.trim() && (
                  <div className="nb-card nb-white absolute z-20 mt-1.5 w-full p-1.5 origin-top animate-[nbpop_120ms_ease-out]">
                    {suggestions.length === 0 ? (
                      <p className="text-sm font-bold text-[#1a1a1a]/50 px-2 py-1.5">
                        Tidak ditemukan
                      </p>
                    ) : (
                      suggestions.map((a) => (
                        <button
                          key={a.id}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => jumpToTeam(a)}
                          className="w-full text-left px-2 py-1.5 rounded-[5px] font-bold text-sm hover:bg-[var(--color-mustard)] transition-colors flex items-center justify-between gap-2"
                        >
                          <span>{a.teamName}</span>
                          <span className="text-xs text-[#1a1a1a]/50">
                            {a.score}/{a.totalQuestions}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b-[2.5px] border-[#1a1a1a]">
                      <th className="text-left font-extrabold py-2 pr-4">Tim</th>
                      <th className="text-center font-extrabold py-2 px-2">Skor</th>
                      <th className="text-center font-extrabold py-2 px-2">Benar</th>
                      <th className="text-center font-extrabold py-2 px-2">Salah</th>
                      <th className="text-center font-extrabold py-2 px-2">Timeout</th>
                      <th className="text-right font-extrabold py-2 px-2">Waktu</th>
                      <th className="w-8" aria-label="Aksi" />
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((attempt) => {
                      const isActive = attempt.id === selectedId;
                      const wrong = attempt.answers.filter(
                        (a) => a.selectedIndex !== null && !a.correct
                      ).length;
                      const timedOut = attempt.answers.filter(
                        (a) => a.selectedIndex === null
                      ).length;
                      const completedDate = attempt.completedAt?.toDate?.();

                      return (
                        <tr
                          key={attempt.id}
                          onClick={() => setSelectedId(attempt.id)}
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
                          <td className="text-right py-2.5 px-2 font-bold text-[#1a1a1a]/60 whitespace-nowrap">
                            {completedDate
                              ? completedDate.toLocaleString("id-ID", {
                                  day: "2-digit",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "-"}
                          </td>
                          <td className="py-2.5 pl-1 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTarget(attempt);
                              }}
                              aria-label={`Hapus hasil ${attempt.teamName}`}
                              title="Hapus hasil ini"
                              className="grid place-items-center w-7 h-7 rounded-[5px] text-[var(--color-nb-red)] hover:bg-[var(--color-nb-red)] hover:text-white transition-colors"
                            >
                              <Trash2 size={16} strokeWidth={2.5} />
                            </button>
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
            <h2 className="font-extrabold text-lg mb-1">RINCIAN JAWABAN</h2>
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

      {/* Dialog hapus satu */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Hapus hasil pengerjaan?"
        message={
          deleteTarget
            ? `Hapus hasil pengerjaan ${deleteTarget.teamName}? Tindakan ini tidak bisa dibatalkan.`
            : ""
        }
        confirmLabel="Ya, Hapus"
        confirmColor="red"
        loading={deleting}
        onConfirm={confirmDeleteSingle}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Dialog hapus semua (dengan jeda anti salah-klik) */}
      <ConfirmDialog
        open={deleteAllOpen}
        title="Hapus SEMUA riwayat?"
        message={`Hapus SEMUA riwayat pengerjaan untuk sesi ini? ${attempts.length} hasil akan dihapus permanen dan tidak bisa dikembalikan.`}
        confirmLabel="Ya, Hapus Semua"
        confirmColor="red"
        confirmDelayMs={1000}
        loading={deleting}
        onConfirm={confirmDeleteAll}
        onCancel={() => setDeleteAllOpen(false)}
      />
    </>
  );
}
