"use client";

/**
 * StreamPanel.tsx — Outer wrapper for the live video feed area.
 *
 * Contains:
 *   - HLSVideo (video element)
 *   - DetectionCanvas (YOLO bounding boxes)
 *   - ZoneOverlay (AI detection zone polygon)
 *   - CountWidget (floating count HUD)
 *   - VisionHUD (AI inference stats)
 *   - FpsOverlay (bottom-left)
 *   - StreamChatOverlay (top-right)
 *   - Overlays: stream-offline, stream-switching, play-overlay
 *
 * CameraSelector removed — camera switching handled via banner tiles in sidebar.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { HLSVideo, type HLSVideoRef } from "./HLSVideo";
import { DetectionCanvas, type Detection } from "./DetectionCanvas";
import { ZoneOverlay } from "./ZoneOverlay";
import { CountWidget } from "./CountWidget";
import { VisionHUD } from "./VisionHUD";
import { sb } from "@/lib/supabase-client";

// ── types ────────────────────────────────────────────────────────────────────

type WsStatus = "connected" | "disconnected" | "error" | "connecting";

export interface RoundInfo {
  id: string;
  window_duration_sec: number;
  status: string;
  starts_at: string;
  ends_at: string;
}

export interface GuessInfo {
  current: number;
  target: number;
}

export interface StreamPanelProps {
  activeCameraId: string;
  streamUrl: string;
  /** Normalized zone polygon [[x,y], ...] from cameras table detect_zone */
  zone?: number[][];
  wsCount: number;
  wsDetections: Detection[];
  wsStatus: WsStatus;
  roundInfo?: RoundInfo | null;
  /** Active guess in progress — triggers guess mode on CountWidget */
  guess?: GuessInfo | null;
  /** VisionHUD data — fed from count:update payload */
  hudData?: {
    fps: number;
    detectionRate: number;
    frameCount: number;
    objectCount: number;
    trafficMsg: string;
  };
  className?: string;
}

// ── overlay sub-components ────────────────────────────────────────────────────

function StreamOfflineOverlay() {
  return (
    <div
      id="stream-offline-overlay"
      className="absolute inset-0 z-30 flex items-center justify-center bg-background/95"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <rect x="3" y="6" width="42" height="28" rx="2.5" stroke="#ef4444" strokeWidth="1.8" />
          <line x1="24" y1="34" x2="24" y2="41" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="14" y1="41" x2="34" y2="41" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M26 6 L21 20 L27 20 L19 34" stroke="rgba(239,68,68,0.85)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="21" y1="20" x2="12" y2="26" stroke="rgba(239,68,68,0.45)" strokeWidth="1.1" strokeLinecap="round" />
          <line x1="21" y1="20" x2="13" y2="14" stroke="rgba(239,68,68,0.35)" strokeWidth="1" strokeLinecap="round" />
          <line x1="27" y1="20" x2="36" y2="16" stroke="rgba(239,68,68,0.4)" strokeWidth="1" strokeLinecap="round" />
          <line x1="27" y1="20" x2="37" y2="25" stroke="rgba(239,68,68,0.35)" strokeWidth="1" strokeLinecap="round" />
        </svg>
        <div className="flex flex-col gap-1">
          <p className="font-label text-sm font-bold tracking-[0.16em] uppercase text-destructive">STREAM OFFLINE</p>
          <p className="text-xs text-muted-foreground">Reconnecting to live feed...</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" aria-hidden="true" />
          <span className="font-mono text-[10px] font-semibold tracking-widest text-destructive">SIGNAL LOST</span>
        </div>
      </div>
    </div>
  );
}

function StreamSwitchingOverlay() {
  return (
    <div
      id="stream-switching-overlay"
      className="absolute inset-0 z-30 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-4">
        <svg width="36" height="36" viewBox="0 0 32 32" fill="none" className="animate-spin" aria-hidden="true">
          <circle cx="16" cy="16" r="13" stroke="rgba(0,212,255,0.15)" strokeWidth="2.5" />
          <path d="M16 3 A13 13 0 0 1 29 16" stroke="#00d4ff" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="font-label text-xs font-semibold tracking-wide text-primary">Switching stream…</p>
          <p className="text-[10px] text-muted-foreground">Loading detection zones…</p>
          <p className="text-[10px] text-muted-foreground">Starting AI…</p>
        </div>
      </div>
    </div>
  );
}

