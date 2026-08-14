"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/hooks/useAuth";
import { AdminHeader } from "@/components/admin/AdminHeader";
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
  const [isError, setIsError] = useState(false);

  function notify(text: string, error = false) {
    setMessage(text);
    setIsError(error);
  }

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
          notify("Sesi tidak ditemukan", true);
          return;
        }
        const data = { ...snap.data(), code } as Session;
        setSession(data);
        setQuestions(data.questions || []);
        setRawMaterial(data.rawMaterial || "");
        setTimerSeconds(data.timerSeconds || 15);
      } catch {
        notify("Gagal memuat sesi", true);
      } finally {
        setLoading(false);
      }
    }

    if (user) loadSession();
  }, [code, user]);

  async function handleGenerate() {
    if (!rawMaterial.trim()) {
      notify("Masukkan materi terlebih dahulu", true);
      return;
    }

    setGenerating(true);
    notify("");

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
        notify(err.error || "Gagal generate soal", true);
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
      notify(`${newQuestions.length} soal berhasil di-generate!`);
    } catch {
      notify("Gagal generate soal. Coba lagi.", true);
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    notify("");

    try {
      await updateDoc(doc(db, "sessions", code), {
        questions,
        rawMaterial,
        timerSeconds,
        updatedAt: Timestamp.now(),
      });
      notify("Draft berhasil disimpan!");
    } catch {
      notify("Gagal menyimpan", true);
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    if (questions.length === 0) {
      notify("Tambahkan soal terlebih dahulu sebelum publish", true);
      return;
    }

    setPublishing(true);
    notify("");

    try {
      await updateDoc(doc(db, "sessions", code), {
        questions,
        rawMaterial,
        timerSeconds,
        published: true,
        updatedAt: Timestamp.now(),
      });
      setSession((prev) => (prev ? { ...prev, published: true } : null));
      notify(`Sesi berhasil dipublish! Kode: ${code}`);
    } catch {
      notify("Gagal publish sesi", true);
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
      notify("Sesi di-unpublish.");
    } catch {
      notify("Gagal unpublish sesi", true);
    }
  }

  function updateQuestion(index: number, updated: Question) {
    setQuestions((prev) => prev.map((q, i) => (i === index ? updated : q)));
  }

  function deleteQuestion(index: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  function addManualQuestion() {
    setQuestions((prev) => [
      ...prev,
      {
        id: generateQuestionId(),
        text: "",
        options: ["", "", "", ""],
        correctIndex: 0,
      },
    ]);
  }

  if (authLoading || loading) {
    return (
      <div className="flex-1 grid place-items-center">
        <p className="text-slate-500">Memuat...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <>
        <AdminHeader />
        <div className="flex-1 grid place-items-center px-4">
          <div className="card p-8 text-center">
            <p className="text-red-600 mb-4">{message || "Sesi tidak ditemukan"}</p>
            <a href="/admin/dashboard" className="btn-primary">
              Kembali ke Dashboard
            </a>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AdminHeader />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 pb-28">
        {/* Breadcrumb + judul */}
        <div className="mb-6">
          <a
            href="/admin/dashboard"
            className="text-sm text-slate-500 hover:text-primary-700"
          >
            ← Dashboard
          </a>
          <div className="flex items-center justify-between gap-4 mt-2">
            <h1 className="text-2xl font-bold text-slate-900">{session.title}</h1>
            <span className={session.published ? "badge-success" : "badge-muted"}>
              {session.published ? "Published" : "Draft"}
            </span>
          </div>
        </div>

        {/* Banner published */}
        {session.published && (
          <div className="card p-5 mb-6 border-primary-200 bg-primary-50">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm text-primary-800">
                  Sesi aktif. Bagikan kode ke peserta:
                </p>
                <p className="text-3xl font-mono font-bold text-primary-700 tracking-widest">
                  {code}
                </p>
              </div>
              <div className="flex gap-2">
                <a
                  href={`/admin/session/${code}/attempts`}
                  className="btn-secondary"
                >
                  Lihat Hasil
                </a>
                <button onClick={handleUnpublish} className="btn-danger">
                  Unpublish
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Materi sumber + generate */}
        <section className="card p-5 mb-6">
          <h2 className="font-bold text-slate-900 mb-1">Materi Sumber</h2>
          <p className="text-sm text-slate-500 mb-3">
            Tempel materi, lalu biarkan AI membuat draft soal pilihan ganda.
          </p>
          <textarea
            value={rawMaterial}
            onChange={(e) => setRawMaterial(e.target.value)}
            rows={7}
            placeholder="Paste materi teks mentah di sini..."
            className="textarea text-sm"
          />
          <div className="flex flex-wrap items-end gap-4 mt-4">
            <div>
              <label className="label">Jumlah soal</label>
              <input
                type="number"
                min={1}
                max={30}
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="input w-24"
              />
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating || !rawMaterial.trim()}
              className="btn-primary"
            >
              {generating ? "Generating..." : "Generate Draft Soal"}
            </button>
          </div>
        </section>

        {/* Timer */}
        <section className="card p-5 mb-6">
          <h2 className="font-bold text-slate-900 mb-1">Pengaturan Timer</h2>
          <p className="text-sm text-slate-500 mb-3">
            Waktu maksimal peserta menjawab setiap soal.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={5}
              max={120}
              value={timerSeconds}
              onChange={(e) => setTimerSeconds(Number(e.target.value))}
              className="input w-24"
            />
            <span className="text-sm text-slate-500">detik per soal (default: 15)</span>
          </div>
        </section>

        {/* Daftar soal */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900">
              Daftar Soal ({questions.length})
            </h2>
            <button onClick={addManualQuestion} className="btn-secondary">
              + Tambah Manual
            </button>
          </div>

          {questions.length === 0 ? (
            <div className="card p-10 text-center">
              <p className="text-slate-600 font-medium">Belum ada soal</p>
              <p className="text-sm text-slate-400 mt-1">
                Generate dari materi di atas atau tambahkan manual.
              </p>
            </div>
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
        </section>
      </main>

      {/* Action bar sticky */}
      <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-3">
          {message && (
            <p
              className={`text-sm text-center mb-2 rounded-lg py-1.5 px-3 ${
                isError
                  ? "bg-red-50 text-red-700"
                  : "bg-primary-50 text-primary-700"
              }`}
            >
              {message}
            </p>
          )}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-secondary btn-lg flex-1"
            >
              {saving ? "Menyimpan..." : "Simpan Draft"}
            </button>
            {!session.published && (
              <button
                onClick={handlePublish}
                disabled={publishing || questions.length === 0}
                className="btn-primary btn-lg flex-1"
              >
                {publishing ? "Publishing..." : "Publish Sesi"}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
