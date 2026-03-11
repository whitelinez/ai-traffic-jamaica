"use client";

/**
 * app/page.tsx — Main dashboard.
 * Wires: SiteHeader + OnboardingOverlay + StreamPanel + Sidebar + GovOverlay.
 * Auth via useAuth() context. WS via useWebSocketLive().
 */

import { useCallback, useEffect, useState } from "react";
import { SiteHeader }         from "@/components/layout/SiteHeader";
import { OnboardingOverlay }  from "@/components/layout/OnboardingOverlay";
import { StreamPanel, type StreamPanelProps } from "@/components/stream/StreamPanel";
import Sidebar                from "@/components/sidebar/Sidebar";
import { GovOverlay }         from "@/components/analytics/GovOverlay";
import { useWebSocketLive }   from "@/hooks/useWebSocketLive";
import { useAuth }            from "@/contexts/AuthContext";
import { sb }                 from "@/lib/supabase-client";

// ── Camera type matches actual Supabase schema ────────────────────────────────
// Verified against camera-switcher.js: id, name, area, ipcam_alias,
// player_host, is_active, quality_snapshot, category, youtube_url

interface Camera {
  id:           string;
  name:         string;
  ipcam_alias?: string;   // alias used for WS + stream
  player_host?: string;   // ipcamlive embed host
  is_active:    boolean;  // true = AI camera currently running
  area?:        string;
  category?:    string;
}

// ── Stream URL builder ────────────────────────────────────────────────────────

const BACKEND_URL = "https://whitelinez-backend-production.up.railway.app";

function buildStreamUrl(alias?: string) {
  const base = BACKEND_URL.replace(/\/$/, "");
  return alias ? `${base}/stream?alias=${encodeURIComponent(alias)}` : `${base}/stream`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Home() {
  const { isAdmin } = useAuth();

  const [cameras,      setCameras]    = useState<Camera[]>([]);
  const [activeCam,    setActiveCam]  = useState<Camera | null>(null);
  const [govOpen,      setGovOpen]    = useState(false);
  const [loginOpen,    setLoginOpen]  = useState(false);
  const [demoActive,   setDemoActive] = useState(false);

  // ── Fetch cameras (actual schema) ─────────────────────────────────────────
  useEffect(() => {
    sb.from("cameras")
      .select("id, name, ipcam_alias, player_host, is_active, area, category")
      .order("category", { ascending: true })
      .order("name",     { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error("[cameras]", error.message);
        if (!data?.length) return;
        const cams = data as Camera[];
        setCameras(cams);
        // prefer is_active (AI) camera as default
        setActiveCam(cams.find((c) => c.is_active) ?? cams[0]);
      });
  }, []);

  // ── WS — only connect once we have an alias/id ───────────────────────────
  const wsAlias = activeCam?.ipcam_alias ?? activeCam?.id;
  const { count, detections, roundInfo, wsStatus } = useWebSocketLive(wsAlias);

  // ── Camera switch ─────────────────────────────────────────────────────────
  const handleCameraChange = useCallback((id: string) => {
    const cam = cameras.find((c) => c.id === id);
    if (cam) setActiveCam(cam);
  }, [cameras]);

  // ── Demo toggle ───────────────────────────────────────────────────────────
  const handleDemo = useCallback(async () => {
    await fetch("/api/demo?action=toggle", { method: "POST" });
    setDemoActive((v) => !v);
  }, []);

  const streamUrl = buildStreamUrl(activeCam?.ipcam_alias);

  // Adapt cameras to StreamPanel's Camera type (add has_ai from is_active)
  const streamCameras = cameras.map((c) => ({
    id:        c.id,
    name:      c.name,
    alias:     c.ipcam_alias,
    has_ai:    c.is_active,
    is_active: c.is_active,
  }));

  return (
    <>
      <OnboardingOverlay />

      <SiteHeader
        onAnalyticsClick={() => setGovOpen(true)}
        onLoginClick={()    => setLoginOpen(true)}
        onRegisterClick={() => {}}
        showDemo={isAdmin}
        onDemoClick={handleDemo}
      />

      <main className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
        {/* Stream panel */}
        <div className="relative flex-1 min-w-0">
          {activeCam ? (
            <StreamPanel
              cameras={streamCameras}
              activeCameraId={activeCam.id}
              onCameraChange={handleCameraChange}
              streamUrl={streamUrl}
              zone={[]}
              wsCount={count}
              wsDetections={detections}
              wsStatus={wsStatus}
              roundInfo={roundInfo as StreamPanelProps["roundInfo"]}
              hudData={undefined}
              className="h-full"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-black">
              <div className="flex flex-col items-center gap-3">
                <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <span className="font-mono text-xs text-muted tracking-widest">CONNECTING…</span>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar — desktop only */}
        <div className="hidden lg:flex flex-col w-[380px] shrink-0 border-l border-border bg-surface overflow-hidden">
          <Sidebar
            cameras={streamCameras}
            activeCameraId={activeCam?.id ?? ""}
            wsCount={count}
            roundInfo={roundInfo ? {
              id:     roundInfo.id,
              status: roundInfo.status,
              title:  activeCam?.name ?? "Live Camera",
            } : undefined}
            wsStatus={wsStatus}
          />
        </div>
      </main>

      {/* Gov Analytics Overlay */}
      {activeCam && (
        <GovOverlay
          open={govOpen}
          onClose={() => setGovOpen(false)}
          cameraId={activeCam.id}
          cameraName={activeCam.name}
        />
      )}

      {/* Login modal */}
      {loginOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          onClick={() => setLoginOpen(false)}
        >
          <div
            className="glass rounded-xl p-8 w-full max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-xl font-bold text-foreground mb-1">Sign in</h2>
            <p className="text-sm text-muted mb-6">
              Log in to make predictions and track your score.
            </p>
            <button
              onClick={() =>
                sb.auth.signInWithOAuth({
                  provider: "google",
                  options: { redirectTo: `${location.origin}/` },
                })
              }
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium hover:bg-white/5 transition-colors"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://www.google.com/favicon.ico" alt="" className="h-4 w-4" />
              Continue with Google
            </button>
            <button
              onClick={() => setLoginOpen(false)}
              className="mt-4 w-full text-center text-xs text-muted hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Demo active indicator */}
      {demoActive && (
        <div className="fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs text-destructive font-mono">
          <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse-dot" />
          DEMO ACTIVE
        </div>
      )}
    </>
  );
}
