"use client";
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="grid min-h-dvh place-items-center p-6"><section className="max-w-md rounded-2xl border border-[--color-border] bg-[--color-surface] p-6"><h1 className="text-xl font-semibold">Executor hit a problem</h1><p className="mt-2 text-[--color-text-secondary]">{error.message}</p><button className="mt-5 rounded-xl bg-[--color-accent] px-4 py-2 font-medium text-[--color-bg]" onClick={reset}>Try again</button></section></main>;
}