function PlayOverlay({ onPlay }: { onPlay: () => void }) {
  return (
    <div id="play-overlay" className="absolute inset-0 z-30 flex items-center justify-center bg-background/60">
      <button
        onClick={onPlay}
        aria-label="Play stream"
        className="flex flex-col items-center gap-2 rounded-full border border-primary/30 bg-background/80 p-5 text-primary transition hover:bg-primary/10 hover:shadow-cyan"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-10 w-10" aria-hidden="true">
          <polygon points="8 5 20 12 8 19 8 5" />
        </svg>
        <span className="font-label text-xs font-semibold tracking-wider uppercase">Play</span>
      </button>
    </div>
  );
}

// ── FPS overlay — bottom-left ─────────────────────────────────────────────────

function FpsOverlay({ fps }: { fps: number }) {
  if (!fps) return null;
  const cls = fps >= 24 ? "good" : fps >= 12 ? "warn" : "bad";
  const colors = {
    good: { color: "#8dff9e", border: "rgba(112,201,133,0.75)", bg: "rgba(12,26,18,0.25)", shadow: "rgba(28,255,74,0.45)" },
    warn: { color: "#ffe877", border: "rgba(255,232,119,0.7)",  bg: "rgba(35,30,10,0.25)",  shadow: "rgba(255,232,119,0.4)" },
    bad:  { color: "#ff6b6b", border: "rgba(255,107,107,0.72)", bg: "rgba(42,14,14,0.27)",  shadow: "rgba(255,80,80,0.46)" },
  }[cls];
  return (
    <div
      style={{
        position: "absolute", left: 10, bottom: 10, zIndex: 8,
        padding: "2px 6px",
        border: `1px solid ${colors.border}`,
        background: colors.bg,
        color: colors.color,
        fontFamily: '"Courier New","Consolas",monospace',
        fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.05em",
        clipPath: "polygon(0 50%, 8% 0, 100% 0, 94% 100%, 0 100%)",
        textShadow: `0 0 8px ${colors.shadow}, 0 1px 3px rgba(0,0,0,0.65)`,
        pointerEvents: "none",
      }}
      aria-hidden="true"
    >
      {fps.toFixed(1)} fps
    </div>
  );
}

// ── Stream chat overlay — top-right ───────────────────────────────────────────

interface ChatMsg { id: string; content: string; username: string | null; }

function StreamChatOverlay() {
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);

  useEffect(() => {
    sb.from("messages")
      .select("id, content, username")
      .order("created_at", { ascending: false })
      .limit(4)
      .then(({ data }) => {
        if (data) setMsgs((data as ChatMsg[]).reverse());
      });

    const ch = sb.channel("stream-chat-overlay")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const row = payload.new as ChatMsg;
        setMsgs((prev) => [...prev.slice(-3), row]);
      })
      .subscribe();

    return () => { void sb.removeChannel(ch); };
  }, []);

  if (!msgs.length) return null;

  return (
    <div
      style={{
        position: "absolute", top: 10, right: 10, zIndex: 20,
        width: 230, pointerEvents: "none",
        display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3,
        fontFamily: '"Courier New","Consolas",monospace',
      }}
      aria-hidden="true"
    >
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "2px 8px 2px 14px",
        border: "1px solid rgba(0,212,255,0.45)",
        background: "rgba(0,10,25,0.35)",
        clipPath: "polygon(12px 0, 100% 0, 100% 100%, 0 100%)",
      }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00d4ff", display: "inline-block" }} />
        <span style={{ fontSize: "0.62rem", letterSpacing: "0.1em", color: "rgba(0,212,255,0.85)", textTransform: "uppercase" }}>LIVE CHAT</span>
      </div>
      {msgs.map((m) => (
        <div key={m.id} style={{
          maxWidth: "100%", padding: "2px 8px",
          background: "rgba(0,8,20,0.42)",
          border: "1px solid rgba(0,212,255,0.15)",
          fontSize: "0.7rem", color: "rgba(210,230,255,0.82)",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          <span style={{ color: "rgba(0,212,255,0.7)", marginRight: 4 }}>{m.username ?? "Guest"}:</span>
          {m.content}
        </div>
      ))}
    </div>
  );
}

