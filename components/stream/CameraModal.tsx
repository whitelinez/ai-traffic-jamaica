"use client";

/**
 * CameraModal.tsx — Camera switcher modal with live HLS previews.
 * Dispatches "camera:switched" CustomEvent on switch.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { sb } from "@/lib/supabase-client";

interface CamRow {
  id:              string;
  ipcam_alias:     string | null;
  feed_appearance: { label?: string } | null;
  is_active:       boolean;
}

interface CameraModalProps {
  open:        boolean;
  onClose:     () => void;
  activeCamId: string;
}

function isUrl(s: string | null | undefined): boolean {
  return /^https?:\/\//i.test(String(s ?? ""));
}

function camLabel(cam: CamRow): string {
  return cam.feed_appearance?.label ?? cam.ipcam_alias ?? "Camera";
}

function streamSrc(alias: string | null): string {
  if (!alias) return "";
  return isUrl(alias) ? alias : `/api/stream?alias=${encodeURIComponent(alias)}`;
}

// ── CamPreview — small inline HLS preview ────────────────────────────────────

function CamPreview({ alias, active }: { alias: string | null; active: boolean }) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const hlsRef    = useRef<{ destroy: () => void } | null>(null);
  const [playing, setPlaying] = useState(false);
  const [errored, setErrored] = useState(false);

  // Auto-start HLS when visible
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !alias) return;
    const src = streamSrc(alias);

    async function init() {
      const { default: Hls } = await import("hls.js");
      if (!Hls.isSupported()) {
        if (video!.canPlayType("application/vnd.apple.mpegurl")) {
          video!.src = src;
          video!.muted = true;
          video!.play().then(() => setPlaying(true)).catch(() => setErrored(true));
        }
        return;
      }
      const hls = new Hls({ enableWorker: false, maxBufferLength: 4, liveSyncDuration: 2 });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video!);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video!.muted = true;
        video!.play().then(() => setPlaying(true)).catch(() => setErrored(true));
      });
      hls.on(Hls.Events.ERROR, (_: unknown, d: { fatal: boolean }) => {
        if (d.fatal) setErrored(true);
      });
    }

    init();
    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alias]);

  return (
    <div style={{
      position: "relative", width: "100%", aspectRatio: "16/9",
      background: "#000", borderRadius: 4, overflow: "hidden",
      border: active ? "1px solid rgba(0,212,255,0.35)" : "1px solid rgba(255,255,255,0.06)",
    }}>
      <video
        ref={videoRef}
        muted
        playsInline
        style={{ width: "100%", height: "100%", objectFit: "cover", display: playing ? "block" : "none" }}
      />
      {/* Placeholder until playing */}
      {!playing && !errored && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <div style={{ width: 16, height: 16, border: "2px solid rgba(0,212,255,0.4)", borderTopColor: "#00d4ff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <span style={{ fontSize: "0.6rem", color: "rgba(0,212,255,0.5)", letterSpacing: "0.08em", fontFamily: '"JetBrains Mono",monospace' }}>LOADING</span>
        </div>
      )}
      {errored && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,100,100,0.5)" strokeWidth="1.5" strokeLinecap="round">
            <rect x="2" y="7" width="14" height="10" rx="1.5"/>
            <path d="M16 10l5-3v10l-5-3"/>
            <line x1="2" y1="2" x2="22" y2="22"/>
          </svg>
          <span style={{ fontSize: "0.6rem", color: "rgba(255,100,100,0.4)", letterSpacing: "0.08em", fontFamily: '"JetBrains Mono",monospace' }}>OFFLINE</span>
        </div>
      )}
      {/* LIVE badge */}
      {playing && (
        <div style={{
          position: "absolute", top: 5, left: 5,
          display: "flex", alignItems: "center", gap: 4,
          padding: "1px 6px", background: "rgba(0,0,0,0.55)",
          border: "1px solid rgba(34,197,94,0.4)", borderRadius: 3,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 4px rgba(34,197,94,0.8)" }} />
          <span style={{ fontSize: "0.55rem", color: "#22c55e", fontFamily: '"JetBrains Mono",monospace', letterSpacing: "0.1em" }}>LIVE</span>
        </div>
      )}
    </div>
  );
}

// ── CameraModal ───────────────────────────────────────────────────────────────

