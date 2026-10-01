import Image from "next/image";
import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="grid min-h-dvh place-items-center px-5">
      <section className="w-full max-w-md rounded-3xl border border-[--color-border] bg-[--color-surface] p-7 text-center shadow-2xl">
        <Image src="/icons/icon-192.png" alt="" width={64} height={64} unoptimized className="mx-auto h-16 w-16 rounded-2xl" />
        <h1 className="mt-5 text-2xl font-semibold">Executor is offline</h1>
        <p className="mt-2 text-sm leading-6 text-[--color-text-secondary]">Reconnect to load current plans or save changes. Executor never pretends an offline write succeeded.</p>
        <Link href="/" className="mt-6 inline-flex rounded-xl bg-[--color-accent] px-4 py-2.5 font-semibold text-[--color-bg]">Try again</Link>
      </section>
    </main>
  );
}
