"use client";

import { useEffect, useRef, useState } from "react";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";

interface SessionMenuProps {
  onRename: () => void;
  onDelete: () => void;
}

/*
  Kebab menu (titik tiga) untuk aksi sesi — dropdown neo-brutalism.
  Tutup saat klik di luar / Escape. Muncul dengan animasi nbpop.
*/
export function SessionMenu({ onRename, onDelete }: SessionMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label="Menu aksi sesi"
        aria-haspopup="menu"
        aria-expanded={open}
        className="grid place-items-center w-8 h-8 rounded-[6px] border-[2.5px] border-[#1a1a1a] bg-white hover:bg-[var(--color-mustard)] transition-colors"
      >
        <MoreVertical size={16} strokeWidth={2.5} />
      </button>

      {open && (
        <div
          role="menu"
          className="nb-card nb-white absolute right-0 z-30 mt-1.5 w-40 p-1.5 origin-top-right animate-[nbpop_120ms_ease-out]"
        >
          <button
            role="menuitem"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
              onRename();
            }}
            className="w-full flex items-center gap-2 text-left px-2.5 py-2 rounded-[5px] font-bold text-sm hover:bg-[var(--color-purple)] transition-colors"
          >
            <Pencil size={15} strokeWidth={2.5} /> Edit Nama
          </button>
          <button
            role="menuitem"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
              onDelete();
            }}
            className="w-full flex items-center gap-2 text-left px-2.5 py-2 rounded-[5px] font-bold text-sm text-[var(--color-nb-red)] hover:bg-[var(--color-nb-red)] hover:text-white transition-colors"
          >
            <Trash2 size={15} strokeWidth={2.5} /> Hapus Sesi
          </button>
        </div>
      )}
    </div>
  );
}
