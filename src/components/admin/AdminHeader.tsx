"use client";

import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";

export function AdminHeader() {
  const { user } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await signOut(auth);
    router.replace("/admin");
  }

  return (
    <header className="nb-teal border-b-[2.5px] sm:border-b-[3px] border-[#1a1a1a] sticky top-0 z-20">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        <a href="/admin/dashboard" className="flex items-center gap-2.5">
          <span className="grid place-items-center w-9 h-9 bg-[#1a1a1a] text-[var(--color-mustard)] font-extrabold text-lg rounded-[6px] border-[2.5px] border-[#1a1a1a]">
            i
          </span>
          <span className="font-extrabold text-lg text-[#1a1a1a] tracking-tight">
            ISFO DRILL
          </span>
          <span className="hidden sm:inline text-xs font-bold text-[#1a1a1a]/70 border-l-[2.5px] border-[#1a1a1a] pl-2.5">
            PANEL GURU
          </span>
        </a>
        <div className="flex items-center gap-3">
          {user?.email && (
            <span className="hidden md:inline text-sm font-bold text-[#1a1a1a]/80">
              {user.email}
            </span>
          )}
          <Button color="red" onClick={handleLogout}>
            Keluar
          </Button>
        </div>
      </div>
    </header>
  );
}
