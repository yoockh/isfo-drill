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
      setError("Gagal memuat sesi. Cek koneksi internet.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">ISFO Drill</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Latihan Cerdas Cermat Keuangan Syariah
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Kode Sesi
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={6}
                required
                className="w-full px-4 py-4 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-center text-2xl font-mono tracking-[0.3em] uppercase focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="______"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Nama Tim <span className="text-gray-400">(opsional)</span>
              </label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                maxLength={50}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="Contoh: Tim A"
              />
            </div>

            {error && (
              <p className="text-red-600 dark:text-red-400 text-sm text-center">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || code.trim().length !== 6}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-lg font-bold rounded-xl transition-colors"
            >
              {loading ? "Memuat..." : "Masuk Quiz"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 dark:text-gray-500 mt-6">
          Minta kode sesi dari guru untuk mulai latihan
        </p>
      </div>
    </div>
  );
}
