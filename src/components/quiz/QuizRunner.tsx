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
  const countdown = useCountdown(
    timerSeconds,
    quiz.phase === "answering"
  );
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
    if (countdown.isDone && quiz.phase === "answering" && !timeoutHandledRef.current) {
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

  if (quiz.phase === "ready") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 w-full max-w-md text-center">
          <h2 className="text-2xl font-bold mb-2">Siap?</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            {questions.length} soal &middot; {timerSeconds} detik per soal
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
            Tim: {teamName || "Anonim"}
          </p>
          <button
            onClick={quiz.start}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white text-xl font-bold rounded-xl transition-colors"
          >
            Mulai Quiz
          </button>
        </div>
      </div>
    );
  }

  if (quiz.phase === "finished") {
    const unanswered = quiz.answers.filter((a) => a.selectedIndex === null).length;
    const wrong = quiz.answers.filter(
      (a) => a.selectedIndex !== null && !a.correct
    ).length;

    return (
      <div className="px-4 py-8 max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center mb-8">
          <h2 className="text-3xl font-bold mb-4">Hasil Quiz</h2>
          <div className="text-6xl font-bold text-blue-600 dark:text-blue-400 mb-2">
            {quiz.score}/{questions.length}
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Benar: {quiz.score} &middot; Salah: {wrong} &middot; Tidak dijawab: {unanswered}
          </p>
          {saving && (
            <p className="text-sm text-gray-500 mt-4">Menyimpan hasil...</p>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-bold">Rincian Jawaban</h3>
          {questions.map((q, i) => {
            const ans = quiz.answers[i];
            const isCorrect = ans?.correct;
            const timedOut = ans?.selectedIndex === null;

            return (
              <div
                key={q.id}
                className={`p-4 rounded-xl border-2 ${
                  isCorrect
                    ? "border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950"
                    : "border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950"
                }`}
              >
                <p className="font-medium mb-2">
                  {i + 1}. {q.text}
                </p>
                <div className="grid grid-cols-1 gap-1 text-sm mb-2">
                  {q.options.map((opt, oi) => {
                    let optClass = "text-gray-600 dark:text-gray-400";
                    if (oi === q.correctIndex) {
                      optClass = "text-green-700 dark:text-green-400 font-bold";
                    } else if (oi === ans?.selectedIndex) {
                      optClass = "text-red-600 dark:text-red-400 line-through";
                    }
                    return (
                      <span key={oi} className={optClass}>
                        {OPTION_LABELS[oi]}. {opt}
                        {oi === q.correctIndex && " ✓"}
                      </span>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-500">
                  {timedOut
                    ? "Waktu habis"
                    : `Dijawab dalam ${(ans.timeSpentMs / 1000).toFixed(1)}d`}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <a
            href="/"
            className="inline-block py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
          >
            Kembali ke Beranda
          </a>
        </div>
      </div>
    );
  }

  const q = quiz.currentQuestion!;
  const showingFeedback = quiz.phase === "feedback";

  return (
    <div className="flex flex-col min-h-[100dvh] px-4 py-6 max-w-lg mx-auto">
      <div className="text-center text-sm text-gray-500 dark:text-gray-400 mb-2">
        Soal {quiz.currentIndex + 1} / {questions.length}
      </div>

      <Timer
        remaining={countdown.remaining}
        total={timerSeconds}
        isLow={countdown.isLow}
        isCritical={countdown.isCritical}
      />

      <div className="flex-1 flex flex-col justify-center mt-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
          <p className="text-lg font-medium leading-relaxed">{q.text}</p>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {q.options.map((option, index) => {
            let btnClass =
              "w-full text-left p-4 rounded-xl border-2 font-medium text-base transition-all active:scale-[0.98]";

            if (showingFeedback) {
              if (index === q.correctIndex) {
                btnClass += " border-green-500 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200";
              } else if (
                quiz.answers[quiz.currentIndex]?.selectedIndex === index
              ) {
                btnClass += " border-red-500 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200";
              } else {
                btnClass += " border-gray-200 dark:border-gray-700 opacity-50";
              }
            } else {
              btnClass +=
                " border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 active:bg-blue-100";
            }

            return (
              <button
                key={index}
                onClick={() => handleAnswer(index)}
                disabled={showingFeedback}
                className={btnClass}
              >
                <span className="font-bold mr-2">{OPTION_LABELS[index]}.</span>
                {option}
              </button>
            );
          })}
        </div>

        {showingFeedback && (
          <div className="mt-4 text-center">
            {quiz.lastCorrect === true && (
              <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                Benar!
              </span>
            )}
            {quiz.lastCorrect === false && (
              <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                Salah!
              </span>
            )}
            {quiz.lastCorrect === null && (
              <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                Waktu Habis!
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
