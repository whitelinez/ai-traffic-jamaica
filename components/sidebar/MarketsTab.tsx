"use client";
/**
 * components/sidebar/MarketsTab.tsx
 * PLAY tab — banner tiles (round status + camera switcher) + guess panel.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { sb } from "@/lib/supabase-client";
import { cn } from "@/lib/utils";
import LiveBetPanel, { type Round } from "@/components/betting/LiveBetPanel";
import { CameraModal } from "@/components/stream/CameraModal";

// ── Types ────────────────────────────────────────────────────────────────────

interface BetRound extends Round {
  title?: string;
  camera_name?: string;
  opens_at?: string | null;
  closes_at?: string | null;
  ends_at?: string | null;
  next_round_at?: string | null;
  actual_count?: number | null;
  created_at?: string;
}

interface ResolvedCard {
  round: BetRound;
  won: boolean;
  payout: number;
}

export interface MarketsTabProps {
  activeCameraId?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCountdown(endIso: string | null | undefined): string {
  if (!endIso) return "--:--";
  const diff = Math.max(0, Math.ceil((new Date(endIso).getTime() - Date.now()) / 1000));
  const m = Math.floor(diff / 60).toString().padStart(2, "0");
  const s = (diff % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open:     "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    locked:   "bg-amber-500/15 text-amber-400 border-amber-500/30",
    upcoming: "bg-muted/10 text-muted border-border",
    resolved: "bg-muted/10 text-muted border-border",
  };
  const s = String(status).toLowerCase();
  return (
    <span className={cn("font-label font-semibold text-[10px] tracking-widest uppercase px-2 py-0.5 rounded-full border", styles[s] ?? "bg-muted/10 text-muted border-border")}>
      {s === "open" ? "LIVE" : s.toUpperCase()}
    </span>
  );
}

// ── Shared tile base style (matches .bnr-tile-landscape from vanilla) ─────────

const tileBase: React.CSSProperties = {
  position:   "relative",
  display:    "flex",
  alignItems: "center",
  padding:    "24px 18px 14px",
  gap:        16,
  minHeight:  74,
  borderRadius: 8,
};

// ── Round banner tile (matches vanilla .bnr-tile-play / .bnr-tile-live) ───────

function RoundBannerTile({ round, countdown }: { round: BetRound | null; countdown: string }) {
  const isLive = round?.status === "open";

  return (
    <div
      style={{
        ...tileBase,
        background: "linear-gradient(135deg, rgba(0,212,255,0.03) 0%, rgba(255,255,255,0.01) 100%), #0d1119",
        border:     isLive ? "1px solid rgba(255,214,0,0.55)" : "1px solid rgba(255,214,0,0.28)",
        boxShadow:  isLive
          ? "0 0 28px rgba(255,214,0,0.16), inset 0 0 24px rgba(0,0,0,0.3)"
          : "0 0 20px rgba(255,214,0,0.06), inset 0 0 24px rgba(0,0,0,0.3)",
        animation: isLive ? "bnrPlayPulse 2.4s ease-in-out infinite" : undefined,
      }}
    >
      {/* YOLO label top-left */}
      <span style={{
        position: "absolute", top: -1, left: 10,
        fontFamily: '"JetBrains Mono",monospace',
        fontSize: "0.52rem", letterSpacing: "0.14em", textTransform: "uppercase",
        padding: "0 6px",
        background: isLive ? "#22c55e" : "#FFD600",
        color: isLive ? "#021207" : "#0f0c00",
        fontWeight: 700,
      }}>
        {isLive ? "LIVE ROUND" : "NO ACTIVE ROUND"}
      </span>

      {/* Icon circle — matches .bnr-lbanner-icon */}
      <div style={{
        width: 52, height: 52, borderRadius: "50%", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: isLive ? "rgba(34,197,94,0.15)" : "rgba(34,197,94,0.08)",
        border: isLive ? "1.5px solid rgba(34,197,94,0.55)" : "1.5px solid rgba(34,197,94,0.25)",
        color: isLive ? "#22c55e" : "rgba(34,197,94,0.55)",
        boxShadow: isLive ? "0 0 18px rgba(34,197,94,0.22)" : "none",
      }}>
        {isLive ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
        )}
      </div>

      {/* Body — matches .bnr-lbanner-body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: "0 0 3px", fontSize: "0.9rem", fontWeight: 700, color: "rgba(220,235,248,0.95)", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {isLive ? (round?.title ?? "Match Live") : "Ready to Play"}
        </p>
        <p style={{ margin: 0, fontSize: "0.73rem", color: "rgba(150,180,210,0.6)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.4 }}>
          {isLive ? "A match is live — submit your guess before time runs out." : "Watch the live feed and get ready to guess. A match is coming soon."}
        </p>
      </div>

      {/* Action column — matches .bnr-lbanner-action */}
      <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 7 }}>
        {isLive ? (
          <>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: "0 0 2px", fontFamily: '"JetBrains Mono",monospace', fontWeight: 900, fontSize: "0.9rem", color: "#22c55e" }}>{countdown}</p>
              <p style={{ margin: 0, fontSize: "0.6rem", color: "rgba(34,197,94,0.6)", letterSpacing: "0.06em" }}>closes in</p>
            </div>
            <button
              onClick={() => (window as unknown as { Markets?: { enterRound?: () => void } }).Markets?.enterRound?.()}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "9px 18px", borderRadius: 6,
                border: "1px solid rgba(34,197,94,0.65)",
                background: "rgba(34,197,94,0.12)", color: "#22c55e",
                fontSize: "0.8rem", fontWeight: 700, fontFamily: '"JetBrains Mono",monospace',
                letterSpacing: "0.04em", cursor: "pointer",
                boxShadow: "0 0 16px rgba(34,197,94,0.22)",
                animation: "bnrGreenPulse 1.8s ease-in-out infinite",
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              Guess Now
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#FFD600", animation: "bnrAiPulse 0.85s ease-in-out infinite" }} />
              <span style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: "0.62rem", letterSpacing: "0.1em", color: "rgba(255,214,0,0.7)", textTransform: "uppercase" }}>LIVE</span>
            </div>
          </>
        ) : (
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: '"JetBrains Mono",monospace', fontSize: "0.7rem", color: "rgba(34,197,94,0.38)", letterSpacing: "0.1em", padding: "4px 0" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(34,197,94,0.35)", animation: "bnrAiPulse 2s ease-in-out infinite" }} />
            Standby
          </span>
        )}
      </div>
    </div>
  );
}

