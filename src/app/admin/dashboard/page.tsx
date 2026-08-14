"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/hooks/useAuth";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { generateSessionCode } from "@/lib/utils";
import type { Session } from "@/lib/types";

interface SessionWithCount extends Session {
  attemptCount: number;
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/admin");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;

    async function loadSessions() {
      try {
        const q = query(
          collection(db, "sessions"),
          where("createdBy", "==", user!.uid),
          orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);
        const base = snap.docs.map(
          (d) => ({ ...d.data(), code: d.id } as Session)
        );

        // Hitung jumlah attempt per sesi
        const withCounts = await Promise.all(
          base.map(async (s) => {
            let attemptCount = 0;
            try {
              const aSnap = await getDocs(
                query(
                  collection(db, "attempts"),
                  where("sessionCode", "==", s.code)
                )
              );
              attemptCount = aSnap.size;
            } catch {
              attemptCount = 0;
            }
            return { ...s, attemptCount } as SessionWithCount;
          })
        );

        setSessions(withCounts);
      } catch (err) {
        console.error("Gagal memuat sesi:", err);
        setError("Gagal memuat sesi. Coba refresh halaman.");
      } finally {
        setLoading(false);
      }
    }

    loadSessions();
  }, [user]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !title.trim()) return;

    setCreating(true);
    setError("");
    try {
      // Kode 6 karakter acak (36^6 ≈ 2,2 miliar kombinasi) — peluang tabrakan
      // dapat diabaikan. Tidak melakukan pre-check query karena query list
      // tanpa constraint createdBy/published akan ditolak oleh security rules.
      const code = generateSessionCode();

      const newSession: Omit<Session, "code"> = {
        title: title.trim(),
        rawMaterial: "",
        questions: [],
        timerSeconds: 15,
        published: false,
        createdBy: user.uid,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await setDoc(doc(db, "sessions", code), newSession);
      router.push(`/admin/session/${code}`);
    } catch (err) {
      console.error("Gagal membuat sesi:", err);
      setError("Gagal membuat sesi. Coba lagi.");
      setCreating(false);
    }
  }

  if (authLoading || !user) {
    return (
      <div className="flex-1 grid place-items-center">
        <p className="text-slate-500">Memuat...</p>
      </div>
    );
  }

  return (
    <>
      <AdminHeader />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Dashboard Guru</h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola sesi latihan cerdas cermat keuangan syariah.
          </p>
        </div>

        {/* Buat sesi baru */}
        <div className="card p-5 mb-8">
          <h2 className="font-bold text-slate-900 mb-3">Buat Sesi Baru</h2>
          <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Judul sesi, contoh: Bab 1 — Prinsip Syariah"
              required
              className="input flex-1"
            />
            <button
              type="submit"
              disabled={creating || !title.trim()}
              className="btn-primary btn-lg whitespace-nowrap"
            >
              {creating ? "Membuat..." : "Buat Sesi"}
            </button>
          </form>
        </div>

        {/* Daftar sesi */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-900">Sesi Saya</h2>
          {!loading && sessions.length > 0 && (
            <span className="text-sm text-slate-400">{sessions.length} sesi</span>
          )}
        </div>

        {error && (
          <div className="card p-4 mb-4 border-red-200 bg-red-50 text-red-700 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-slate-500">Memuat sesi...</p>
        ) : sessions.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-slate-600 font-medium">Belum ada sesi</p>
            <p className="text-sm text-slate-400 mt-1">
              Buat sesi pertama Anda menggunakan form di atas.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {sessions.map((session) => (
              <a
                key={session.code}
                href={`/admin/session/${session.code}`}
                className="card p-5 hover:shadow-md hover:border-primary-200 transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="font-bold text-slate-900 leading-snug">
                    {session.title}
                  </h3>
                  <span
                    className={
                      session.published ? "badge-success" : "badge-muted"
                    }
                  >
                    {session.published ? "Published" : "Draft"}
                  </span>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                  <span>{session.questions.length} soal</span>
                  <span>{session.timerSeconds}d / soal</span>
                  <span>{session.attemptCount} peserta</span>
                </div>

                {session.published && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
                    <span className="text-xs text-slate-400">Kode:</span>
                    <span className="font-mono font-bold tracking-widest text-primary-700">
                      {session.code}
                    </span>
                  </div>
                )}
              </a>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
