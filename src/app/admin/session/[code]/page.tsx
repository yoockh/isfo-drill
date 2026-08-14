"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/hooks/useAuth";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { QuestionEditor } from "@/components/admin/QuestionEditor";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
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
  const [regenOpen, setRegenOpen] = useState(false);

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

  // mode "append": tambahkan ke daftar soal yang ada.
  // mode "replace": ganti total seluruh draft soal.
  async function handleGenerate(mode: "append" | "replace" = "append") {
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

      if (mode === "replace") {
        setQuestions(newQuestions);
        notify(`Draft diganti dengan ${newQuestions.length} soal baru! Jangan lupa Simpan.`);
      } else {
        setQuestions((prev) => [...prev, ...newQuestions]);
        notify(`${newQuestions.length} soal ditambahkan! Jangan lupa Simpan.`);
      }
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
        <p className="font-bold text-[#1a1a1a]/60">Memuat...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <>
        <AdminHeader />
        <div className="flex-1 grid place-items-center px-4">
          <Card color="red" className="p-8 text-center">
            <p className="font-extrabold mb-4">{message || "Sesi tidak ditemukan"}</p>
            <a href="/admin/dashboard" className="nb-btn nb-mustard">
              Kembali ke Dashboard
            </a>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <AdminHeader />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 pb-32">
        {/* Breadcrumb + judul */}
        <div className="mb-6">
          <a
            href="/admin/dashboard"
            className="inline-block text-sm font-extrabold hover:underline"
          >
            ← DASHBOARD
          </a>
          <div className="flex items-center justify-between gap-4 mt-2">
            <h1 className="text-3xl font-extrabold tracking-tight">{session.title}</h1>
            <Badge color={session.published ? "green" : "mustard"}>
              {session.published ? "PUBLISHED" : "DRAFT"}
            </Badge>
          </div>
        </div>

        {/* Banner published */}
        {session.published && (
          <Card color="green" className="p-5 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-extrabold uppercase tracking-wide">
                  Sesi aktif — bagikan kode ke peserta:
                </p>
                <p className="text-4xl font-mono font-extrabold tracking-widest mt-1">
                  {code}
                </p>
              </div>
              <div className="flex gap-2">
                <a href={`/admin/session/${code}/attempts`} className="nb-btn nb-white">
                  Lihat Hasil
                </a>
                <Button color="red" onClick={handleUnpublish}>
                  Unpublish
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Materi sumber + generate */}
        <Card className="p-5 mb-6">
          <h2 className="font-extrabold text-lg mb-1">MATERI SUMBER</h2>
          <p className="text-sm font-bold text-[#1a1a1a]/60 mb-3">
            Tempel materi, lalu biarkan AI membuat draft soal pilihan ganda.
          </p>
          <textarea
            value={rawMaterial}
            onChange={(e) => setRawMaterial(e.target.value)}
            rows={7}
            placeholder="Paste materi teks mentah di sini..."
            className="nb-input resize-y text-sm"
          />
          <div className="flex justify-between items-center text-xs font-bold text-[#1a1a1a]/60 mt-1 px-1">
            <span>Maksimal 40.000 karakter</span>
            <span className={rawMaterial.length > 40000 ? "text-[#e85d04]" : ""}>
              {rawMaterial.length.toLocaleString()} / 40.000 karakter
            </span>
          </div>
          <div className="flex flex-wrap items-end gap-4 mt-4">
            <div>
              <label className="block text-sm font-extrabold uppercase tracking-wide mb-1.5">
                Jumlah soal (1-60)
              </label>
              <input
                type="number"
                min={1}
                max={60}
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="nb-input w-24"
              />
            </div>

            {questions.length === 0 ? (
              // Sesi masih kosong: satu tombol generate dari nol.
              <Button
                color="mustard"
                onClick={() => handleGenerate("append")}
                disabled={generating || !rawMaterial.trim()}
              >
                {generating ? "Generating..." : "⚡ Generate Draft Soal"}
              </Button>
            ) : (
              // Sesi sudah punya soal: dua aksi terpisah.
              <>
                <Button
                  color="purple"
                  onClick={() => handleGenerate("append")}
                  disabled={generating || !rawMaterial.trim()}
                >
                  {generating ? "Memproses..." : "+ Tambah Soal Baru"}
                </Button>
                <Button
                  color="red"
                  onClick={() => setRegenOpen(true)}
                  disabled={generating || !rawMaterial.trim()}
                >
                  Generate Ulang Semua
                </Button>
              </>
            )}
          </div>

          {questions.length > 0 && (
            <p className="text-xs font-bold text-[#1a1a1a]/60 mt-3">
              &ldquo;+ Tambah Soal Baru&rdquo; menambah soal di bawah yang sudah ada.
              &ldquo;Generate Ulang Semua&rdquo; mengganti seluruh {questions.length} soal.
              {session.published && (
                <span className="text-[var(--color-nb-red)]">
                  {" "}Sesi ini sudah published — mengubah soal dapat membuat
                  statistik pada riwayat pengerjaan lama tidak konsisten.
                </span>
              )}
            </p>
          )}
        </Card>

        {/* Timer */}
        <Card className="p-5 mb-6">
          <h2 className="font-extrabold text-lg mb-1">PENGATURAN TIMER</h2>
          <p className="text-sm font-bold text-[#1a1a1a]/60 mb-3">
            Waktu maksimal peserta menjawab setiap soal.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={5}
              max={120}
              value={timerSeconds}
              onChange={(e) => setTimerSeconds(Number(e.target.value))}
              className="nb-input w-24"
            />
            <span className="text-sm font-bold text-[#1a1a1a]/70">
              detik per soal (default: 15)
            </span>
          </div>
        </Card>

        {/* Daftar soal */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-extrabold text-lg">
              DAFTAR SOAL ({questions.length})
            </h2>
            <Button color="purple" onClick={addManualQuestion}>
              + Tambah Manual
            </Button>
          </div>

          {questions.length === 0 ? (
            <Card className="p-10 text-center">
              <p className="font-extrabold text-lg">BELUM ADA SOAL</p>
              <p className="font-bold text-[#1a1a1a]/60 mt-1">
                Generate dari materi di atas atau tambahkan manual.
              </p>
            </Card>
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
      <div className="sticky bottom-0 bg-[var(--paper)] border-t-[2.5px] sm:border-t-[3px] border-[#1a1a1a]">
        <div className="max-w-4xl mx-auto px-4 py-3">
          {message && (
            <p
              className={`text-sm font-bold text-center mb-2 border-[2.5px] border-[#1a1a1a] rounded-[6px] py-1.5 px-3 ${
                isError ? "nb-red" : "nb-green"
              }`}
            >
              {message}
            </p>
          )}
          <div className="flex gap-3">
            <Button
              color="white"
              size="lg"
              onClick={handleSave}
              disabled={saving}
              className="flex-1"
            >
              {saving ? "Menyimpan..." : "Simpan Draft"}
            </Button>
            {!session.published && (
              <Button
                color="mustard"
                size="lg"
                onClick={handlePublish}
                disabled={publishing || questions.length === 0}
                className="flex-1"
              >
                {publishing ? "Publishing..." : "Publish Sesi →"}
              </Button>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={regenOpen}
        title="Generate ulang semua soal?"
        message={`Ini akan menghapus ${questions.length} soal yang sudah ada dan menggantinya dengan draft baru dari materi. Soal yang sudah diedit akan hilang. Lanjutkan?`}
        confirmLabel="Ya, Ganti Semua"
        cancelLabel="Batal"
        confirmColor="red"
        loading={generating}
        onConfirm={async () => {
          await handleGenerate("replace");
          setRegenOpen(false);
        }}
        onCancel={() => setRegenOpen(false)}
      />
    </>
  );
}