// ── Camera banner tile (matches vanilla .bnr-tile-camera landscape) ───────────

function CameraBannerTile({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Switch camera location"
      style={{
        ...tileBase,
        width: "100%", textAlign: "left", cursor: "pointer",
        background: "linear-gradient(135deg, rgba(0,212,255,0.03) 0%, rgba(255,255,255,0.01) 100%), #0d1119",
        border:     "1px solid rgba(0,212,255,0.28)",
        boxShadow:  "0 0 20px rgba(0,212,255,0.06), inset 0 0 24px rgba(0,0,0,0.3)",
        transition: "border-color 0.15s, box-shadow 0.15s, transform 0.12s",
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.borderColor = "rgba(0,212,255,0.55)";
        el.style.boxShadow = "0 0 28px rgba(0,212,255,0.14), inset 0 0 24px rgba(0,0,0,0.3)";
        el.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.borderColor = "rgba(0,212,255,0.28)";
        el.style.boxShadow = "0 0 20px rgba(0,212,255,0.06), inset 0 0 24px rgba(0,0,0,0.3)";
        el.style.transform = "";
      }}
    >
      {/* YOLO label */}
      <span style={{
        position: "absolute", top: -1, left: 10,
        fontFamily: '"JetBrains Mono",monospace',
        fontSize: "0.52rem", letterSpacing: "0.14em", textTransform: "uppercase",
        padding: "0 6px", background: "#00d4ff", color: "#000c14", fontWeight: 700,
      }}>
        CAMERAS
      </span>

      {/* Icon circle — cyan, matches .bnr-lbanner-icon-cam */}
      <div style={{
        width: 52, height: 52, borderRadius: "50%", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,212,255,0.09)", border: "1.5px solid rgba(0,212,255,0.32)", color: "#00d4ff",
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <rect x="2" y="7" width="14" height="10" rx="1.5"/><path d="M16 10l5-3v10l-5-3"/>
        </svg>
      </div>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: "0 0 3px", fontSize: "0.9rem", fontWeight: 700, color: "rgba(220,235,248,0.95)", lineHeight: 1.2 }}>
          Camera Feeds
        </p>
        <p style={{ margin: 0, fontSize: "0.73rem", color: "rgba(150,180,210,0.6)", lineHeight: 1.4 }}>
          Tap to browse and switch active camera feeds.
        </p>
      </div>

      {/* Action */}
      <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 7 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 7,
          padding: "9px 16px", borderRadius: 6,
          border: "1px solid rgba(0,212,255,0.32)", background: "rgba(0,212,255,0.07)",
          color: "rgba(0,212,255,0.82)", fontSize: "0.78rem", fontWeight: 600,
          fontFamily: '"JetBrains Mono",monospace', letterSpacing: "0.03em",
          pointerEvents: "none",
        }}>
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <rect x="1" y="4" width="10" height="8" rx="1"/><path d="M11 7l4-2v6l-4-2"/>
          </svg>
          View All
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00d4ff", opacity: 0.6 }} />
          <span style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: "0.62rem", letterSpacing: "0.1em", color: "rgba(0,212,255,0.55)", textTransform: "uppercase" }}>MULTI-CAM</span>
        </div>
      </div>
    </button>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function MarketsTab({ activeCameraId = "" }: MarketsTabProps) {
  const [round, setRound]               = useState<BetRound | null>(null);
  const [loading, setLoading]           = useState(true);
  const [countdown, setCountdown]       = useState("--:--");
  const [resolved, setResolved]         = useState<ResolvedCard | null>(null);
  const [camModalOpen, setCamModalOpen] = useState(false);

  const countdownRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const resolvedTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch round ────────────────────────────────────────────────────────

  const fetchRound = useCallback(async () => {
    try {
      const { data, error } = await sb
        .from("bet_rounds")
        .select("*")
        .in("status", ["open", "locked", "upcoming"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setRound(data ?? null);
    } catch (e) {
      console.warn("[MarketsTab] fetch failed:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Countdown tick ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!round) {
      if (countdownRef.current) clearInterval(countdownRef.current);
      return;
    }
    const targetIso =
      round.status === "open"   ? round.closes_at ?? round.ends_at :
      round.status === "locked" ? round.ends_at                     :
      round.opens_at;

    if (countdownRef.current) clearInterval(countdownRef.current);
    const tick = () => setCountdown(formatCountdown(targetIso));
    tick();
    countdownRef.current = setInterval(tick, 500);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [round]);

  // ── Poll every 15s ─────────────────────────────────────────────────────

  useEffect(() => {
    fetchRound();
    pollRef.current = setInterval(fetchRound, 15_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchRound]);

  // ── bet:resolved DOM event ─────────────────────────────────────────────

  useEffect(() => {
    function onResolved(e: Event) {
      const detail = (e as CustomEvent).detail ?? {};
      if (!round) return;
      setResolved({ round, won: !!detail.won, payout: Number(detail.payout ?? 0) });
      if (resolvedTimeout.current) clearTimeout(resolvedTimeout.current);
      resolvedTimeout.current = setTimeout(() => { setResolved(null); fetchRound(); }, 30_000);
    }
    document.addEventListener("bet:resolved", onResolved);
    return () => document.removeEventListener("bet:resolved", onResolved);
  }, [round, fetchRound]);

  // ── round:update DOM event ─────────────────────────────────────────────

  useEffect(() => {
    function onRoundUpdate() { fetchRound(); }
    window.addEventListener("round:update", onRoundUpdate);
    return () => window.removeEventListener("round:update", onRoundUpdate);
  }, [fetchRound]);


  // ── Cleanup ────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (countdownRef.current)    clearInterval(countdownRef.current);
      if (pollRef.current)         clearInterval(pollRef.current);
      if (resolvedTimeout.current) clearTimeout(resolvedTimeout.current);
    };
  }, []);

  // ── Loading ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col gap-3 p-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-14 rounded-lg bg-card border border-border animate-pulse" />
        ))}
      </div>
    );
  }

  // ── Resolved card ──────────────────────────────────────────────────────

  if (resolved) {
    const { won, payout } = resolved;
    return (
      <div className="flex flex-col gap-3 p-4">
        {/* Banner tiles remain visible */}
        <RoundBannerTile round={null} countdown="--:--" />
        <CameraBannerTile onClick={() => setCamModalOpen(true)} />

        <div className={cn("rounded-lg border px-4 py-4 flex flex-col gap-2 mt-1",
          won ? "bg-emerald-500/10 border-emerald-500/30" : "bg-destructive/10 border-destructive/30"
        )}>
          <div className="flex items-center gap-2">
            <span className={cn("font-label font-bold tracking-widest text-xs px-2 py-0.5 rounded-full border",
              won ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-destructive/15 text-destructive border-destructive/30"
            )}>
              {won ? "WIN" : "MISS"}
            </span>
            {won && <span className="font-display font-bold text-emerald-400">+{payout.toLocaleString()} pts</span>}
          </div>
          <p className="text-sm text-muted">
            {won ? "Your guess was close enough — points awarded." : "Your guess missed this round."}
          </p>
        </div>
        <p className="text-center text-xs text-muted">Next round loading...</p>

        <CameraModal open={camModalOpen} onClose={() => setCamModalOpen(false)} activeCamId={activeCameraId} />
      </div>
    );
  }

  const isOpen   = round?.status === "open";
  const isLocked = round?.status === "locked";

  return (
    <div className="flex flex-col gap-0">
      {/* ── Banner tiles — always at top ── */}
      <div className="flex flex-col gap-2 px-4 pt-4 pb-3">
        <RoundBannerTile round={round} countdown={countdown} />
        <CameraBannerTile onClick={() => setCamModalOpen(true)} />
      </div>


      {/* ── Round card ── */}
      {round && (
        <>
          <div className="mx-4 mb-0 bg-card border border-border rounded-t-lg px-4 py-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-label font-semibold text-xs tracking-wider text-muted uppercase">
                {round.camera_name ?? "Live Camera"}
              </span>
              <StatusBadge status={round.status} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-foreground font-semibold text-sm">
                {round.title ?? "Live Prediction Round"}
              </span>
              <div className="text-right">
                <p className="font-mono font-bold text-base text-primary">{countdown}</p>
                <p className="text-[10px] text-muted">
                  {isOpen ? "closes in" : isLocked ? "ends in" : "opens in"}
                </p>
              </div>
            </div>
          </div>

          {isOpen && (
            <div className="mx-4 mb-4 bg-card/50 border border-t-0 border-border rounded-b-lg">
              <div className="h-px bg-border" />
              <LiveBetPanel round={round} />
            </div>
          )}

          {isLocked && (
            <div className="mx-4 mb-4 bg-card/50 border border-t-0 border-border rounded-b-lg px-4 py-4 text-center">
              <p className="text-amber-400 text-sm font-label font-semibold tracking-wider">GUESSES LOCKED</p>
              <p className="text-xs text-muted mt-1">Waiting for round to end...</p>
            </div>
          )}

          {round.status === "upcoming" && (
            <div className="mx-4 mb-4 bg-card/50 border border-t-0 border-border rounded-b-lg px-4 py-4 text-center">
              <p className="text-muted text-sm">Round opens in</p>
              <p className="font-mono text-primary font-bold text-xl">{countdown}</p>
            </div>
          )}
        </>
      )}

      <CameraModal open={camModalOpen} onClose={() => setCamModalOpen(false)} activeCamId={activeCameraId} />
    </div>
  );
}
