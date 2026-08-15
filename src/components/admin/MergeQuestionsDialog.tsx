"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { generateQuestionId } from "@/lib/utils";
import type { Session, Question } from "@/lib/types";
import { ChevronDown, ChevronUp, Layers, CheckSquare, Square, X, Check } from "lucide-react";

interface MergeQuestionsDialogProps {
  open: boolean;
  currentCode: string;
  creatorUid: string;
  onMerge: (newQuestions: Question[]) => void;
  onClose: () => void;
}

export function MergeQuestionsDialog({
  open,
  currentCode,
  creatorUid,
  onMerge,
  onClose,
}: MergeQuestionsDialogProps) {
  const [mounted, setMounted] = useState(false);
  const [show, setShow] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  // Map sessionCode -> Set of question IDs selected
  const [selectedQuestions, setSelectedQuestions] = useState<Record<string, Set<string>>>({});

  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = requestAnimationFrame(() => setShow(true));
      return () => cancelAnimationFrame(id);
    } else {
      setShow(false);
      const t = setTimeout(() => setMounted(false), 180);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Load sessions from Firestore
  useEffect(() => {
    if (!open || !creatorUid) return;

    async function fetchSessions() {
      setLoading(true);
      try {
        const q = query(
          collection(db, "sessions"),
          where("createdBy", "==", creatorUid),
          orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);
        const list: Session[] = [];
        snap.forEach((docSnap) => {
          const data = { ...docSnap.data(), code: docSnap.id } as Session;
          // Jangan tampilkan sesi saat ini dan sesi yang tidak punya soal
          if (data.code !== currentCode && data.questions && data.questions.length > 0) {
            list.push(data);
          }
        });
        setSessions(list);
      } catch (err) {
        console.error("Gagal memuat sesi:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchSessions();
  }, [open, creatorUid, currentCode]);

  // Tutup dengan tombol Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Hitung total soal terpilih
  const totalSelectedCount = Object.values(selectedQuestions).reduce(
    (acc, set) => acc + set.size,
    0
  );

  // Toggle seluruh soal dalam 1 sesi
  function toggleSession(session: Session) {
    const currentSet = selectedQuestions[session.code] || new Set();
    const allIds = session.questions.map((q) => q.id);
    const isAllSelected = allIds.length > 0 && allIds.every((id) => currentSet.has(id));

    setSelectedQuestions((prev) => {
      const next = { ...prev };
      if (isAllSelected) {
        // Uncheck all
        delete next[session.code];
      } else {
        // Check all
        next[session.code] = new Set(allIds);
      }
      return next;
    });
  }

  // Toggle satu butir soal
  function toggleQuestion(sessionCode: string, questionId: string) {
    setSelectedQuestions((prev) => {
      const currentSet = new Set(prev[sessionCode] || []);
      if (currentSet.has(questionId)) {
        currentSet.delete(questionId);
      } else {
        currentSet.add(questionId);
      }

      const next = { ...prev };
      if (currentSet.size === 0) {
        delete next[sessionCode];
      } else {
        next[sessionCode] = currentSet;
      }
      return next;
    });
  }

  function handleConfirmMerge() {
    const questionsToMerge: Question[] = [];

    sessions.forEach((s) => {
      const chosenIds = selectedQuestions[s.code];
      if (!chosenIds || chosenIds.size === 0) return;

      s.questions.forEach((q) => {
        if (chosenIds.has(q.id)) {
          // Buat salinan dengan ID baru yang unik agar tidak ada duplikasi ID
          questionsToMerge.push({
            ...q,
            id: generateQuestionId(),
          });
        }
      });
    });

    if (questionsToMerge.length > 0) {
      onMerge(questionsToMerge);
      onClose();
    }
  }

  if (!mounted) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Gabungkan Soal dari Sesi Lain"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black transition-opacity duration-150 ${
          show ? "opacity-60" : "opacity-0"
        }`}
      />

      {/* Modal Container */}
      <div
        className={`nb-card nb-white relative w-full max-w-2xl max-h-[85vh] flex flex-col p-5 sm:p-6 transition-all duration-150 ease-out z-10 ${
          show ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`}
      >
        {/* Header Modal */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b-[2.5px] border-[#1a1a1a]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Layers className="w-5 h-5 text-[var(--color-nb-mustard)] fill-current" />
              <h2 className="text-xl sm:text-2xl font-extrabold uppercase tracking-tight">
                Gabungkan Soal dari Sesi Lain
              </h2>
            </div>
            <p className="text-xs sm:text-sm font-bold text-[#1a1a1a]/70">
              Pilih sesi atau butir soal yang ingin Anda gabungkan ke dalam draft sesi ini.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="w-8 h-8 flex items-center justify-center font-extrabold text-lg border-2 border-[#1a1a1a] rounded-[6px] hover:bg-black/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content List Card Persegi Panjang */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
          {loading ? (
            <div className="py-12 text-center">
              <p className="font-extrabold text-[#1a1a1a]/70">Memuat daftar sesi...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-10 px-4 text-center border-2 border-dashed border-[#1a1a1a]/30 rounded-[8px]">
              <p className="font-extrabold text-base">Belum Ada Sesi Lain yang Memiliki Soal</p>
              <p className="text-xs font-bold text-[#1a1a1a]/60 mt-1">
                Buat atau tambahkan soal di sesi lain terlebih dahulu agar bisa digabungkan di sini.
              </p>
            </div>
          ) : (
            sessions.map((sess) => {
              const currentSet = selectedQuestions[sess.code] || new Set();
              const isAllChecked =
                sess.questions.length > 0 &&
                sess.questions.every((q) => currentSet.has(q.id));
              const isSomeChecked = currentSet.size > 0 && !isAllChecked;
              const isExpanded = expandedSession === sess.code;

              return (
                <div
                  key={sess.code}
                  className={`border-[2.5px] border-[#1a1a1a] rounded-[8px] transition-all overflow-hidden ${
                    currentSet.size > 0
                      ? "bg-[var(--paper)] shadow-[3px_3px_0px_#1a1a1a]"
                      : "bg-white hover:bg-[#fafafa]"
                  }`}
                >
                  {/* Card Persegi Panjang Baris Utama */}
                  <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Checkbox Card */}
                      <button
                        type="button"
                        onClick={() => toggleSession(sess)}
                        className="flex-shrink-0 cursor-pointer text-xl p-0.5 rounded focus:outline-none"
                      >
                        {isAllChecked ? (
                          <CheckSquare className="w-6 h-6 text-[#1a1a1a] fill-[var(--color-nb-mustard)]" />
                        ) : isSomeChecked ? (
                          <div className="w-6 h-6 border-2 border-[#1a1a1a] bg-[var(--color-nb-teal)] rounded flex items-center justify-center font-bold text-xs text-white">
                            -
                          </div>
                        ) : (
                          <Square className="w-6 h-6 text-[#1a1a1a]" />
                        )}
                      </button>

                      {/* Info Sesi */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-extrabold text-sm sm:text-base truncate">
                            {sess.title}
                          </p>
                          <Badge color="white" className="text-[10px] px-1.5 py-0">
                            #{sess.code}
                          </Badge>
                        </div>
                        <p className="text-xs font-bold text-[#1a1a1a]/60 mt-0.5">
                          {sess.questions.length} total soal
                          {currentSet.size > 0 && ` • (${currentSet.size} dipilih)`}
                        </p>
                      </div>
                    </div>

                    {/* Tombol Preview Accordion */}
                    <button
                      type="button"
                      onClick={() => setExpandedSession(isExpanded ? null : sess.code)}
                      className="flex items-center gap-1 text-xs font-extrabold px-2.5 py-1.5 border-2 border-[#1a1a1a] rounded-[6px] bg-white hover:bg-black/5 transition-colors flex-shrink-0 cursor-pointer"
                    >
                      <span>{isExpanded ? "Tutup" : "Lihat Soal"}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Accordion Detail Soal */}
                  {isExpanded && (
                    <div className="border-t-2 border-[#1a1a1a] bg-black/[0.02] p-3 sm:p-4 space-y-2 max-h-56 overflow-y-auto">
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#1a1a1a]/60 mb-2">
                        Pilih Butir Soal Spesifik:
                      </p>
                      {sess.questions.map((q, idx) => {
                        const isChecked = currentSet.has(q.id);
                        return (
                          <label
                            key={q.id}
                            className={`flex items-start gap-2.5 p-2 rounded-[6px] border border-[#1a1a1a]/30 cursor-pointer text-xs font-bold transition-colors ${
                              isChecked
                                ? "bg-[var(--color-nb-mustard)]/20 border-[#1a1a1a]"
                                : "bg-white hover:bg-black/5"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleQuestion(sess.code, q.id)}
                              className="mt-0.5 h-4 w-4 rounded border-[#1a1a1a] accent-[#1a1a1a]"
                            />
                            <div className="flex-1 leading-snug">
                              <span className="font-extrabold mr-1.5">#{idx + 1}</span>
                              <span>{q.text}</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Modal */}
        <div className="pt-4 border-t-[2.5px] border-[#1a1a1a] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs sm:text-sm font-extrabold flex items-center gap-1.5">
            {totalSelectedCount > 0 ? (
              <span className="text-[var(--color-nb-purple)] flex items-center gap-1">
                <Check className="w-4 h-4" />
                <span>{totalSelectedCount} Soal Dipilih</span>
              </span>
            ) : (
              <span className="text-[#1a1a1a]/60">Belum ada soal dipilih</span>
            )}
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              color="white"
              onClick={onClose}
              className="flex-1 sm:flex-none text-xs sm:text-sm py-2 px-4"
            >
              Batal
            </Button>
            <Button
              color="mustard"
              onClick={handleConfirmMerge}
              disabled={totalSelectedCount === 0}
              className="flex-1 sm:flex-none text-xs sm:text-sm py-2 px-4 flex items-center justify-center gap-1.5"
            >
              <Layers className="w-4 h-4" />
              <span>Gabungkan {totalSelectedCount > 0 ? `(${totalSelectedCount})` : ""} Soal</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
