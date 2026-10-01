"use client";

import { useEffect, useRef, type ReactNode } from "react";
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
  const onCloseRef = useRef(onClose);
  const cleanupHistoryTimer = useRef<number | null>(null);
  onCloseRef.current = onClose;

  useEffect(() => {
    // React replays effects in local development. Cancel the previous cleanup
    // before creating this sheet's history entry, otherwise that replay would
    // immediately pop the newly opened sheet.
    if (cleanupHistoryTimer.current !== null) {
      window.clearTimeout(cleanupHistoryTimer.current);
      cleanupHistoryTimer.current = null;
    }

    const historyKey = `life-sheet-${crypto.randomUUID()}`;
    let dismissedByHistory = false;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // A sheet can fill the entire mobile viewport. Give it its own same-URL
    // history entry so a browser/PWA back swipe dismisses the sheet before
    // navigating away from the page underneath it.
    window.history.pushState({ ...window.history.state, lifeSheet: historyKey }, "");

    function onPopState() {
      dismissedByHistory = true;
      onCloseRef.current();
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") window.history.back();
    }

    window.addEventListener("popstate", onPopState);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("keydown", onKey);

      // Save/delete can unmount the sheet directly. Remove its otherwise
      // invisible history entry so a later Back press still leaves the page.
      if (!dismissedByHistory && window.history.state?.lifeSheet === historyKey) {
        cleanupHistoryTimer.current = window.setTimeout(() => {
          window.history.back();
          cleanupHistoryTimer.current = null;
        }, 0);
      }
    };
  }, []);

  function requestClose() {
    window.history.back();
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center [&_a]:cursor-pointer [&_button:not(:disabled)]:cursor-pointer">
      <button
        type="button"
        className="absolute inset-0 cursor-pointer bg-black/60"
        aria-label="Close"
        onClick={requestClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="life-sheet-scrollbar relative z-10 max-h-[90dvh] w-full overflow-y-auto overscroll-contain rounded-t-3xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5 text-[var(--color-text-primary)] shadow-2xl sm:max-w-3xl sm:rounded-3xl sm:p-7 lg:max-w-4xl lg:p-10"
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
