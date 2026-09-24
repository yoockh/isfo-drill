"use client";

import type { Question } from "@/lib/types";
import { optionLabel } from "@/lib/utils";
import { RichText } from "@/components/ui/RichText";
import { Plus, X } from "lucide-react";

interface QuestionEditorProps {
  question: Question;
  index: number;
  onChange: (updated: Question) => void;
  onDelete: () => void;
}

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;

// Tampilkan pratinjau jika teks memuat notasi rumus/kode.
function hasRichMarkup(s: string): boolean {
  return /\$.+\$|```|`[^`]+`/.test(s);
}

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
    const newOptions = [...question.options];
    newOptions[optIndex] = value;
    onChange({ ...question, options: newOptions });
  }

  function updateCorrectIndex(correctIndex: number) {
    onChange({ ...question, correctIndex });
  }

  function addOption() {
    if (question.options.length >= MAX_OPTIONS) return;
    onChange({ ...question, options: [...question.options, ""] });
  }

  function removeOption(optIndex: number) {
    if (question.options.length <= MIN_OPTIONS) return;
    const newOptions = question.options.filter((_, i) => i !== optIndex);
    let correctIndex = question.correctIndex;
    if (optIndex === correctIndex) correctIndex = 0;
    else if (optIndex < correctIndex) correctIndex -= 1;
    onChange({ ...question, options: newOptions, correctIndex });
  }

  const showPreview = hasRichMarkup(question.text);

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
        placeholder="Tulis teks soal... (boleh rumus $...$ atau kode ```...```)"
        className="nb-input resize-y text-sm mb-2"
      />

      {showPreview && (
        <div className="mb-3 text-sm border-[2px] border-dashed border-[#1a1a1a]/25 rounded-[6px] p-2 bg-[var(--paper)]">
          <span className="text-[10px] font-extrabold uppercase tracking-wide text-[#1a1a1a]/40 block mb-1">
            Pratinjau
          </span>
          <RichText>{question.text}</RichText>
        </div>
      )}

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
                {optionLabel(oi)}
              </button>
              <input
                type="text"
                value={option}
                onChange={(e) => updateOption(oi, e.target.value)}
                placeholder={`Pilihan ${optionLabel(oi)}`}
                className="nb-input text-sm"
              />
              {question.options.length > MIN_OPTIONS && (
                <button
                  type="button"
                  onClick={() => removeOption(oi)}
                  title="Hapus pilihan ini"
                  aria-label={`Hapus pilihan ${optionLabel(oi)}`}
                  className="w-9 h-9 shrink-0 grid place-items-center border-[2.5px] border-[#1a1a1a] rounded-[6px] bg-white text-[var(--color-nb-red)] hover:nb-red hover:text-white transition-colors"
                >
                  <X size={16} strokeWidth={3} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-2 gap-2">
        <p className="text-xs font-bold text-[#1a1a1a]/50">
          Klik huruf untuk menandai jawaban benar (kini: {optionLabel(question.correctIndex)}).
        </p>
        {question.options.length < MAX_OPTIONS && (
          <button
            type="button"
            onClick={addOption}
            className="shrink-0 flex items-center gap-1 text-xs font-extrabold border-[2px] border-[#1a1a1a] rounded-[6px] px-2 py-1 bg-white hover:bg-black/5 transition-colors"
          >
            <Plus size={14} strokeWidth={3} /> Opsi
          </button>
        )}
      </div>
    </div>
  );
}