export function CameraModal({ open, onClose, activeCamId }: CameraModalProps) {
  const [cameras, setCameras] = useState<CamRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sb.from("cameras")
      .select("id, ipcam_alias, feed_appearance, is_active")
      .eq("is_active", true)
      .then(({ data }) => {
        const rows = (data ?? []) as CamRow[];
        setCameras(rows.filter(c => c.ipcam_alias && c.ipcam_alias.toLowerCase() !== "your-alias"));
        setLoading(false);
      });
  }, []);

  const handleSwitch = useCallback((cam: CamRow) => {
    window.dispatchEvent(new CustomEvent("camera:switched", { detail: { camId: cam.id, alias: cam.ipcam_alias } }));
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.78)" }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background:     "rgba(6,8,18,0.97)",
          border:         "1px solid rgba(0,212,255,0.18)",
          boxShadow:      "0 8px 64px rgba(0,0,0,0.7), 0 0 40px rgba(0,212,255,0.06)",
          borderRadius:   10,
          backdropFilter: "blur(18px)",
          width:          "100%",
          maxWidth:       620,
          margin:         "0 16px",
          maxHeight:      "82vh",
          display:        "flex",
          flexDirection:  "column",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 18px", borderBottom: "1px solid rgba(0,212,255,0.1)", flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <rect x="2" y="7" width="14" height="10" rx="1.5"/><path d="M16 10l5-3v10l-5-3"/>
            </svg>
            <span style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: "0.72rem", letterSpacing: "0.14em", color: "#00d4ff", textTransform: "uppercase" }}>
              Camera Sources
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close camera modal"
            style={{
              width: 26, height: 26, borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)",
              color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", padding: "14px 16px", flex: 1 }}>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[1,2].map(i => (
                <div key={i} style={{ borderRadius: 6, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ aspectRatio: "16/9", background: "rgba(255,255,255,0.03)", animation: "pulse 1.5s ease-in-out infinite" }} />
                  <div style={{ padding: "10px 12px", height: 44, background: "rgba(255,255,255,0.02)" }} />
                </div>
              ))}
            </div>
          ) : cameras.length === 0 ? (
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.82rem", textAlign: "center", padding: "24px 0" }}>
              No camera sources configured.
            </p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: cameras.length === 1 ? "1fr" : "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
              {cameras.map(cam => {
                const isActive = cam.id === activeCamId;
                const label    = camLabel(cam);
                return (
                  <div
                    key={cam.id}
                    style={{
                      borderRadius: 6, overflow: "hidden",
                      border: isActive ? "1px solid rgba(0,212,255,0.35)" : "1px solid rgba(255,255,255,0.07)",
                      background: isActive ? "rgba(0,212,255,0.04)" : "rgba(255,255,255,0.02)",
                    }}
                  >
                    {/* Live preview */}
                    <CamPreview alias={cam.ipcam_alias} active={isActive} />

                    {/* Info + action row */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", gap: 8 }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: "0.82rem", fontWeight: 700, color: isActive ? "#e8f4ff" : "rgba(180,200,220,0.8)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {label}
                        </p>
                        <p style={{ margin: 0, fontSize: "0.65rem", color: isActive ? "rgba(0,212,255,0.6)" : "rgba(120,160,200,0.4)", fontFamily: '"JetBrains Mono",monospace', letterSpacing: "0.06em" }}>
                          {isActive ? "ACTIVE" : (isUrl(cam.ipcam_alias) ? "DIRECT" : "ALIAS")}
                        </p>
                      </div>
                      <button
                        onClick={() => !isActive && handleSwitch(cam)}
                        disabled={isActive}
                        style={{
                          flexShrink: 0, padding: "5px 14px", borderRadius: 4,
                          border: isActive ? "1px solid rgba(0,212,255,0.25)" : "1px solid rgba(0,212,255,0.35)",
                          background: isActive ? "rgba(0,212,255,0.06)" : "rgba(0,212,255,0.1)",
                          color: isActive ? "rgba(0,212,255,0.4)" : "#00d4ff",
                          fontSize: "0.7rem", fontFamily: '"JetBrains Mono",monospace',
                          fontWeight: 700, letterSpacing: "0.06em",
                          cursor: isActive ? "default" : "pointer",
                        }}
                      >
                        {isActive ? "ACTIVE" : "SWITCH"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
