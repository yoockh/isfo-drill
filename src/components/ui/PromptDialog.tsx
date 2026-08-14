"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

interface PromptDialogProps {
  open: boolean;
  title: string;
  label?: string;
  initialValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  maxLength?: number;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

/*
  Dialog input teks reusable — neo-brutalism, backdrop gelap tanpa blur,
  animasi scale+fade. Dipakai mis. untuk ubah nama sesi.
*/
export function PromptDialog({
  open,
  title,
  label,
  initialValue = "",
  confirmLabel = "Simpan",
  cancelLabel = "Batal",
  loading = false,
  maxLength = 100,
  onConfirm,
  onCancel,
}: PromptDialogProps) {
  const [mounted, setMounted] = useState(false);
  const [show, setShow] = useState(false);
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setValue(initialValue);
      const id = requestAnimationFrame(() => setShow(true));
      return () => cancelAnimationFrame(id);
    } else {
      setShow(false);
      const t = setTimeout(() => setMounted(false), 180);
      return () => clearTimeout(t);
    }
    // initialValue sengaja tidak jadi dependency agar tidak menimpa ketikan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loading, onCancel]);

  if (!mounted) return null;

  const trimmed = value.trim();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        onClick={() => !loading && onCancel()}
        className={`absolute inset-0 bg-black transition-opacity duration-150 ${
          show ? "opacity-50" : "opacity-0"
        }`}
      />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (trimmed) onConfirm(trimmed);
        }}
        className={`nb-card nb-white relative w-full max-w-sm p-6 transition-all duration-150 ease-out ${
          show ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`}
      >
        <h2 className="text-xl font-extrabold mb-3">{title}</h2>
        {label && (
          <label className="block text-sm font-extrabold uppercase tracking-wide mb-1.5">
            {label}
          </label>
        )}
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={maxLength}
          autoFocus
          className="nb-input mb-5"
        />
        <div className="flex gap-3">
          <Button
            type="button"
            color="white"
            onClick={onCancel}
            disabled={loading}
            className="flex-1"
          >
            {cancelLabel}
          </Button>
          <Button
            type="submit"
            color="teal"
            disabled={loading || !trimmed}
            className="flex-1"
          >
            {loading ? "..." : confirmLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}
