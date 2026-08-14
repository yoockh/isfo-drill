"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useQuiz } from "@/hooks/useQuiz";
import { useCountdown } from "@/hooks/useCountdown";
import { Timer } from "@/components/ui/Timer";
import { Button } from "@/components/ui/Button";
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
      <div className="flex-1 flex flex-col items-center justify-center px-5 bg-[var(--paper)]">
        <div className="w-full max-w-sm text-center">
          <span className="nb-badge nb-teal mb-5">TIM</span>
          <p className="text-2xl font-extrabold mb-6">{teamName || "Anonim"}</p>
          <div className="flex justify-center gap-3 mb-8">
            <div className="nb-card nb-white px-5 py-3">
              <p className="text-3xl font-extrabold">{questions.length}</p>
              <p className="text-xs font-bold text-[#1a1a1a]/60">SOAL</p>
            </div>
            <div className="nb-card nb-white px-5 py-3">
              <p className="text-3xl font-extrabold">{timerSeconds}</p>
              <p className="text-xs font-bold text-[#1a1a1a]/60">DTK/SOAL</p>
            </div>
          </div>
          <p className="text-sm font-bold text-[#1a1a1a]/70 mb-6">
            Jawab secepat mungkin sebelum waktu habis. Tiap soal hanya bisa
            dijawab satu kali.
          </p>
          <Button color="teal" size="lg" onClick={quiz.start} className="w-full">
            Mulai Quiz →
          </Button>
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
      <div className="flex-1 bg-[var(--paper)]">
        <div className="max-w-2xl mx-auto px-4 py-8">
          {/* Skor */}
          <div className="nb-card nb-mustard p-6 text-center mb-6">
            <p className="text-sm font-extrabold uppercase tracking-wide mb-2">
              Hasil Quiz
            </p>
            <div className="text-6xl font-extrabold tabular-nums">
              {quiz.score}
              <span className="text-3xl text-[#1a1a1a]/50">/{questions.length}</span>
            </div>
            <p className="font-extrabold mt-1">{pct}% BENAR</p>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              <span className="nb-badge nb-green">BENAR {quiz.score}</span>
              <span className="nb-badge nb-red">SALAH {wrong}</span>
              <span className="nb-badge nb-white">TAK TERJAWAB {unanswered}</span>
            </div>
            {saving && (
              <p className="text-sm font-bold text-[#1a1a1a]/60 mt-3">
                Menyimpan hasil...
              </p>
            )}
          </div>

          {/* Rincian */}
          <h3 className="font-extrabold text-lg mb-3">RINCIAN JAWABAN</h3>
          <div className="space-y-3">
            {questions.map((q, i) => {
              const ans = quiz.answers[i];
              const isCorrect = ans?.correct;
              const timedOut = ans?.selectedIndex === null;

              return (
                <div
                  key={q.id}
                  className={`nb-card p-4 ${isCorrect ? "nb-green" : "nb-red"}`}
                >
                  <p className="font-extrabold mb-2">
                    {i + 1}. {q.text}
                  </p>
                  <div className="space-y-1 text-sm mb-2">
                    {q.options.map((opt, oi) => {
                      const correct = oi === q.correctIndex;
                      const chosenWrong = oi === ans?.selectedIndex && !correct;
                      return (
                        <div
                          key={oi}
                          className={`font-bold ${
                            correct
                              ? ""
                              : chosenWrong
                                ? "line-through opacity-70"
                                : "opacity-60"
                          }`}
                        >
                          {OPTION_LABELS[oi]}. {opt}
                          {correct && " ✓"}
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs font-bold text-[#1a1a1a]/60">
                    {timedOut
                      ? "Waktu habis"
                      : `Dijawab dalam ${(ans.timeSpentMs / 1000).toFixed(1)} detik`}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-8 text-center">
            <a href="/" className="nb-btn nb-teal nb-btn-lg">
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
    <div className="flex-1 flex flex-col bg-[var(--paper)] min-h-[100dvh]">
      {/* Header sticky: progress + timer selalu terlihat */}
      <header className="sticky top-0 bg-[var(--paper)] border-b-[2.5px] sm:border-b-[3px] border-[#1a1a1a] px-4 pt-3 pb-4 z-10">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between text-sm font-extrabold mb-3">
            <span>
              SOAL {quiz.currentIndex + 1} / {questions.length}
            </span>
            <span className="text-[#1a1a1a]/60">{teamName}</span>
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
        <p className="text-xl sm:text-2xl font-extrabold leading-snug mb-6">
          {q.text}
        </p>

        <div className="grid gap-3 mt-auto">
          {q.options.map((option, index) => {
            const correct = index === q.correctIndex;
            const chosen = selected === index;

            let colorClass = "nb-white";
            let dim = "";
            if (showingFeedback) {
              if (correct) colorClass = "nb-green";
              else if (chosen) colorClass = "nb-red";
              else {
                colorClass = "nb-white";
                dim = "opacity-50";
              }
            }

            return (
              <button
                key={index}
                onClick={() => handleAnswer(index)}
                disabled={showingFeedback}
                className={`nb-btn ${colorClass} ${dim} w-full justify-start text-left text-base py-4`}
              >
                <span className="shrink-0 grid place-items-center w-8 h-8 border-[2.5px] border-[#1a1a1a] rounded-[6px] bg-white/70 text-sm font-extrabold">
                  {OPTION_LABELS[index]}
                </span>
                <span>{option}</span>
              </button>
            );
          })}
        </div>

        {/* Feedback benar/salah */}
        <div className="h-11 mt-4 flex items-center justify-center">
          {showingFeedback && quiz.lastCorrect === true && (
            <span className="nb-badge nb-green text-base">BENAR!</span>
          )}
          {showingFeedback && quiz.lastCorrect === false && (
            <span className="nb-badge nb-red text-base">SALAH!</span>
          )}
          {showingFeedback && quiz.lastCorrect === null && (
            <span className="nb-badge nb-mustard text-base">WAKTU HABIS!</span>
          )}
        </div>
      </div>
    </div>
  );
}
