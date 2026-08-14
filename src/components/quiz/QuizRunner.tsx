"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useQuiz } from "@/hooks/useQuiz";
import { useCountdown } from "@/hooks/useCountdown";
import { Timer } from "@/components/ui/Timer";
import type { Question, Attempt } from "@/lib/types";

interface QuizRunnerProps {
  questions: Question[];
  timerSeconds: number;
  sessionCode: string;
  teamName: string;
}

const OPTION_LABELS = ["A", "B", "C", "D"];

export function QuizRunner({
  questions,
  timerSeconds,
  sessionCode,
  teamName,
}: QuizRunnerProps) {
  const quiz = useQuiz(questions);
  const countdown = useCountdown(timerSeconds, quiz.phase === "answering");
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutHandledRef = useRef(false);

  useEffect(() => {
    if (quiz.phase === "answering") {
      timeoutHandledRef.current = false;
    }
  }, [quiz.phase, quiz.currentIndex]);

  useEffect(() => {
    if (
      countdown.isDone &&
      quiz.phase === "answering" &&
      !timeoutHandledRef.current
    ) {
      timeoutHandledRef.current = true;
      quiz.timeout(timerSeconds * 1000);
    }
  }, [countdown.isDone, quiz, timerSeconds]);

  useEffect(() => {
    if (quiz.phase === "feedback") {
      feedbackTimerRef.current = setTimeout(() => {
        quiz.next();
      }, 1000);
      return () => {
        if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      };
    }
  }, [quiz.phase, quiz]);

  const saveAttempt = useCallback(async () => {
    if (saving || attemptId) return;
    setSaving(true);
    try {
      const attempt: Omit<Attempt, "completedAt"> & { completedAt: Timestamp } = {
        sessionCode,
        teamName: teamName || "Anonim",
        answers: quiz.answers,
        score: quiz.score,
        totalQuestions: questions.length,
        completedAt: Timestamp.now(),
      };
      const docRef = await addDoc(collection(db, "attempts"), attempt);
      setAttemptId(docRef.id);
    } catch (error) {
      console.error("Gagal menyimpan hasil:", error);
    } finally {
      setSaving(false);
    }
  }, [saving, attemptId, sessionCode, teamName, quiz.answers, quiz.score, questions.length]);

  useEffect(() => {
    if (quiz.phase === "finished") {
      saveAttempt();
    }
  }, [quiz.phase, saveAttempt]);

  const handleAnswer = (index: number) => {
    if (quiz.phase !== "answering") return;
    quiz.answer(index, countdown.elapsed);
  };

  /* ---------- Layar SIAP ---------- */
  if (quiz.phase === "ready") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 bg-white">
        <div className="w-full max-w-sm text-center">
          <p className="text-sm font-medium text-slate-400 mb-2">Tim</p>
          <p className="text-xl font-bold text-slate-900 mb-6">
            {teamName || "Anonim"}
          </p>
          <div className="flex justify-center gap-8 mb-8">
            <div>
              <p className="text-3xl font-bold text-slate-900">
                {questions.length}
              </p>
              <p className="text-sm text-slate-500">soal</p>
            </div>
            <div className="border-l border-slate-200" />
            <div>
              <p className="text-3xl font-bold text-slate-900">{timerSeconds}</p>
              <p className="text-sm text-slate-500">detik / soal</p>
            </div>
          </div>
          <p className="text-sm text-slate-500 mb-6">
            Jawab secepat mungkin sebelum waktu habis. Tiap soal hanya bisa
            dijawab satu kali.
          </p>
          <button onClick={quiz.start} className="btn-primary btn-lg w-full">
            Mulai Quiz
          </button>
        </div>
      </div>
    );
  }

  /* ---------- Layar HASIL ---------- */
  if (quiz.phase === "finished") {
    const unanswered = quiz.answers.filter((a) => a.selectedIndex === null).length;
    const wrong = quiz.answers.filter(
      (a) => a.selectedIndex !== null && !a.correct
    ).length;
    const pct = Math.round((quiz.score / questions.length) * 100);

    return (
      <div className="flex-1 bg-white">
        <div className="max-w-2xl mx-auto px-4 py-8">
          {/* Skor */}
          <div className="text-center mb-8">
            <p className="text-sm font-medium text-slate-400 mb-3">Hasil Quiz</p>
            <div className="text-6xl font-bold text-primary-700 tabular-nums">
              {quiz.score}
              <span className="text-3xl text-slate-300">/{questions.length}</span>
            </div>
            <p className="text-slate-500 mt-2">{pct}% benar</p>

            <div className="flex justify-center gap-3 mt-6">
              <span className="badge-success">Benar {quiz.score}</span>
              <span className="badge bg-red-50 text-red-600">Salah {wrong}</span>
              <span className="badge bg-amber-50 text-amber-600">
                Tak terjawab {unanswered}
              </span>
            </div>
            {saving && (
              <p className="text-sm text-slate-400 mt-4">Menyimpan hasil...</p>
            )}
          </div>

          {/* Rincian */}
          <h3 className="font-bold text-slate-900 mb-3">Rincian Jawaban</h3>
          <div className="space-y-3">
            {questions.map((q, i) => {
              const ans = quiz.answers[i];
              const isCorrect = ans?.correct;
              const timedOut = ans?.selectedIndex === null;

              return (
                <div
                  key={q.id}
                  className={`rounded-[var(--radius-card)] border p-4 ${
                    isCorrect
                      ? "border-primary-200 bg-primary-50"
                      : "border-red-200 bg-red-50"
                  }`}
                >
                  <p className="font-medium text-slate-900 mb-2">
                    {i + 1}. {q.text}
                  </p>
                  <div className="space-y-1 text-sm mb-2">
                    {q.options.map((opt, oi) => {
                      let cls = "text-slate-500";
                      if (oi === q.correctIndex) {
                        cls = "text-primary-700 font-semibold";
                      } else if (oi === ans?.selectedIndex) {
                        cls = "text-red-600 line-through";
                      }
                      return (
                        <div key={oi} className={cls}>
                          {OPTION_LABELS[oi]}. {opt}
                          {oi === q.correctIndex && " ✓"}
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-slate-400">
                    {timedOut
                      ? "Waktu habis"
                      : `Dijawab dalam ${(ans.timeSpentMs / 1000).toFixed(1)} detik`}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-8 text-center">
            <a href="/" className="btn-primary btn-lg">
              Kembali ke Beranda
            </a>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Layar SOAL ---------- */
  const q = quiz.currentQuestion!;
  const showingFeedback = quiz.phase === "feedback";
  const selected = quiz.answers[quiz.currentIndex]?.selectedIndex;

  return (
    <div className="flex-1 flex flex-col bg-white min-h-[100dvh]">
      {/* Header sticky: progress + timer selalu terlihat */}
      <header className="sticky top-0 bg-white border-b border-slate-100 px-4 pt-3 pb-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between text-sm font-medium text-slate-400 mb-3">
            <span>
              Soal {quiz.currentIndex + 1} / {questions.length}
            </span>
            <span>{teamName}</span>
          </div>
          <Timer
            remaining={countdown.remaining}
            total={timerSeconds}
            isLow={countdown.isLow}
            isCritical={countdown.isCritical}
          />
        </div>
      </header>

      {/* Konten soal */}
      <div className="flex-1 flex flex-col px-4 py-6 max-w-lg mx-auto w-full">
        <p className="text-xl sm:text-2xl font-semibold text-slate-900 leading-relaxed mb-6">
          {q.text}
        </p>

        <div className="grid gap-3 mt-auto">
          {q.options.map((option, index) => {
            let cls =
              "w-full text-left flex items-start gap-3 p-4 rounded-[var(--radius-control)] border-2 font-medium text-base transition-colors active:scale-[0.99]";

            if (showingFeedback) {
              if (index === q.correctIndex) {
                cls += " border-primary-500 bg-primary-50 text-primary-800";
              } else if (selected === index) {
                cls += " border-red-400 bg-red-50 text-red-700";
              } else {
                cls += " border-slate-200 text-slate-400";
              }
            } else {
              cls +=
                " border-slate-200 bg-white text-slate-800 hover:border-primary-400 active:border-primary-500";
            }

            return (
              <button
                key={index}
                onClick={() => handleAnswer(index)}
                disabled={showingFeedback}
                className={cls}
              >
                <span
                  className={`shrink-0 grid place-items-center w-7 h-7 rounded-lg text-sm font-bold ${
                    showingFeedback && index === q.correctIndex
                      ? "bg-primary-600 text-white"
                      : showingFeedback && selected === index
                        ? "bg-red-500 text-white"
                        : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {OPTION_LABELS[index]}
                </span>
                <span className="pt-0.5">{option}</span>
              </button>
            );
          })}
        </div>

        {/* Feedback benar/salah */}
        <div className="h-10 mt-4 flex items-center justify-center">
          {showingFeedback && quiz.lastCorrect === true && (
            <span className="text-xl font-bold text-primary-700">Benar!</span>
          )}
          {showingFeedback && quiz.lastCorrect === false && (
            <span className="text-xl font-bold text-red-600">Salah!</span>
          )}
          {showingFeedback && quiz.lastCorrect === null && (
            <span className="text-xl font-bold text-amber-500">Waktu Habis!</span>
          )}
        </div>
      </div>
    </div>
  );
}
