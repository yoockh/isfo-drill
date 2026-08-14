"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Star, Dot, Square } from "@/components/ui/Decor";

export default function HomePage() {
  const [code, setCode] = useState("");
  const [teamName, setTeamName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const trimmedCode = code.trim().toUpperCase();
    if (trimmedCode.length !== 6) {
      setError("Kode sesi harus 6 karakter");
      return;
    }

    setLoading(true);
    try {
      const sessionRef = doc(db, "sessions", trimmedCode);
      const sessionSnap = await getDoc(sessionRef);

      if (!sessionSnap.exists()) {
        setError("Kode sesi tidak ditemukan");
        return;
      }

      const data = sessionSnap.data();
      if (!data.published) {
        setError("Sesi ini belum dipublikasikan oleh guru");
        return;
      }

      const encodedName = encodeURIComponent(teamName.trim() || "Anonim");
      router.push(`/quiz/${trimmedCode}?team=${encodedName}`);
    } catch {
      setError("Kode sesi tidak ditemukan atau belum dipublikasikan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex-1 flex flex-col items-center justify-center px-4 py-10 overflow-hidden">
      {/* Dekorasi geometris */}
      <Star className="hidden sm:block absolute top-16 left-[12%] w-10 h-10" color="var(--color-mustard)" />
      <Dot className="hidden sm:block absolute bottom-24 left-[18%] w-8 h-8" color="var(--color-teal)" />
      <Square className="hidden sm:block absolute top-24 right-[14%] w-9 h-9" color="var(--color-purple)" />
      <Dot className="hidden sm:block absolute bottom-16 right-[20%] w-6 h-6" color="var(--color-mustard)" />

      <div className="w-full max-w-md relative">
        <div className="text-center mb-7">
          <div className="inline-grid place-items-center w-16 h-16 bg-[var(--color-mustard)] border-[3px] border-[#1a1a1a] rounded-[8px] shadow-[5px_5px_0_0_#1a1a1a] text-3xl font-extrabold mb-4 rotate-[-4deg]">
            i
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight">ISFO DRILL</h1>
          <p className="font-bold text-[#1a1a1a]/70 mt-1">
            Latihan Cerdas Cermat Keuangan Syariah
          </p>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-extrabold uppercase tracking-wide mb-1.5">
                Kode Sesi
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={6}
                required
                autoCapitalize="characters"
                className="nb-input text-center text-3xl font-extrabold font-mono tracking-[0.4em] uppercase py-3.5 nb-mustard"
                placeholder="––––––"
              />
            </div>

            <div>
              <label className="block text-sm font-extrabold uppercase tracking-wide mb-1.5">
                Nama Tim <span className="text-[#1a1a1a]/50 font-bold normal-case">(opsional)</span>
              </label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                maxLength={50}
                className="nb-input"
                placeholder="Contoh: Tim A"
              />
            </div>

            {error && (
              <p className="nb-red border-[2.5px] border-[#1a1a1a] rounded-[6px] text-sm font-bold text-center py-2 px-3">
                {error}
              </p>
            )}

            <Button
              type="submit"
              color="teal"
              size="lg"
              disabled={loading || code.trim().length !== 6}
              className="w-full"
            >
              {loading ? "Memuat..." : "Masuk Quiz →"}
            </Button>
          </form>
        </Card>

        <p className="text-center text-sm font-bold text-[#1a1a1a]/60 mt-6">
          Minta kode sesi dari guru untuk mulai latihan.
        </p>
      </div>
    </div>
  );
}
