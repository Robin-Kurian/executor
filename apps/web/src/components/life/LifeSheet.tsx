"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function LifeSheet({
  onClose,
  labelledBy,
  children,
}: {
  onClose: () => void;
  labelledBy?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center [&_a]:cursor-pointer [&_button:not(:disabled)]:cursor-pointer">
      <button
        type="button"
        className="absolute inset-0 cursor-pointer bg-black/60"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="relative z-10 max-h-[90dvh] w-full overflow-y-auto rounded-t-3xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5 text-[var(--color-text-primary)] shadow-2xl sm:max-w-lg sm:rounded-3xl"
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
