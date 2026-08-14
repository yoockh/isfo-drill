/*
  Elemen dekoratif geometris solid khas neo-brutalism (bukan blur/gradient).
  Semua aria-hidden & pointer-events-none, disembunyikan di layar kecil
  agar tidak mengganggu konten di mobile.
*/

interface ShapeProps {
  className?: string;
  color?: string; // nilai warna CSS, mis. var(--color-mustard)
}

export function Star({ className = "", color = "#1a1a1a" }: ShapeProps) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={`pointer-events-none select-none ${className}`}
      fill={color}
      stroke="#1a1a1a"
      strokeWidth="1.5"
      strokeLinejoin="round"
    >
      <path d="M12 1l2.6 6.4L21 10l-6.4 2.6L12 19l-2.6-6.4L3 10l6.4-2.6L12 1z" />
    </svg>
  );
}

export function Dot({ className = "", color = "#ff7eb6" }: ShapeProps) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none block rounded-full border-[3px] border-[#1a1a1a] ${className}`}
      style={{ backgroundColor: color }}
    />
  );
}

export function Square({ className = "", color = "#b58cff" }: ShapeProps) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none block border-[3px] border-[#1a1a1a] rounded-[4px] rotate-12 ${className}`}
      style={{ backgroundColor: color }}
    />
  );
}
