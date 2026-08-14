"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

type NbColor = "red" | "mustard" | "teal" | "purple" | "green" | "pink";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: NbColor;
  loading?: boolean;
  /** Tunda aktifnya tombol konfirmasi (ms) untuk cegah klik tak sengaja. */
  confirmDelayMs?: number;
  onConfirm: () => void;
  onCancel: () => void;
}

/*
  Dialog konfirmasi reusable — neo-brutalism (border tebal + hard shadow,
  backdrop gelap TANPA blur). Animasi masuk/keluar scale+fade ~170ms.
  Reusable untuk logout, hapus sesi, hapus soal, dll.
*/
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Ya, Lanjutkan",
  cancelLabel = "Batal",
  confirmColor = "red",
  loading = false,
  confirmDelayMs = 0,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [mounted, setMounted] = useState(false);
  const [show, setShow] = useState(false);
  const [delayPassed, setDelayPassed] = useState(confirmDelayMs === 0);

  // Mount saat open, lalu unmount setelah animasi keluar selesai.
  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = requestAnimationFrame(() => setShow(true));
      return () => cancelAnimationFrame(id);
    } else {
      setShow(false);
      const t = setTimeout(() => setMounted(false), 180);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Tunda aktifnya tombol konfirmasi setiap kali dialog dibuka.
  useEffect(() => {
    if (!open) return;
    if (confirmDelayMs === 0) {
      setDelayPassed(true);
      return;
    }
    setDelayPassed(false);
    const t = setTimeout(() => setDelayPassed(true), confirmDelayMs);
    return () => clearTimeout(t);
  }, [open, confirmDelayMs]);

  // Tutup dengan tombol Escape.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loading, onCancel]);

  if (!mounted) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop gelap tanpa blur */}
      <div
        onClick={() => !loading && onCancel()}
        className={`absolute inset-0 bg-black transition-opacity duration-150 ${
          show ? "opacity-50" : "opacity-0"
        }`}
      />

      {/* Kartu modal */}
      <div
        className={`nb-card nb-white relative w-full max-w-sm p-6 transition-all duration-150 ease-out ${
          show ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`}
      >
        <h2 className="text-xl font-extrabold mb-2">{title}</h2>
        {message && (
          <p className="font-bold text-[#1a1a1a]/70 mb-5">{message}</p>
        )}
        <div className="flex gap-3">
          <Button
            color="white"
            onClick={onCancel}
            disabled={loading}
            className="flex-1"
          >
            {cancelLabel}
          </Button>
          <Button
            color={confirmColor}
            onClick={onConfirm}
            disabled={loading || !delayPassed}
            className="flex-1"
          >
            {loading ? "..." : !delayPassed ? "Tunggu…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
