"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

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
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-grid place-items-center w-14 h-14 rounded-2xl bg-primary-600 text-white text-2xl font-bold mb-4">
            i
          </div>
          <h1 className="text-3xl font-bold text-slate-900">ISFO Drill</h1>
          <p className="text-slate-500 mt-1">
            Latihan Cerdas Cermat Keuangan Syariah
          </p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Kode Sesi</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={6}
                required
                inputMode="text"
                autoCapitalize="characters"
                className="input text-center text-2xl font-mono tracking-[0.4em] uppercase py-4"
                placeholder="––––––"
              />
            </div>

            <div>
              <label className="label">
                Nama Tim <span className="text-slate-400 font-normal">(opsional)</span>
              </label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                maxLength={50}
                className="input"
                placeholder="Contoh: Tim A"
              />
            </div>

            {error && (
              <p className="text-red-600 text-sm text-center bg-red-50 rounded-lg py-2 px-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || code.trim().length !== 6}
              className="btn-primary btn-lg w-full"
            >
              {loading ? "Memuat..." : "Masuk Quiz"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-400 mt-6">
          Minta kode sesi dari guru untuk mulai latihan.
        </p>
      </div>
    </div>
  );
}
