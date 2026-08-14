import { Timestamp } from "firebase/firestore";

export interface Question {
  id: string;
  text: string;
  options: [string, string, string, string];
  correctIndex: number;
}

export interface Session {
  code: string;
  title: string;
  rawMaterial: string;
  questions: Question[];
  timerSeconds: number;
  published: boolean;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AnswerRecord {
  questionId: string;
  selectedIndex: number | null;
  correct: boolean;
  timeSpentMs: number;
}

export interface Attempt {
  sessionCode: string;
  teamName: string;
  answers: AnswerRecord[];
  score: number;
  totalQuestions: number;
  completedAt: Timestamp;
}

export interface GeneratedQuestion {
  text: string;
  options: [string, string, string, string];
  correctIndex: number;
}
