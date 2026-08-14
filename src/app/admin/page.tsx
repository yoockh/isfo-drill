"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { LoginForm } from "@/components/admin/LoginForm";

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
        <p className="text-slate-500">Memuat...</p>
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-grid place-items-center w-14 h-14 rounded-2xl bg-primary-600 text-white text-2xl font-bold mb-4">
            i
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Panel Guru</h1>
          <p className="text-slate-500 mt-1">Masuk untuk mengelola sesi quiz</p>
        </div>
        <div className="card p-6">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
