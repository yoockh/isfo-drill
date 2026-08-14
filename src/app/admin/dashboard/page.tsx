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
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Star, Dot, Square } from "@/components/ui/Decor";
import { generateSessionCode } from "@/lib/utils";
import type { Session } from "@/lib/types";

interface SessionWithCount extends Session {
  attemptCount: number;
}

// Rotasi warna aksen kartu supaya dashboard terasa "hidup"
const CARD_COLORS = ["mustard", "teal", "pink", "purple"] as const;

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
      // Kode 6 karakter acak (36^6 ~ 2,2 miliar) — peluang tabrakan diabaikan.
      // Tanpa pre-check query agar tidak kena penolakan security rules.
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
        <p className="font-bold text-[#1a1a1a]/60">Memuat...</p>
      </div>
    );
  }

  return (
    <>
      <AdminHeader />
      <main className="relative flex-1 max-w-4xl w-full mx-auto px-4 py-8 overflow-hidden">
        {/* Dekorasi */}
        <Star className="hidden md:block absolute top-6 right-4 w-10 h-10" color="var(--color-mustard)" />
        <Dot className="hidden md:block absolute top-40 right-2 w-7 h-7" color="var(--color-pink)" />

        <div className="mb-6 relative">
          <h1 className="text-3xl font-extrabold tracking-tight">DASHBOARD GURU</h1>
          <p className="font-bold text-[#1a1a1a]/70 mt-1">
            Kelola sesi latihan cerdas cermat keuangan syariah.
          </p>
        </div>

        {/* Buat sesi baru */}
        <Card color="purple" className="p-5 mb-8">
          <h2 className="font-extrabold text-lg mb-3 flex items-center gap-2">
            <Square className="w-5 h-5 rotate-0" color="var(--color-mustard)" />
            BUAT SESI BARU
          </h2>
          <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Judul sesi, contoh: Bab 1 — Prinsip Syariah"
              required
              className="nb-input flex-1"
            />
            <Button
              type="submit"
              color="mustard"
              size="lg"
              disabled={creating || !title.trim()}
              className="whitespace-nowrap"
            >
              {creating ? "Membuat..." : "+ Buat Sesi"}
            </Button>
          </form>
        </Card>

        {/* Daftar sesi */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-extrabold text-lg">SESI SAYA</h2>
          {!loading && sessions.length > 0 && (
            <Badge color="teal">{sessions.length} SESI</Badge>
          )}
        </div>

        {error && (
          <Card color="red" className="p-4 mb-4 font-bold text-sm">
            {error}
          </Card>
        )}

        {loading ? (
          <p className="font-bold text-[#1a1a1a]/60">Memuat sesi...</p>
        ) : sessions.length === 0 ? (
          <Card className="p-10 text-center">
            <div className="inline-block mb-3">
              <Star className="w-10 h-10 mx-auto" color="var(--color-mustard)" />
            </div>
            <p className="font-extrabold text-lg">BELUM ADA SESI</p>
            <p className="font-bold text-[#1a1a1a]/60 mt-1">
              Buat sesi pertama Anda menggunakan form di atas.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {sessions.map((session, i) => (
              <a
                key={session.code}
                href={`/admin/session/${session.code}`}
                className="nb-card nb-white p-5 block transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <span
                    className="inline-block w-8 h-8 shrink-0 border-[2.5px] border-[#1a1a1a] rounded-[6px]"
                    style={{
                      backgroundColor: `var(--color-${
                        session.published ? "nb-green" : CARD_COLORS[i % CARD_COLORS.length]
                      })`,
                    }}
                    aria-hidden
                  />
                  <Badge color={session.published ? "green" : "white"}>
                    {session.published ? "PUBLISHED" : "DRAFT"}
                  </Badge>
                </div>

                <h3 className="font-extrabold text-lg leading-snug mb-3">
                  {session.title}
                </h3>

                <div className="flex flex-wrap gap-2 text-xs font-bold">
                  <span className="border-[2px] border-[#1a1a1a] rounded-[5px] px-2 py-0.5">
                    {session.questions.length} soal
                  </span>
                  <span className="border-[2px] border-[#1a1a1a] rounded-[5px] px-2 py-0.5">
                    {session.timerSeconds}d/soal
                  </span>
                  <span className="border-[2px] border-[#1a1a1a] rounded-[5px] px-2 py-0.5">
                    {session.attemptCount} peserta
                  </span>
                </div>

                {session.published && (
                  <div className="mt-3 pt-3 border-t-[2.5px] border-[#1a1a1a]/15 flex items-center gap-2">
                    <span className="text-xs font-bold text-[#1a1a1a]/50">KODE:</span>
                    <span className="font-mono font-extrabold tracking-widest nb-mustard border-[2px] border-[#1a1a1a] rounded-[5px] px-2">
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
