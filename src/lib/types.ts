import { Timestamp } from "firebase/firestore";
import type { SubjectId, LevelId } from "./subjects";

export interface Question {
  id: string;
  text: string;
  // 2–6 opsi jawaban. (Dulu selalu tepat 4; kini fleksibel agar mendukung
  // impor soal dengan 5 opsi A–E atau soal benar/salah.)
  options: string[];
  correctIndex: number;
}

export interface Session {
  code: string;
  title: string;
  // Konfigurasi generator AI (opsional demi kompatibilitas sesi lama).
  subject?: SubjectId;
  level?: LevelId;
  customInstruction?: string;
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
  options: string[];
  correctIndex: number;
}
