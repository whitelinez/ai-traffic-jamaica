"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

const STORAGE_KEY = "wlz.dev-banner.dismissed";
const AUTO_DISMISS_MS = 30_000;

export function DevBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === "1") return;
    setVisible(true);
    const t = setTimeout(() => dismiss(), AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 bg-accent/10 border-b border-accent/20 px-4 py-1.5 text-xs text-accent"
    >
      <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
      <span className="hidden sm:inline">
        Site is under heavy development — features may change without notice
      </span>
      <span className="sm:hidden">Under heavy development</span>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="ml-auto text-accent/60 hover:text-accent transition-colors"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
