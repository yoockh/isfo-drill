"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { LoginForm } from "@/components/admin/LoginForm";
import { Card } from "@/components/ui/Card";
import { Star, Dot, Square } from "@/components/ui/Decor";
import { Logo } from "@/components/Logo";

export default function AdminLoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/admin/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex-1 grid place-items-center">
        <p className="font-bold text-[#1a1a1a]/60">Memuat...</p>
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="relative flex-1 flex flex-col items-center justify-center px-4 py-10 overflow-hidden">
      <Square className="hidden sm:block absolute top-20 left-[16%] w-9 h-9" color="var(--color-mustard)" />
      <Dot className="hidden sm:block absolute bottom-24 right-[18%] w-8 h-8" color="var(--color-pink)" />
      <Star className="hidden sm:block absolute bottom-20 left-[20%] w-8 h-8" color="var(--color-teal)" />

      <div className="w-full max-w-sm relative">
        <div className="text-center mb-7">
          <div className="inline-block mb-4 rotate-[-4deg] shadow-[5px_5px_0_0_#1a1a1a] rounded-[7px]">
            <Logo size={64} />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">PANEL GURU</h1>
          <p className="font-bold text-[#1a1a1a]/70 mt-1">
            Masuk untuk mengelola sesi quiz
          </p>
        </div>
        <Card className="p-6">
          <LoginForm />
        </Card>
      </div>
    </div>
  );
}
