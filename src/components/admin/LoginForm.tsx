"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { Button } from "@/components/ui/Button";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="nb-input"
          placeholder="••••••••"
        />
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
