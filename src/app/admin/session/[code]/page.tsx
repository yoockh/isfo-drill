"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/hooks/useAuth";
import { QuestionEditor } from "@/components/admin/QuestionEditor";
import { generateQuestionId } from "@/lib/utils";
import type { Session, Question } from "@/lib/types";

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  const { user, loading: authLoading, getIdToken } = useAuth();

  const [session, setSession] = useState<Session | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [rawMaterial, setRawMaterial] = useState("");
  const [timerSeconds, setTimerSeconds] = useState(15);
  const [questionCount, setQuestionCount] = useState(10);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/admin");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    async function loadSession() {
      try {
        const snap = await getDoc(doc(db, "sessions", code));
        if (!snap.exists()) {
          setMessage("Sesi tidak ditemukan");
          return;
        }
        const data = { ...snap.data(), code } as Session;
        setSession(data);
        setQuestions(data.questions || []);
        setRawMaterial(data.rawMaterial || "");
        setTimerSeconds(data.timerSeconds || 15);
      } catch {
        setMessage("Gagal memuat sesi");
      } finally {
        setLoading(false);
      }
    }

    if (user) loadSession();
  }, [code, user]);

  async function handleGenerate() {
    if (!rawMaterial.trim()) {
      setMessage("Masukkan materi terlebih dahulu");
      return;
    }

    setGenerating(true);
    setMessage("");

    try {
      const token = await getIdToken();
      const res = await fetch("/api/generate-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ material: rawMaterial, count: questionCount }),
      });

      if (!res.ok) {
        const err = await res.json();
        setMessage(err.error || "Gagal generate soal");
        return;
      }

      const data = await res.json();
      const newQuestions: Question[] = data.questions.map(
        (q: { text: string; options: string[]; correctIndex: number }) => ({
          id: generateQuestionId(),
          text: q.text,
          options: q.options as [string, string, string, string],
          correctIndex: q.correctIndex,
        })
      );

      setQuestions((prev) => [...prev, ...newQuestions]);
      setMessage(`${newQuestions.length} soal berhasil di-generate!`);
    } catch {
      setMessage("Gagal generate soal. Coba lagi.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");

    try {
      await updateDoc(doc(db, "sessions", code), {
        questions,
        rawMaterial,
        timerSeconds,
        updatedAt: Timestamp.now(),
      });
      setMessage("Sesi berhasil disimpan!");
    } catch {
      setMessage("Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    if (questions.length === 0) {
      setMessage("Tambahkan soal terlebih dahulu sebelum publish");
      return;
    }

    setPublishing(true);
    setMessage("");

    try {
      await updateDoc(doc(db, "sessions", code), {
        questions,
        rawMaterial,
        timerSeconds,
        published: true,
        updatedAt: Timestamp.now(),
      });
      setSession((prev) => (prev ? { ...prev, published: true } : null));
      setMessage(`Sesi berhasil dipublish! Kode sesi: ${code}`);
    } catch {
      setMessage("Gagal publish sesi");
    } finally {
      setPublishing(false);
    }
  }

  async function handleUnpublish() {
    try {
      await updateDoc(doc(db, "sessions", code), {
        published: false,
        updatedAt: Timestamp.now(),
      });
      setSession((prev) => (prev ? { ...prev, published: false } : null));
      setMessage("Sesi di-unpublish.");
    } catch {
      setMessage("Gagal unpublish sesi");
    }
  }

  function updateQuestion(index: number, updated: Question) {
    setQuestions((prev) => prev.map((q, i) => (i === index ? updated : q)));
  }

  function deleteQuestion(index: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  if (authLoading || loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">Memuat...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-red-500">{message || "Sesi tidak ditemukan"}</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <a
          href="/admin/dashboard"
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          &larr; Dashboard
        </a>
        <h1 className="text-2xl font-bold flex-1">{session.title}</h1>
        {session.published && (
          <a
            href={`/admin/session/${code}/attempts`}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Lihat Hasil
          </a>
        )}
      </div>

      {session.published && (
        <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-xl p-4 mb-6 flex justify-between items-center">
          <div>
            <p className="text-sm text-green-800 dark:text-green-200">
              Sesi sudah dipublish. Bagikan kode ke peserta:
            </p>
            <p className="text-3xl font-mono font-bold text-green-700 dark:text-green-300 tracking-widest">
              {code}
            </p>
          </div>
          <button
            onClick={handleUnpublish}
            className="text-sm text-red-600 hover:text-red-800 font-medium"
          >
            Unpublish
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
        <h2 className="text-lg font-bold mb-3">Materi Sumber</h2>
        <textarea
          value={rawMaterial}
          onChange={(e) => setRawMaterial(e.target.value)}
          rows={8}
          placeholder="Paste materi teks mentah di sini. AI akan generate soal berdasarkan materi ini..."
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-y text-sm"
        />
        <div className="flex flex-wrap gap-4 mt-4 items-end">
          <div>
            <label className="block text-sm font-medium mb-1">Jumlah soal</label>
            <input
              type="number"
              min={1}
              max={30}
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating || !rawMaterial.trim()}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-bold rounded-xl transition-colors"
          >
            {generating ? "Generating..." : "Generate Draft Soal"}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
        <h2 className="text-lg font-bold mb-3">Pengaturan Timer</h2>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={5}
            max={120}
            value={timerSeconds}
            onChange={(e) => setTimerSeconds(Number(e.target.value))}
            className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            detik per soal (default: 15)
          </span>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">
            Daftar Soal ({questions.length})
          </h2>
        </div>

        {questions.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            Belum ada soal. Generate dari materi di atas atau tambahkan manual.
          </p>
        ) : (
          <div className="space-y-4">
            {questions.map((q, i) => (
              <QuestionEditor
                key={q.id}
                question={q}
                index={i}
                onChange={(updated) => updateQuestion(i, updated)}
                onDelete={() => deleteQuestion(i)}
              />
            ))}
          </div>
        )}
      </div>

      {message && (
        <div className="mb-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 text-center text-sm">
          {message}
        </div>
      )}

      <div className="flex flex-wrap gap-3 sticky bottom-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-3 bg-gray-700 hover:bg-gray-800 disabled:bg-gray-400 text-white font-bold rounded-xl transition-colors"
        >
          {saving ? "Menyimpan..." : "Simpan Draft"}
        </button>
        {!session.published && (
          <button
            onClick={handlePublish}
            disabled={publishing || questions.length === 0}
            className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold rounded-xl transition-colors"
          >
            {publishing ? "Publishing..." : "Publish Sesi"}
          </button>
        )}
      </div>
    </div>
  );
}
