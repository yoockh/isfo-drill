"use client";

import type { Question } from "@/lib/types";

interface QuestionEditorProps {
  question: Question;
  index: number;
  onChange: (updated: Question) => void;
  onDelete: () => void;
}

const OPTION_LABELS = ["A", "B", "C", "D"];

export function QuestionEditor({
  question,
  index,
  onChange,
  onDelete,
}: QuestionEditorProps) {
  function updateText(text: string) {
    onChange({ ...question, text });
  }

  function updateOption(optIndex: number, value: string) {
    const newOptions = [...question.options] as [string, string, string, string];
    newOptions[optIndex] = value;
    onChange({ ...question, options: newOptions });
  }

  function updateCorrectIndex(correctIndex: number) {
    onChange({ ...question, correctIndex });
  }

  return (
    <div className="card p-4">
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm font-bold text-slate-400">Soal {index + 1}</span>
        <button
          onClick={onDelete}
          className="text-sm font-medium text-red-500 hover:text-red-700"
        >
          Hapus
        </button>
      </div>

      <textarea
        value={question.text}
        onChange={(e) => updateText(e.target.value)}
        rows={2}
        placeholder="Tulis teks soal..."
        className="textarea text-sm mb-3"
      />

      <div className="space-y-2">
        {question.options.map((option, oi) => {
          const isCorrect = question.correctIndex === oi;
          return (
            <div key={oi} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => updateCorrectIndex(oi)}
                title="Tandai sebagai jawaban benar"
                className={`w-8 h-8 rounded-lg border flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                  isCorrect
                    ? "border-primary-600 bg-primary-600 text-white"
                    : "border-slate-300 text-slate-500 hover:border-primary-400"
                }`}
              >
                {OPTION_LABELS[oi]}
              </button>
              <input
                type="text"
                value={option}
                onChange={(e) => updateOption(oi, e.target.value)}
                placeholder={`Pilihan ${OPTION_LABELS[oi]}`}
                className="input text-sm py-2"
              />
            </div>
          );
        })}
      </div>
      <p className="text-xs text-slate-400 mt-2">
        Klik huruf untuk menandai jawaban benar (kini: {OPTION_LABELS[question.correctIndex]}).
      </p>
    </div>
  );
}
