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
import { MergeQuestionsDialog } from "@/components/admin/MergeQuestionsDialog";
import { generateQuestionId, shuffleArray } from "@/lib/utils";
import { SUBJECTS, LEVELS, type SubjectId, type LevelId } from "@/lib/subjects";
import { extractTextFromFile, isSupportedFile } from "@/lib/pdf";
import { Shuffle, Layers, Sparkles, FileText, ClipboardList, Upload, Settings2 } from "lucide-react";
import type { Session, Question } from "@/lib/types";

type InputMode = "generate" | "import";

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
  const [subject, setSubject] = useState<SubjectId>("umum");
  const [level, setLevel] = useState<LevelId>("sma");
  const [customInstruction, setCustomInstruction] = useState("");
  const [inputMode, setInputMode] = useState<InputMode>("generate");
  const [extracting, setExtracting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);
  const [importReplaceOpen, setImportReplaceOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [shuffleOpen, setShuffleOpen] = useState(false);

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
        if (data.subject) setSubject(data.subject);
        if (data.level) setLevel(data.level);
        if (data.customInstruction) setCustomInstruction(data.customInstruction);
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
        body: JSON.stringify({
          material: rawMaterial,
          count: questionCount,
          subject,
          level,
          customInstruction,
        }),
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

  // Impor: teks yang SUDAH berupa daftar soal → AI hanya menata jadi struktur.
  async function handleImport(mode: "append" | "replace" = "append") {
    if (!rawMaterial.trim()) {
      notify("Tempel atau unggah daftar soal terlebih dahulu", true);
      return;
    }

    setImporting(true);
    notify("");

    try {
      const token = await getIdToken();
      const res = await fetch("/api/import-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ material: rawMaterial }),
      });

      if (!res.ok) {
        const err = await res.json();
        notify(err.error || "Gagal mengimpor soal", true);
        return;
      }

      const data = await res.json();
      const newQuestions: Question[] = data.questions.map(
        (q: { text: string; options: string[]; correctIndex: number }) => ({
          id: generateQuestionId(),
          text: q.text,
          options: q.options,
          correctIndex: q.correctIndex,
        })
      );

      if (mode === "replace") {
        setQuestions(newQuestions);
      } else {
        setQuestions((prev) => [...prev, ...newQuestions]);
      }
      notify(
        `${newQuestions.length} soal berhasil diimpor! Periksa kunci jawaban lalu Simpan.`
      );
    } catch {
      notify("Gagal mengimpor soal. Coba lagi.", true);
    } finally {
      setImporting(false);
    }
  }

  // Ekstrak teks dari file (PDF/TXT) di browser — tanpa upload/penyimpanan.
  async function handleFile(file: File | undefined | null) {
    if (!file) return;
    if (!isSupportedFile(file)) {
      notify("Format tidak didukung. Gunakan file PDF atau TXT.", true);
      return;
    }
    setExtracting(true);
    notify("");
    try {
      const text = await extractTextFromFile(file);
      if (!text || text.trim().length < 10) {
        notify(
          "Tidak ada teks yang bisa dibaca dari file. PDF hasil scan (gambar) belum didukung.",
          true
        );
        return;
      }
      setRawMaterial(text.slice(0, 60000));
      notify(
        `Teks dari "${file.name}" berhasil dibaca (${text.length.toLocaleString()} karakter).`
      );
    } catch (err) {
      console.error(err);
      notify("Gagal membaca file. Coba file lain.", true);
    } finally {
      setExtracting(false);
    }
  }

  function handleMergeQuestions(mergedQuestions: Question[]) {
    setQuestions((prev) => [...prev, ...mergedQuestions]);
    notify(`Berhasil menggabungkan ${mergedQuestions.length} soal dari sesi lain! Jangan lupa Simpan.`);
  }

  function handleShuffleQuestions() {
    if (questions.length <= 1) {
      notify("Minimal ada 2 soal untuk diacak.", true);
      return;
    }
    setQuestions((prev) => shuffleArray(prev));
    notify(`Urutan ${questions.length} soal berhasil diacak! Jangan lupa Simpan.`);
  }

  async function handleSave() {
    setSaving(true);
    notify("");

    try {
      await updateDoc(doc(db, "sessions", code), {
        questions,
        rawMaterial,
        timerSeconds,
        subject,
        level,
        customInstruction,
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
        subject,
        level,
        customInstruction,
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

        {/* Pengaturan AI: bidang, jenjang, instruksi tambahan */}
        <Card color="purple" className="p-5 mb-6">
          <h2 className="font-extrabold text-lg mb-1 flex items-center gap-2">
            <Settings2 className="w-5 h-5" /> PENGATURAN AI
          </h2>
          <p className="text-sm font-bold text-[#1a1a1a]/60 mb-4">
            Tentukan bidang & jenjang agar AI membuat soal yang relevan.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-extrabold uppercase tracking-wide mb-1.5">
                Bidang
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value as SubjectId)}
                className="nb-input font-bold cursor-pointer"
              >
                {SUBJECTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.emoji} {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-extrabold uppercase tracking-wide mb-1.5">
                Jenjang
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as LevelId)}
                className="nb-input font-bold cursor-pointer"
              >
                {LEVELS.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-extrabold uppercase tracking-wide mb-1.5">
              Instruksi Tambahan{" "}
              <span className="text-[#1a1a1a]/50 font-bold normal-case">(opsional)</span>
            </label>
            <textarea
              value={customInstruction}
              onChange={(e) => setCustomInstruction(e.target.value)}
              rows={2}
              maxLength={1000}
              placeholder="Contoh: fokus ke web security & OWASP Top 10, sertakan skenario nyata."
              className="nb-input resize-y text-sm"
            />
          </div>
        </Card>

        {/* Materi / Soal + generate / impor */}
        <Card className="p-5 mb-6">
          {/* Toggle mode input */}
          <div className="inline-flex mb-4 border-[2.5px] border-[#1a1a1a] rounded-[8px] overflow-hidden">
            <button
              type="button"
              onClick={() => setInputMode("generate")}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-extrabold transition-colors ${
                inputMode === "generate" ? "nb-mustard" : "bg-white hover:bg-black/5"
              }`}
            >
              <FileText className="w-4 h-4" /> Dari Materi
            </button>
            <button
              type="button"
              onClick={() => setInputMode("import")}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-extrabold border-l-[2.5px] border-[#1a1a1a] transition-colors ${
                inputMode === "import" ? "nb-mustard" : "bg-white hover:bg-black/5"
              }`}
            >
              <ClipboardList className="w-4 h-4" /> Impor Soal Jadi
            </button>
          </div>

          <h2 className="font-extrabold text-lg mb-1">
            {inputMode === "generate" ? "MATERI SUMBER" : "DAFTAR SOAL SIAP PAKAI"}
          </h2>
          <p className="text-sm font-bold text-[#1a1a1a]/60 mb-3">
            {inputMode === "generate"
              ? "Tempel/unggah materi, lalu biarkan AI membuat draft soal pilihan ganda."
              : "Tempel/unggah teks yang SUDAH berupa daftar soal — AI hanya menatanya jadi soal siap edit (tidak mengarang soal baru)."}
          </p>

          {/* Upload file (PDF/TXT) → diekstrak jadi teks di browser */}
          <label className="inline-flex items-center gap-1.5 mb-3 nb-btn nb-white text-sm py-2 px-3 cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>{extracting ? "Membaca file..." : "Unggah PDF / TXT"}</span>
            <input
              type="file"
              accept=".pdf,.txt,application/pdf,text/plain"
              className="hidden"
              disabled={extracting}
              onChange={(e) => {
                handleFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>

          <textarea
            value={rawMaterial}
            onChange={(e) => setRawMaterial(e.target.value)}
            rows={7}
            placeholder={
              inputMode === "generate"
                ? "Paste materi teks mentah di sini, atau unggah file di atas..."
                : "Paste daftar soal (beserta opsi & kunci jawaban bila ada), atau unggah file..."
            }
            className="nb-input resize-y text-sm"
          />
          <div className="flex justify-between items-center text-xs font-bold text-[#1a1a1a]/60 mt-1 px-1">
            <span>Maksimal 60.000 karakter</span>
            <span className={rawMaterial.length > 60000 ? "text-[#e85d04]" : ""}>
              {rawMaterial.length.toLocaleString()} / 60.000 karakter
            </span>
          </div>

          <div className="flex flex-wrap items-end gap-3 mt-4">
            {inputMode === "generate" && (
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
            )}

            {inputMode === "generate" ? (
              questions.length === 0 ? (
                <>
                  <Button
                    color="mustard"
                    onClick={() => handleGenerate("append")}
                    disabled={generating || !rawMaterial.trim()}
                    className="flex items-center gap-1.5"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{generating ? "Generating..." : "Generate Draft Soal"}</span>
                  </Button>
                  <Button
                    color="white"
                    onClick={() => setMergeOpen(true)}
                    disabled={generating}
                    className="flex items-center gap-1.5"
                  >
                    <Layers className="w-4 h-4" />
                    <span>Gabungkan Soal dari Sesi Lain</span>
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    color="purple"
                    onClick={() => handleGenerate("append")}
                    disabled={generating || !rawMaterial.trim()}
                  >
                    {generating ? "Memproses..." : "+ Tambah Soal Baru"}
                  </Button>
                  <Button
                    color="teal"
                    onClick={() => setShuffleOpen(true)}
                    disabled={generating}
                    className="flex items-center gap-1.5"
                  >
                    <Shuffle className="w-4 h-4" />
                    <span>Acak Soal</span>
                  </Button>
                  <Button
                    color="red"
                    onClick={() => setRegenOpen(true)}
                    disabled={generating || !rawMaterial.trim()}
                  >
                    Generate Ulang Semua
                  </Button>
                </>
              )
            ) : questions.length === 0 ? (
              <>
                <Button
                  color="mustard"
                  onClick={() => handleImport("append")}
                  disabled={importing || !rawMaterial.trim()}
                  className="flex items-center gap-1.5"
                >
                  <ClipboardList className="w-4 h-4" />
                  <span>{importing ? "Mengimpor..." : "Impor Soal"}</span>
                </Button>
                <Button
                  color="white"
                  onClick={() => setMergeOpen(true)}
                  disabled={importing}
                  className="flex items-center gap-1.5"
                >
                  <Layers className="w-4 h-4" />
                  <span>Gabungkan Soal dari Sesi Lain</span>
                </Button>
              </>
            ) : (
              <>
                <Button
                  color="purple"
                  onClick={() => handleImport("append")}
                  disabled={importing || !rawMaterial.trim()}
                >
                  {importing ? "Mengimpor..." : "+ Tambah dari Impor"}
                </Button>
                <Button
                  color="teal"
                  onClick={() => setShuffleOpen(true)}
                  disabled={importing}
                  className="flex items-center gap-1.5"
                >
                  <Shuffle className="w-4 h-4" />
                  <span>Acak Soal</span>
                </Button>
                <Button
                  color="red"
                  onClick={() => setImportReplaceOpen(true)}
                  disabled={importing || !rawMaterial.trim()}
                >
                  Impor & Ganti Semua
                </Button>
              </>
            )}
          </div>

          {questions.length > 0 && session.published && (
            <p className="text-xs font-bold text-[var(--color-nb-red)] mt-3">
              Sesi ini sudah published — mengubah soal dapat membuat statistik
              pada riwayat pengerjaan lama tidak konsisten.
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
                Generate dari materi di atas, gabungkan dari sesi lain, atau tambahkan manual.
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

      <ConfirmDialog
        open={importReplaceOpen}
        title="Impor & ganti semua soal?"
        message={`Ini akan menghapus ${questions.length} soal yang ada dan menggantinya dengan hasil impor dari teks di atas. Lanjutkan?`}
        confirmLabel="Ya, Ganti Semua"
        cancelLabel="Batal"
        confirmColor="red"
        loading={importing}
        onConfirm={async () => {
          await handleImport("replace");
          setImportReplaceOpen(false);
        }}
        onCancel={() => setImportReplaceOpen(false)}
      />

      <ConfirmDialog
        open={shuffleOpen}
        title="Acak urutan soal?"
        message={`Urutan seluruh ${questions.length} soal akan diacak secara random. Anda tetap bisa mengedit atau mengacaknya kembali.`}
        confirmLabel="Ya, Acak Soal"
        cancelLabel="Batal"
        confirmColor="teal"
        onConfirm={() => {
          handleShuffleQuestions();
          setShuffleOpen(false);
        }}
        onCancel={() => setShuffleOpen(false)}
      />

      {user && (
        <MergeQuestionsDialog
          open={mergeOpen}
          currentCode={code}
          creatorUid={user.uid}
          onMerge={handleMergeQuestions}
          onClose={() => setMergeOpen(false)}
        />
      )}
    </>
  );
}
