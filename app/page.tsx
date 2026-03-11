"use client";

/**
 * app/page.tsx — Main dashboard shell (Phase 1).
 * Houses SiteHeader + OnboardingOverlay + placeholder stream/sidebar panels.
 * Stream (HLS), ZoneOverlay, FloatingCount, BetPanel, Leaderboard wired in Phase 3–4.
 * GovOverlay wired in Phase 5.
 */

import { useState } from "react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { OnboardingOverlay } from "@/components/layout/OnboardingOverlay";

export default function Home() {
  const [govOpen, setGovOpen] = useState(false);

  return (
    <>
      {/* ── Onboarding ───────────────────────────────────────────────── */}
      <OnboardingOverlay />

      {/* ── Header ───────────────────────────────────────────────────── */}
      <SiteHeader onAnalyticsClick={() => setGovOpen(true)} />

      {/* ── Main dashboard grid ───────────────────────────────────────── */}
      <main className="flex min-h-[calc(100vh-3.5rem)] flex-col lg:flex-row">
        {/* Stream panel — placeholder, filled in Phase 3 */}
        <section className="relative flex-1 bg-black flex items-center justify-center min-h-[56vw] lg:min-h-0">
          <div className="flex flex-col items-center gap-3 text-center p-8">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-active animate-pulse-dot" />
              <span className="font-mono text-xs text-muted tracking-widest uppercase">
                Stream Panel — Phase 3
              </span>
            </span>
            <p className="text-muted text-sm max-w-xs">
              HLS video, detection canvas, zone overlay, and count widget will render here.
            </p>
          </div>
        </section>

        {/* Sidebar — placeholder, filled in Phase 4 */}
        <aside className="w-full lg:w-[380px] border-t lg:border-t-0 lg:border-l border-border bg-surface flex flex-col">
          <div className="flex flex-col items-center justify-center flex-1 gap-3 p-8 text-center">
            <span className="font-mono text-xs text-muted tracking-widest uppercase">
              Sidebar — Phase 4
            </span>
            <p className="text-muted text-sm max-w-xs">
              Markets tab, Leaderboard, and Chat will render here.
            </p>
          </div>
        </aside>
      </main>

      {/* ── Gov Analytics Overlay placeholder — Phase 5 ───────────────── */}
      {govOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          onClick={() => setGovOpen(false)}
        >
          <div
            className="glass rounded-xl p-8 text-center max-w-sm mx-4"
            onClick={e => e.stopPropagation()}
          >
            <p className="font-mono text-xs text-primary tracking-widest uppercase mb-3">
              Gov Analytics Overlay
            </p>
            <p className="text-muted text-sm">
              Full analytics dashboard — Phase 5.
            </p>
            <button
              onClick={() => setGovOpen(false)}
              className="mt-4 text-xs text-muted hover:text-foreground transition-colors"
            >
              Close ×
            </button>
          </div>
        </div>
      )}
    </>
  );
}
