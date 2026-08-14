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
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">Memuat...</p>
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-1">Admin ISFO Drill</h1>
        <p className="text-gray-500">Masuk untuk mengelola sesi quiz</p>
      </div>
      <LoginForm />
    </div>
  );
}
