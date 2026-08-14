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
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-800">
      <div className="flex justify-between items-start mb-3">
        <span className="text-sm font-bold text-gray-500">Soal {index + 1}</span>
        <button
          onClick={onDelete}
          className="text-red-500 hover:text-red-700 text-sm font-medium"
        >
          Hapus
        </button>
      </div>

      <textarea
        value={question.text}
        onChange={(e) => updateText(e.target.value)}
        rows={2}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none mb-3"
      />

      <div className="space-y-2">
        {question.options.map((option, oi) => (
          <div key={oi} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => updateCorrectIndex(oi)}
              className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                question.correctIndex === oi
                  ? "border-green-500 bg-green-500 text-white"
                  : "border-gray-300 dark:border-gray-600 text-gray-500 hover:border-green-400"
              }`}
            >
              {OPTION_LABELS[oi]}
            </button>
            <input
              type="text"
              value={option}
              onChange={(e) => updateOption(oi, e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-2">
        Klik huruf untuk mengubah jawaban benar
      </p>
    </div>
  );
}
