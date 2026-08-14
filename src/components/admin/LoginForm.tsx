"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Eye, EyeOff } from "lucide-react";
import { auth } from "@/lib/firebase/client";
import { Button } from "@/components/ui/Button";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      setError("Email atau password salah");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-extrabold uppercase tracking-wide mb-1.5">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="nb-input"
          placeholder="guru@email.com"
        />
      </div>
      <div>
        <label className="block text-sm font-extrabold uppercase tracking-wide mb-1.5">
          Password
        </label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="nb-input pr-12"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            title={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center w-8 h-8 rounded-[5px] text-[#1a1a1a] hover:bg-[#1a1a1a]/10 active:bg-[#1a1a1a]/20 transition-colors"
          >
            {showPassword ? <EyeOff size={20} strokeWidth={2.5} /> : <Eye size={20} strokeWidth={2.5} />}
          </button>
        </div>
      </div>
      {error && (
        <p className="nb-red border-[2.5px] border-[#1a1a1a] rounded-[6px] text-sm font-bold py-2 px-3">
          {error}
        </p>
      )}
      <Button type="submit" color="mustard" size="lg" disabled={loading} className="w-full">
        {loading ? "Masuk..." : "Masuk →"}
      </Button>
    </form>
  );
}
