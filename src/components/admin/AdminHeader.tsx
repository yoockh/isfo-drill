"use client";

import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { useAuth } from "@/hooks/useAuth";

export function AdminHeader() {
  const { user } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await signOut(auth);
    router.replace("/admin");
  }

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <a href="/admin/dashboard" className="flex items-center gap-2">
          <span className="grid place-items-center w-7 h-7 rounded-lg bg-primary-600 text-white font-bold text-sm">
            i
          </span>
          <span className="font-bold text-slate-900">ISFO Drill</span>
          <span className="hidden sm:inline text-xs text-slate-400 font-medium border-l border-slate-200 pl-2">
            Panel Guru
          </span>
        </a>
        <div className="flex items-center gap-3">
          {user?.email && (
            <span className="hidden sm:inline text-sm text-slate-500">
              {user.email}
            </span>
          )}
          <button onClick={handleLogout} className="btn-ghost text-red-600 hover:bg-red-50">
            Keluar
          </button>
        </div>
      </div>
    </header>
  );
}
