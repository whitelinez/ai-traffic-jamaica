"use client";

/**
 * app/page.tsx — Main dashboard.
 * Wires: SiteHeader + OnboardingOverlay + StreamPanel + Sidebar + GovOverlay + MobileNav.
 * Auth via useAuth() context. WS via useWebSocketLive().
 */

import React, { useCallback, useEffect, useState } from "react";
import { SiteHeader }         from "@/components/layout/SiteHeader";
import { OnboardingOverlay }  from "@/components/layout/OnboardingOverlay";
import MobileNav              from "@/components/layout/MobileNav";
import { StreamPanel, type StreamPanelProps } from "@/components/stream/StreamPanel";
import Sidebar                from "@/components/sidebar/Sidebar";
import { GovOverlay }         from "@/components/analytics/GovOverlay";
import { useWebSocketLive }   from "@/hooks/useWebSocketLive";
import { useAuth }            from "@/contexts/AuthContext";
import { sb }                 from "@/lib/supabase-client";

// ── Camera type matches actual Supabase schema ────────────────────────────────

interface Camera {
  id:           string;
  name:         string;
  ipcam_alias?: string;
  player_host?: string;
  is_active:    boolean;
  area?:        string;
  category?:    string;
}

// ── Auth form helpers ─────────────────────────────────────────────────────────

function AuthLoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    const { error: err } = await sb.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) { setError(err.message); return; }
    onSuccess();
  }

  const inputStyle: React.CSSProperties = {
    background: "rgba(13,15,22,0.8)", border: "1px solid rgba(0,212,255,0.18)",
    color: "#e8f4ff", padding: "8px 12px", borderRadius: 6, fontSize: "0.9rem",
    width: "100%", boxSizing: "border-box", outline: "none", fontFamily: "inherit",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: "0.8rem", color: "rgba(160,190,220,0.6)", display: "block", marginBottom: 4,
  };

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <label style={labelStyle}>Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" style={inputStyle} />
      </div>
      {error && <p style={{ color: "#ff3d6b", fontSize: "0.85rem", margin: 0 }}>{error}</p>}
      <button type="submit" disabled={loading} style={{
        padding: "9px 16px", width: "100%", borderRadius: 6,
        background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.3)",
        color: "#00d4ff", fontFamily: '"JetBrains Mono",monospace', fontSize: "0.85rem",
        cursor: loading ? "default" : "pointer", opacity: loading ? 0.6 : 1,
      }}>
        {loading ? "Signing in…" : "Sign In"}
      </button>
    </form>
  );
}

function AuthRegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    const { error: err } = await sb.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    setLoading(false);
    if (err) { setError(err.message); return; }
    onSuccess();
  }

  const inputStyle: React.CSSProperties = {
    background: "rgba(13,15,22,0.8)", border: "1px solid rgba(0,212,255,0.18)",
    color: "#e8f4ff", padding: "8px 12px", borderRadius: 6, fontSize: "0.9rem",
    width: "100%", boxSizing: "border-box", outline: "none", fontFamily: "inherit",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: "0.8rem", color: "rgba(160,190,220,0.6)", display: "block", marginBottom: 4,
  };

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <label style={labelStyle}>Username</label>
        <input type="text" value={username} onChange={e => setUsername(e.target.value)} required autoComplete="username" style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="new-password" style={inputStyle} />
      </div>
      {error && <p style={{ color: "#ff3d6b", fontSize: "0.85rem", margin: 0 }}>{error}</p>}
      <button type="submit" disabled={loading} style={{
        padding: "9px 16px", width: "100%", borderRadius: 6,
        background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.3)",
        color: "#00d4ff", fontFamily: '"JetBrains Mono",monospace', fontSize: "0.85rem",
        cursor: loading ? "default" : "pointer", opacity: loading ? 0.6 : 1,
      }}>
        {loading ? "Creating account…" : "Create Account"}
      </button>
    </form>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Home() {
  const { isAdmin } = useAuth();

  const [cameras,    setCameras]   = useState<Camera[]>([]);
  const [activeCam,  setActiveCam] = useState<Camera | null>(null);
  const [govOpen,    setGovOpen]   = useState(false);
  const [loginOpen,  setLoginOpen] = useState(false);
  const [loginMode,  setLoginMode] = useState<"login" | "register">("login");
  const [demoActive, setDemoActive] = useState(false);

  // ── Fetch cameras ─────────────────────────────────────────────────────────
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
        setActiveCam(cams.find((c) => c.is_active) ?? cams[0]);
      });
  }, []);

  // ── WS ────────────────────────────────────────────────────────────────────
  const wsAlias = activeCam?.ipcam_alias ?? activeCam?.id;
  const { count, detections, roundInfo, wsStatus, streamUrl } = useWebSocketLive(wsAlias);


  // ── Demo toggle ───────────────────────────────────────────────────────────
  const handleDemo = useCallback(async () => {
    await fetch("/api/demo?action=toggle", { method: "POST" });
    setDemoActive((v) => !v);
  }, []);

  // ── auth:open event (dispatched by LiveBetPanel when not logged in) ───────
  useEffect(() => {
    function onAuthOpen() { setLoginOpen(true); }
    window.addEventListener("auth:open", onAuthOpen);
    return () => window.removeEventListener("auth:open", onAuthOpen);
  }, []);

  // ── camera:switched event (dispatched by CameraModal in sidebar) ──────────
  useEffect(() => {
    function onCameraSwitched(e: Event) {
      const { camId } = (e as CustomEvent<{ camId: string }>).detail ?? {};
      if (!camId) return;
      const cam = cameras.find((c) => c.id === camId);
      if (cam) setActiveCam(cam);
    }
    window.addEventListener("camera:switched", onCameraSwitched);
    return () => window.removeEventListener("camera:switched", onCameraSwitched);
  }, [cameras]);

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

      {/* Main layout — stream + desktop sidebar */}
      <main className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
        {/* Stream panel — full width on mobile (with bottom nav padding), flex-1 on desktop */}
        <div className="relative flex-1 min-w-0 pb-14 lg:pb-0">
          {activeCam ? (
            <StreamPanel
              activeCameraId={activeCam.id}
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

        {/* Desktop sidebar — hidden on mobile */}
        <div className="hidden lg:flex flex-col w-[380px] shrink-0 border-l border-border bg-surface overflow-hidden">
          <Sidebar
            cameras={[]}
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

      {/* Mobile bottom nav + slide-up sheet (hidden lg+) */}
      <MobileNav wsStatus={wsStatus} />

      {/* Gov Analytics Overlay */}
      {activeCam && (
        <GovOverlay
          open={govOpen}
          onClose={() => setGovOpen(false)}
          cameraId={activeCam.id}
          cameraName={activeCam.name}
        />
      )}

      {/* Auth modal */}
      {loginOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.72)" }}
          onClick={() => setLoginOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position:             "relative",
              background:           "rgba(8,10,18,0.94)",
              border:               "1px solid rgba(0,212,255,0.2)",
              boxShadow:            "0 8px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,212,255,0.06), 0 0 50px rgba(0,212,255,0.07)",
              borderRadius:         12,
              backdropFilter:       "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
              padding:              28,
              width:                "100%",
              maxWidth:             360,
              margin:               "0 16px",
              animation:            "modalIn 0.22s ease",
            }}
          >
            {/* Close */}
            <button
              onClick={() => setLoginOpen(false)}
              aria-label="Close"
              style={{
                position:       "absolute",
                top:            12,
                right:          12,
                width:          28,
                height:         28,
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                background:     "none",
                border:         "none",
                color:          "rgba(160,190,220,0.6)",
                cursor:         "pointer",
                borderRadius:   6,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 16 }}>
              <span style={{ position: "relative", width: 40, height: 40, flexShrink: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/iconinframes.png" alt="AI Traffic Jamaica" style={{ width: 40, height: 40, objectFit: "contain" }} />
              </span>
              <span style={{ fontFamily: '"Rajdhani","Barlow",sans-serif', fontWeight: 700, fontSize: "0.95rem", letterSpacing: "0.08em", color: "#e8f4ff", textTransform: "uppercase" }}>
                AI TRAFFIC JAMAICA
              </span>
            </div>

            {loginMode === "login" ? (
              <>
                <h2 style={{ fontFamily: '"Rajdhani","Barlow",sans-serif', fontWeight: 700, fontSize: "1.2rem", color: "#e8f4ff", marginBottom: 14, textAlign: "center" }}>Sign In</h2>

                {/* Google */}
                <button
                  onClick={() => sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${location.origin}/` } })}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    width: "100%", padding: "11px 16px",
                    background: "rgba(66,133,244,0.12)", border: "1px solid rgba(66,133,244,0.35)",
                    color: "rgba(220,230,245,0.92)", borderRadius: 6,
                    fontFamily: '"JetBrains Mono",monospace', fontSize: "0.85rem", letterSpacing: "0.03em",
                    cursor: "pointer", marginBottom: 8, transition: "background 0.12s, border-color 0.12s",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </button>

                {/* Guest */}
                <button
                  onClick={() => { sb.auth.signInAnonymously(); setLoginOpen(false); }}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    width: "100%", padding: "9px 16px", marginTop: 4,
                    background: "rgba(255,214,0,0.04)", border: "1px solid rgba(255,214,0,0.22)",
                    color: "rgba(255,214,0,0.65)", borderRadius: 6,
                    fontFamily: '"JetBrains Mono",monospace', fontSize: "0.8rem", letterSpacing: "0.03em",
                    cursor: "pointer", transition: "background 0.12s",
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="8" r="4"/><path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6"/>
                  </svg>
                  Continue as Guest
                </button>

                {/* Divider */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 0 12px", color: "rgba(180,200,220,0.3)", fontSize: "0.68rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
                  <span>or sign in with email</span>
                  <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
                </div>

                {/* Email form */}
                <AuthLoginForm onSuccess={() => setLoginOpen(false)} />

                <p style={{ marginTop: 14, fontSize: "0.85rem", color: "rgba(160,190,220,0.5)", textAlign: "center" }}>
                  Don&apos;t have an account?{" "}
                  <button onClick={() => setLoginMode("register")} style={{ color: "#00d4ff", background: "none", border: "none", cursor: "pointer", fontSize: "inherit" }}>
                    Register
                  </button>
                </p>
              </>
            ) : (
              <>
                <h2 style={{ fontFamily: '"Rajdhani","Barlow",sans-serif', fontWeight: 700, fontSize: "1.2rem", color: "#e8f4ff", marginBottom: 14, textAlign: "center" }}>Create Account</h2>

                {/* Google register */}
                <button
                  onClick={() => sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${location.origin}/` } })}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    width: "100%", padding: "11px 16px",
                    background: "rgba(66,133,244,0.12)", border: "1px solid rgba(66,133,244,0.35)",
                    color: "rgba(220,230,245,0.92)", borderRadius: 6,
                    fontFamily: '"JetBrains Mono",monospace', fontSize: "0.85rem", letterSpacing: "0.03em",
                    cursor: "pointer", marginBottom: 8,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </button>

                {/* Divider */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 0 12px", color: "rgba(180,200,220,0.3)", fontSize: "0.68rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
                  <span>or sign up with email</span>
                  <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
                </div>

                <AuthRegisterForm onSuccess={() => setLoginOpen(false)} />

                <p style={{ marginTop: 14, fontSize: "0.85rem", color: "rgba(160,190,220,0.5)", textAlign: "center" }}>
                  Already have an account?{" "}
                  <button onClick={() => setLoginMode("login")} style={{ color: "#00d4ff", background: "none", border: "none", cursor: "pointer", fontSize: "inherit" }}>
                    Sign In
                  </button>
                </p>
              </>
            )}
          </div>
          <style>{`@keyframes modalIn { from { opacity:0; transform:translateY(-14px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }`}</style>
        </div>
      )}

      {/* Demo indicator */}
      {demoActive && (
        <div className="fixed bottom-18 left-4 z-40 lg:bottom-4 flex items-center gap-2 rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs text-destructive font-mono">
          <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse-dot" />
          DEMO ACTIVE
        </div>
      )}
    </>
  );
}