// ── StreamPanel ────────────────────────────────────────────────────────────────

export function StreamPanel({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  activeCameraId: _activeCameraId,
  streamUrl,
  zone = [],
  wsCount,
  wsDetections,
  wsStatus,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  roundInfo: _roundInfo,
  guess,
  hudData,
  className,
}: StreamPanelProps) {
  const hlsRef = useRef<HLSVideoRef>(null);
  const [streamState, setStreamState] = useState<
    "loading" | "playing" | "paused" | "offline" | "switching"
  >("loading");
  const [zoneHovered, setZoneHovered] = useState(false);

  const handlePlayStateChange = useCallback((playing: boolean) => {
    setStreamState(playing ? "playing" : "paused");
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleStreamError = useCallback((_r: string) => {
    setStreamState("offline");
  }, []);

  const handleStreamLoad = useCallback(() => {
    setStreamState("loading");
  }, []);

  // Listen for camera:switched event — shows switching overlay
  useEffect(() => {
    function onCameraSwitched() {
      setStreamState("switching");
      setTimeout(() => {
        setStreamState((prev) => prev === "switching" ? "loading" : prev);
      }, 5000);
    }
    window.addEventListener("camera:switched", onCameraSwitched);
    return () => window.removeEventListener("camera:switched", onCameraSwitched);
  }, []);

  const handlePlay = useCallback(() => {
    const video = hlsRef.current?.videoRef.current;
    if (video) {
      video.play().catch(() => {});
      setStreamState("playing");
    }
  }, []);

  return (
    <section
      className={cn(
        "stream-panel relative flex flex-1 flex-col bg-black overflow-hidden",
        className,
      )}
      aria-label="Live stream panel"
    >
      {/* ── Video wrapper — positioned reference for all overlays ── */}
      <div className="stream-wrapper relative flex-1 overflow-hidden">
        {/* HLS Video */}
        <HLSVideo
          ref={hlsRef}
          streamUrl={streamUrl}
          onPlayStateChange={handlePlayStateChange}
          onError={handleStreamError}
          onLoad={handleStreamLoad}
          className="absolute inset-0 h-full w-full object-contain"
        />

        {/* Detection bounding boxes */}
        {wsDetections.length > 0 && hlsRef.current?.videoRef && (
          <DetectionCanvas
            detections={wsDetections}
            videoRef={hlsRef.current.videoRef as React.RefObject<HTMLVideoElement>}
          />
        )}

        {/* Zone polygon overlay */}
        {zone.length >= 3 && hlsRef.current?.videoRef && (
          <ZoneOverlay
            zone={zone}
            videoRef={hlsRef.current.videoRef as React.RefObject<HTMLVideoElement>}
            isActive
            onZoneHover={setZoneHovered}
          />
        )}

        {/* Count widget — top-left, 56px from top (shifted down a bit) */}
        <CountWidget
          count={wsCount}
          wsStatus={wsStatus}
          guessMode={guess ?? undefined}
          className="top-[56px] left-3"
        />

        {/* Stream chat overlay — top-right */}
        <StreamChatOverlay />

        {/* Vision HUD — bottom-right */}
        <VisionHUD
          fps={hudData?.fps ?? 0}
          detectionRate={hudData?.detectionRate ?? 0}
          frameCount={hudData?.frameCount ?? 0}
          objectCount={hudData?.objectCount ?? 0}
          trafficMsg={hudData?.trafficMsg ?? ""}
        />

        {/* FPS overlay — bottom-left */}
        <FpsOverlay fps={hudData?.fps ?? 0} />

        {/* ── State overlays ── */}
        {streamState === "offline"    && <StreamOfflineOverlay />}
        {streamState === "switching"  && <StreamSwitchingOverlay />}
        {streamState === "paused"     && <PlayOverlay onPlay={handlePlay} />}

        {/* Zone hover hint */}
        {zoneHovered && (
          <div
            className="pointer-events-none absolute bottom-14 left-1/2 z-20 -translate-x-1/2"
            aria-hidden="true"
          >
            <span className="rounded-full border border-primary/30 bg-background/80 px-3 py-1 font-mono text-[10px] text-primary">
              AI DETECTION ZONE
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
