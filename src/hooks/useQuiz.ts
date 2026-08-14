"use client";

import { useReducer, useCallback } from "react";
import type { Question, AnswerRecord } from "@/lib/types";

type QuizPhase = "ready" | "answering" | "feedback" | "finished";

interface QuizState {
  phase: QuizPhase;
  currentIndex: number;
  answers: AnswerRecord[];
  questions: Question[];
  lastCorrect: boolean | null;
}

type QuizAction =
  | { type: "START" }
  | { type: "ANSWER"; selectedIndex: number; timeSpentMs: number }
  | { type: "TIMEOUT"; timeSpentMs: number }
  | { type: "NEXT" };

function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case "START":
      return { ...state, phase: "answering", currentIndex: 0, answers: [] };

    case "ANSWER": {
      const question = state.questions[state.currentIndex];
      const correct = action.selectedIndex === question.correctIndex;
      const answer: AnswerRecord = {
        questionId: question.id,
        selectedIndex: action.selectedIndex,
        correct,
        timeSpentMs: action.timeSpentMs,
      };
      return {
        ...state,
        phase: "feedback",
        answers: [...state.answers, answer],
        lastCorrect: correct,
      };
    }

    case "TIMEOUT": {
      const question = state.questions[state.currentIndex];
      const answer: AnswerRecord = {
        questionId: question.id,
        selectedIndex: null,
        correct: false,
        timeSpentMs: action.timeSpentMs,
      };
      return {
        ...state,
        phase: "feedback",
        answers: [...state.answers, answer],
        lastCorrect: null,
      };
    }

    case "NEXT": {
      const nextIndex = state.currentIndex + 1;
      if (nextIndex >= state.questions.length) {
        return { ...state, phase: "finished", lastCorrect: null };
      }
      return {
        ...state,
        phase: "answering",
        currentIndex: nextIndex,
        lastCorrect: null,
      };
    }

    default:
      return state;
  }
}

export function useQuiz(questions: Question[]) {
  const [state, dispatch] = useReducer(quizReducer, {
    phase: "ready",
    currentIndex: 0,
    answers: [],
    questions,
    lastCorrect: null,
  });

  const start = useCallback(() => dispatch({ type: "START" }), []);
  const answer = useCallback(
    (selectedIndex: number, timeSpentMs: number) =>
      dispatch({ type: "ANSWER", selectedIndex, timeSpentMs }),
    []
  );
  const timeout = useCallback(
    (timeSpentMs: number) => dispatch({ type: "TIMEOUT", timeSpentMs }),
    []
  );
  const next = useCallback(() => dispatch({ type: "NEXT" }), []);

  const score = state.answers.filter((a) => a.correct).length;
  const currentQuestion =
    state.phase !== "finished" && state.phase !== "ready"
      ? state.questions[state.currentIndex]
      : null;

  return {
    ...state,
    score,
    currentQuestion,
    start,
    answer,
    timeout,
    next,
  };
}
