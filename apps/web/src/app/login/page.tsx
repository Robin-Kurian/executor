"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { authClient } from "@/lib/auth-client";
export default function LoginPage() {
  const router = useRouter(); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [showPassword, setShowPassword] = useState(false); const [error, setError] = useState(""); const [pending, setPending] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const result = await authClient.signIn.email({ email, password });
      if (result.error) {
        setError(result.error.message ?? "Invalid email or password");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("The local API is unavailable. Start it on http://localhost:8787 and try again.");
    } finally {
      setPending(false);
    }
  }
  return <main className="grid min-h-dvh place-items-center px-5"><form onSubmit={submit} className="w-full max-w-sm rounded-3xl bg-white/[0.07] p-7 text-[var(--color-text-primary)] shadow-2xl shadow-black/30 backdrop-blur-2xl"><h1 className="text-2xl font-semibold">Executor</h1><p className="mt-1 text-sm text-[var(--color-text-secondary)]">Sign in to continue.</p><label className="mt-6 block text-sm">Email<input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]" /></label><label className="mt-4 block text-sm">Password<span className="relative mt-2 block"><input required type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] py-2.5 pl-3 pr-11 text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]" /><button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]">{showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}</button></span></label>{error ? <p role="alert" className="mt-4 text-sm text-rose-400">{error}</p> : null}<button disabled={pending} className="mt-6 w-full rounded-xl bg-[var(--color-accent)] px-4 py-2.5 font-semibold text-[var(--color-bg)] disabled:opacity-60">{pending ? "Signing in…" : "Sign in"}</button></form></main>;
}
