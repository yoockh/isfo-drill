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
    <div className="nb-card nb-white p-4">
      <div className="flex justify-between items-center mb-3">
        <span className="nb-badge nb-teal">SOAL {index + 1}</span>
        <button
          onClick={onDelete}
          className="text-sm font-extrabold text-[var(--color-nb-red)] hover:underline"
        >
          Hapus
        </button>
      </div>

      <textarea
        value={question.text}
        onChange={(e) => updateText(e.target.value)}
        rows={2}
        placeholder="Tulis teks soal..."
        className="nb-input resize-y text-sm mb-3"
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
                className={`w-9 h-9 shrink-0 border-[2.5px] border-[#1a1a1a] rounded-[6px] font-extrabold text-sm transition-transform active:translate-x-[2px] active:translate-y-[2px] ${
                  isCorrect ? "nb-green" : "nb-white"
                }`}
              >
                {OPTION_LABELS[oi]}
              </button>
              <input
                type="text"
                value={option}
                onChange={(e) => updateOption(oi, e.target.value)}
                placeholder={`Pilihan ${OPTION_LABELS[oi]}`}
                className="nb-input text-sm"
              />
            </div>
          );
        })}
      </div>
      <p className="text-xs font-bold text-[#1a1a1a]/50 mt-2">
        Klik huruf untuk menandai jawaban benar (kini: {OPTION_LABELS[question.correctIndex]}).
      </p>
    </div>
  );
}
