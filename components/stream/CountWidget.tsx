"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

type WsStatus = "connected" | "disconnected" | "error" | "connecting";

interface GuessMode {
  current: number;
  target:  number;
}

interface CountWidgetProps {
  count:      number;
  wsStatus:   WsStatus;
  guessMode?: GuessMode;
  className?: string;
}

interface PlusOne {
  id: number;
  delta: number;
}

function WsDot({ status }: { status: WsStatus }) {
  const colorClass =
    status === "connected"
      ? "bg-green-live shadow-green"
      : status === "connecting"
        ? "bg-accent"
        : "bg-destructive";
  return (
    <span
      aria-label={`WebSocket ${status}`}
      className={cn(
        "inline-block h-2 w-2 rounded-full flex-shrink-0",
        colorClass,
        status === "connected" && "animate-pulse-dot",
      )}
    />
  );
}

function progressColor(pct: number): string {
  if (pct >= 100) return "#ef4444";
  if (pct >= 80)  return "#eab308";
  return "#22c55e";
}

export function CountWidget({ count, wsStatus, guessMode, className }: CountWidgetProps) {
  const isGuessMode = guessMode != null;
  const pct      = isGuessMode && guessMode.target > 0
    ? Math.min(100, (guessMode.current / guessMode.target) * 100)
    : 0;
  const barColor = progressColor(pct);

  // +1 pop animation
  const [plusOnes, setPlusOnes] = useState<PlusOne[]>([]);
  const prevCountRef = useRef(count);
  const idRef        = useRef(0);

  useEffect(() => {
    const prev = prevCountRef.current;
    const delta = count - prev;
    if (delta > 0) {
      const id = ++idRef.current;
      setPlusOnes(p => [...p, { id, delta }]);
      setTimeout(() => setPlusOnes(p => p.filter(x => x.id !== id)), 900);
    }
    prevCountRef.current = count;
  }, [count]);

  return (
    <div
      id="count-widget"
      aria-label="floating vehicle count widget"
      className={cn(
        "absolute z-20 flex flex-col gap-1.5 min-w-[120px] px-2.5 py-2",
        className,
      )}
      style={{
        background:     "rgba(4,7,14,0)",
        border:         "1px solid rgba(255,214,0,0.42)",
        borderRadius:   0,
        clipPath:       "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))",
        backdropFilter: "none",
        transition:     "background 0.25s, backdrop-filter 0.25s, box-shadow 0.25s",
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.background = "rgba(4,7,14,0.72)";
        el.style.backdropFilter = "blur(3px)";
        el.style.boxShadow = "0 0 18px rgba(255,214,0,0.06), inset 0 0 0 1px rgba(255,214,0,0.06)";
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.background = "rgba(4,7,14,0)";
        el.style.backdropFilter = "none";
        el.style.boxShadow = "none";
      }}
    >
      {/* +1 pop overlays */}
      {plusOnes.map(p => (
        <span
          key={p.id}
          aria-hidden="true"
          style={{
            position:    "absolute",
            top:         -2,
            right:       -4,
            fontFamily:  '"JetBrains Mono", monospace',
            fontWeight:  900,
            fontSize:    "0.9rem",
            color:       "#FFD600",
            textShadow:  "0 0 10px rgba(255,214,0,0.7)",
            pointerEvents: "none",
            animation:   "plusOnePop 0.85s ease-out forwards",
          }}
        >
          +{p.delta}
        </span>
      ))}

      {/* HUD label */}
      <div
        aria-hidden="true"
        style={{
          fontFamily:    '"JetBrains Mono", monospace',
          fontSize:      "0.52rem",
          letterSpacing: "0.14em",
          color:         "rgba(255,214,0,0.45)",
          marginBottom:  2,
        }}
      >
        LIVE COUNT
      </div>

      {isGuessMode ? (
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-1 font-mono">
            <span
              id="cw-gm-current"
              aria-label="vehicle count value"
              style={{ fontSize: "2rem", fontWeight: 900, lineHeight: 1, color: "#FFD600", fontFamily: '"JetBrains Mono", monospace', textShadow: "0 0 14px rgba(255,214,0,0.4)" }}
            >
              {guessMode.current.toLocaleString()}
            </span>
            <span style={{ color: "rgba(255,220,100,0.5)", fontSize: "1.4rem", lineHeight: 1 }}>/</span>
            <span
              id="cw-gm-target"
              style={{ fontSize: "2rem", fontWeight: 900, lineHeight: 1, color: "rgba(255,214,0,0.55)", fontFamily: '"JetBrains Mono", monospace' }}
            >
              {guessMode.target.toLocaleString()}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
            <div
              id="cw-gm-bar"
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${pct}%`, background: barColor }}
            />
          </div>
        </div>
      ) : (
        <div className="flex items-baseline gap-2">
          <span
            id="cw-total"
            aria-label="vehicle count value"
            style={{
              fontFamily:    '"JetBrains Mono", monospace',
              fontSize:      "2rem",
              fontWeight:    900,
              lineHeight:    1,
              color:         "#FFD600",
              textShadow:    "0 0 14px rgba(255,214,0,0.4), 0 2px 8px rgba(0,0,0,0.6)",
              letterSpacing: "-0.02em",
            }}
          >
            {count.toLocaleString()}
          </span>
        </div>
      )}

      <div className="flex items-center justify-end mt-0.5">
        <WsDot status={wsStatus} />
      </div>
    </div>
  );
}
