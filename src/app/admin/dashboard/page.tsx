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
import { signOut } from "firebase/auth";
import { db, auth } from "@/lib/firebase/client";
import { useAuth } from "@/hooks/useAuth";
import { generateSessionCode } from "@/lib/utils";
import type { Session } from "@/lib/types";

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");

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
        const data = snap.docs.map((d) => ({ ...d.data(), code: d.id } as Session));
        setSessions(data);
      } catch (error) {
        console.error("Gagal memuat sesi:", error);
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
    try {
      let code = generateSessionCode();
      const maxRetries = 5;
      for (let i = 0; i < maxRetries; i++) {
        const existing = await getDocs(
          query(collection(db, "sessions"), where("__name__", "==", code))
        );
        if (existing.empty) break;
        code = generateSessionCode();
      }

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
    } catch (error) {
      console.error("Gagal membuat sesi:", error);
    } finally {
      setCreating(false);
    }
  }

  async function handleLogout() {
    await signOut(auth);
    router.replace("/admin");
  }

  if (authLoading || !user) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">Memuat...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Guru</h1>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-red-600 hover:text-red-800 font-medium"
        >
          Keluar
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-8">
        <h2 className="text-lg font-bold mb-4">Buat Sesi Baru</h2>
        <form onSubmit={handleCreate} className="flex gap-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Judul sesi, contoh: Bab 1 - Prinsip Syariah"
            required
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
          <button
            type="submit"
            disabled={creating || !title.trim()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold rounded-xl transition-colors whitespace-nowrap"
          >
            {creating ? "Membuat..." : "Buat"}
          </button>
        </form>
      </div>

      <h2 className="text-lg font-bold mb-4">Sesi Saya</h2>
      {loading ? (
        <p className="text-gray-500">Memuat sesi...</p>
      ) : sessions.length === 0 ? (
        <p className="text-gray-500">Belum ada sesi. Buat sesi baru di atas.</p>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <a
              key={session.code}
              href={`/admin/session/${session.code}`}
              className="block bg-white dark:bg-gray-800 rounded-xl shadow p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold">{session.title}</h3>
                  <p className="text-sm text-gray-500">
                    {session.questions.length} soal &middot;{" "}
                    {session.timerSeconds}d/soal
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                      session.published
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                    }`}
                  >
                    {session.published ? "Published" : "Draft"}
                  </span>
                  {session.published && (
                    <p className="text-sm font-mono mt-1 text-blue-600 dark:text-blue-400">
                      {session.code}
                    </p>
                  )}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
