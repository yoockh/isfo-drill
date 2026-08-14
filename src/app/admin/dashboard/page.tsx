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
  updateDoc,
  deleteDoc,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import { Search } from "lucide-react";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/hooks/useAuth";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { SessionMenu } from "@/components/admin/SessionMenu";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Star, Dot, Square } from "@/components/ui/Decor";
import { Pagination } from "@/components/ui/Pagination";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PromptDialog } from "@/components/ui/PromptDialog";
import { generateSessionCode } from "@/lib/utils";
import type { Session } from "@/lib/types";

type SortKey = "newest" | "oldest" | "az" | "za";

interface SessionWithCount extends Session {
  attemptCount: number;
}

// Rotasi warna aksen kartu supaya dashboard terasa "hidup"
const CARD_COLORS = ["mustard", "teal", "pink", "purple"] as const;
const PAGE_SIZE = 10;

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);

  // Search & sort
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("newest");

  // Aksi sesi (rename / delete)
  const [renameTarget, setRenameTarget] = useState<SessionWithCount | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SessionWithCount | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  // Filter (search) + sort diterapkan ke SELURUH data sebelum pagination.
  const visibleSessions = (() => {
    const term = searchTerm.trim().toLowerCase();
    const filtered = term
      ? sessions.filter((s) => s.title.toLowerCase().includes(term))
      : sessions;
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      switch (sortKey) {
        case "oldest":
          return (
            (a.createdAt?.toMillis?.() ?? 0) - (b.createdAt?.toMillis?.() ?? 0)
          );
        case "az":
          return a.title.localeCompare(b.title, "id");
        case "za":
          return b.title.localeCompare(a.title, "id");
        case "newest":
        default:
          return (
            (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0)
          );
      }
    });
    return sorted;
  })();

  const pageCount = Math.ceil(visibleSessions.length / PAGE_SIZE);
  const pageStart = page * PAGE_SIZE;
  const pageItems = visibleSessions.slice(pageStart, pageStart + PAGE_SIZE);

  // Reset ke halaman pertama saat filter/sort berubah agar hasil selalu terlihat.
  useEffect(() => {
    setPage(0);
  }, [searchTerm, sortKey]);

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

  async function handleRename(newTitle: string) {
    if (!renameTarget) return;
    setActionBusy(true);
    setActionError("");
    try {
      await updateDoc(doc(db, "sessions", renameTarget.code), {
        title: newTitle,
        updatedAt: Timestamp.now(),
      });
      setSessions((prev) =>
        prev.map((s) =>
          s.code === renameTarget.code ? { ...s, title: newTitle } : s
        )
      );
      setRenameTarget(null);
    } catch (err) {
      console.error("Gagal ubah nama:", err);
      setActionError("Gagal mengubah nama sesi.");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleDeleteSession() {
    if (!deleteTarget) return;
    setActionBusy(true);
    setActionError("");
    try {
      const targetCode = deleteTarget.code;
      // Hapus semua attempt terkait dulu (sesi masih ada agar rule get() valid),
      // lalu hapus dokumen sesi terakhir.
      const snap = await getDocs(
        query(collection(db, "attempts"), where("sessionCode", "==", targetCode))
      );
      const ids = snap.docs.map((d) => d.id);
      for (let i = 0; i < ids.length; i += 400) {
        const batch = writeBatch(db);
        for (const id of ids.slice(i, i + 400)) {
          batch.delete(doc(db, "attempts", id));
        }
        await batch.commit();
      }
      await deleteDoc(doc(db, "sessions", targetCode));

      setSessions((prev) => prev.filter((s) => s.code !== targetCode));
      setDeleteTarget(null);
    } catch (err) {
      console.error("Gagal menghapus sesi:", err);
      setActionError("Gagal menghapus sesi. Coba lagi.");
    } finally {
      setActionBusy(false);
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
        <div className="flex flex-wrap items-center gap-3 justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="font-extrabold text-lg">SESI SAYA</h2>
            {!loading && sessions.length > 0 && (
              <Badge color="teal">{sessions.length} SESI</Badge>
            )}
          </div>
          {!loading && sessions.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#1a1a1a]/50">
                  <Search size={16} strokeWidth={2.5} />
                </span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari sesi..."
                  className="nb-input pl-8 py-2 text-sm w-40 sm:w-52"
                />
              </div>
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                aria-label="Urutkan sesi"
                className="nb-input py-2 text-sm w-auto font-bold cursor-pointer"
              >
                <option value="newest">Terbaru</option>
                <option value="oldest">Terlama</option>
                <option value="az">Judul A-Z</option>
                <option value="za">Judul Z-A</option>
              </select>
            </div>
          )}
        </div>

        {(error || actionError) && (
          <Card color="red" className="p-4 mb-4 font-bold text-sm">
            {error || actionError}
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
        ) : visibleSessions.length === 0 ? (
          <Card className="p-10 text-center">
            <p className="font-extrabold text-lg">TIDAK ADA HASIL</p>
            <p className="font-bold text-[#1a1a1a]/60 mt-1">
              Tidak ada sesi yang cocok dengan &ldquo;{searchTerm.trim()}&rdquo;.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {pageItems.map((session, i) => (
              <div
                key={session.code}
                className="nb-card nb-white relative transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5"
              >
                <div className="absolute top-3 right-3 z-10">
                  <SessionMenu
                    onRename={() => setRenameTarget(session)}
                    onDelete={() => setDeleteTarget(session)}
                  />
                </div>
                <a
                  href={`/admin/session/${session.code}`}
                  className="block p-5 pr-14"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className="inline-block w-8 h-8 shrink-0 border-[2.5px] border-[#1a1a1a] rounded-[6px]"
                      style={{
                        backgroundColor: `var(--color-${
                          session.published
                            ? "nb-green"
                            : CARD_COLORS[(pageStart + i) % CARD_COLORS.length]
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
              </div>
            ))}
          </div>
        )}

        {!loading && visibleSessions.length > PAGE_SIZE && (
          <Pagination
            page={page}
            pageCount={pageCount}
            onChange={setPage}
            className="mt-6"
          />
        )}
      </main>

      {/* Dialog ubah nama sesi */}
      <PromptDialog
        open={renameTarget !== null}
        title="Ubah Nama Sesi"
        label="Judul sesi"
        initialValue={renameTarget?.title ?? ""}
        confirmLabel="Simpan"
        loading={actionBusy}
        onConfirm={handleRename}
        onCancel={() => setRenameTarget(null)}
      />

      {/* Dialog hapus sesi */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Hapus sesi ini?"
        message={
          deleteTarget
            ? `Hapus sesi "${deleteTarget.title}"? Semua soal dan riwayat pengerjaan (${deleteTarget.attemptCount} attempt) akan ikut terhapus permanen.`
            : ""
        }
        confirmLabel="Ya, Hapus Sesi"
        confirmColor="red"
        confirmDelayMs={1000}
        loading={actionBusy}
        onConfirm={handleDeleteSession}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
