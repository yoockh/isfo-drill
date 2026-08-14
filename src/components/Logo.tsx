/*
  Logo ISFO Drill — SVG inline, neo-brutalism.
  Konsep: kotak badge tegas (border tebal) berisi kilat/bolt (kecepatan &
  ketangkasan menjawab) yang sekaligus membentuk garis grafik naik ke kanan
  (pertumbuhan / edukasi keuangan) — nuansa profesional-edukatif tanpa
  simbol religius eksplisit. Warna utama teal (identitas navbar).
*/

interface LogoProps {
  size?: number;
  className?: string;
  /** Warna isi badge (default teal identitas). */
  color?: string;
}

export function Logo({ size = 36, className = "", color = "var(--color-teal)" }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className={className}
      role="img"
      aria-label="ISFO Drill"
      fill="none"
    >
      {/* Badge container */}
      <rect
        x="2.5"
        y="2.5"
        width="35"
        height="35"
        rx="7"
        fill={color}
        stroke="#1a1a1a"
        strokeWidth="3"
      />
      {/* Bolt = kecepatan, ujungnya naik seperti grafik pertumbuhan */}
      <path
        d="M22 8 L12 22 L19 22 L17 32 L29 17 L21.5 17 L24 8 Z"
        fill="#1a1a1a"
        stroke="#1a1a1a"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
