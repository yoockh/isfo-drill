import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DrillKu — Latihan Soal Cerdas Cermat Semua Bidang",
  description:
    "Aplikasi latihan soal (KSR, OSN, sains, informatika, cybersecurity, dll) dengan soal buatan AI dan simulasi tekanan waktu",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#24d3c4",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
