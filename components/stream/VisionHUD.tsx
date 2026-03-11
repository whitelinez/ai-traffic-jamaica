"use client";

/**
 * VisionHUD.tsx — AI inference HUD panel (top-right of stream).
 * Matches vanilla ml-hud exactly:
 *   - VISION HUD title (gold) + state badge (green/amber/red)
 *   - Verbose status line
 *   - Detection Rate cell with filled bar track
 *   - Traffic Load cell
 *   - Frames / Objects metrics row
 */

interface VisionHUDProps {
  fps: number;
  detectionRate: number;   // 0–100 percentage for the detection rate bar
  frameCount: number;
  objectCount: number;
  trafficMsg: string;
  stateLabel?: string;
  className?: string;
}

type StateVariant = "live" | "scan" | "delay" | "idle";

function stateVariant(label: string): StateVariant {
  const l = label.toLowerCase();
  if (l === "live") return "live";
  if (l === "scan") return "scan";
  if (l === "delay") return "delay";
  return "idle";
}

const STATE_STYLES: Record<StateVariant, { color: string; bg: string; border: string; dot: string }> = {
  live:  { color: "#ecffed",              bg: "rgba(26,104,59,0.30)",  border: "rgba(112,201,133,0.72)", dot: "#00FF88" },
  scan:  { color: "#fff2ce",              bg: "rgba(132,99,24,0.32)",  border: "rgba(225,185,74,0.70)",  dot: "#FFD600" },
  delay: { color: "#ffd7d7",              bg: "rgba(120,34,34,0.32)",  border: "rgba(255,116,116,0.72)", dot: "#FF6B6B" },
  idle:  { color: "rgba(180,215,230,0.65)", bg: "rgba(0,0,0,0.18)",   border: "rgba(180,215,230,0.18)", dot: "#7A9BB5" },
};

export function VisionHUD({
  fps,
  detectionRate,
  frameCount,
  objectCount,
  trafficMsg,
  stateLabel = "Idle",
}: VisionHUDProps) {
  const variant = stateVariant(stateLabel);
  const ss = STATE_STYLES[variant];
  const pct = Math.max(0, Math.min(100, detectionRate));

  return (
    <div
      id="ml-hud"
      title="AI Vision HUD"
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(0,212,255,0.45)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(0,212,255,0.25)"; }}
      style={{
        position:          "absolute",
        top:               12,
        right:             12,
        width:             194,
        background:        "rgba(8,12,20,0.82)",
        backdropFilter:    "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border:            "1px solid rgba(0,212,255,0.25)",
        borderRadius:      8,
        padding:           "10px 12px",
        zIndex:            6,
        userSelect:        "none",
        textAlign:         "left",
        transition:        "border-color 0.15s",
        cursor:            "default",
      }}
    >
      {/* ── Head row: title + state badge ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
        <span style={{
          fontSize:      "0.47rem",
          letterSpacing: "0.09em",
          textTransform: "uppercase",
          color:         "rgba(255,224,120,0.94)",
          fontWeight:    800,
          textShadow:    "0 0 6px rgba(255,214,0,0.24), 0 1px 6px rgba(0,0,0,0.45)",
        }}>
          VISION HUD
        </span>

        <span style={{
          display:       "inline-flex",
          alignItems:    "center",
          gap:           4,
          padding:       "1px 5px",
          fontSize:      "0.49rem",
          fontWeight:    800,
          letterSpacing: "0.03em",
          color:         ss.color,
          background:    ss.bg,
          border:        `1px solid ${ss.border}`,
        }}>
          {/* State dot */}
          <span style={{
            width: 6, height: 6, borderRadius: "50%",
            background: ss.dot, flexShrink: 0,
            animation: variant === "live" ? "pulse-dot 1.5s infinite" : "none",
          }} />
          <span id="ml-hud-wx-text">{stateLabel}</span>
        </span>
      </div>

      {/* ── Verbose status line ── */}
      <p style={{
        margin:        "0 0 5px",
        fontSize:      "0.42rem",
        lineHeight:    1.2,
        letterSpacing: "0.03em",
        color:         "rgba(255,238,185,0.8)",
        textShadow:    "0 1px 4px rgba(0,0,0,0.45)",
        whiteSpace:    "nowrap",
        overflow:      "hidden",
        textOverflow:  "ellipsis",
      }}>
        {fps > 0
          ? `${fps.toFixed(1)} fps | scene active`
          : "Scene lock scanning | retrain idle | scene --"}
      </p>

      {/* ── Cells ── */}
      <div style={{ display: "grid", gap: 2, marginBottom: 2 }}>

        {/* Detection Rate */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "2px 5px", alignItems: "center" }}>
          <span style={{ fontSize: "0.43rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(255,228,146,0.88)" }}>
            Detection Rate
          </span>
          <strong id="ml-hud-conf" style={{
            fontSize:         "0.49rem",
            color:            "#fff7d8",
            fontVariantNumeric: "tabular-nums",
            textShadow:       "0 0 5px rgba(255,214,0,0.18), 0 1px 4px rgba(0,0,0,0.42)",
          }}>
            {detectionRate.toFixed(1)}/m
          </strong>
          {/* Bar track */}
          <div style={{
            gridColumn:  "1 / -1",
            height:      6,
            position:    "relative",
            border:      "1px solid rgba(255,225,138,0.62)",
            background:  "rgba(255,255,255,0.04)",
            overflow:    "hidden",
            clipPath:    "polygon(0 50%, 4% 0, 100% 0, 96% 100%, 0 100%)",
          }}>
            <div id="ml-hud-conf-bar" style={{
              width:      `${pct}%`,
              height:     "100%",
              background: "repeating-linear-gradient(90deg, rgba(255,255,255,0.68) 0 5px, rgba(255,255,255,0.0) 5px 7px)",
              opacity:    0.74,
              transition: "width 180ms linear",
            }} />
          </div>
        </div>

        {/* Traffic Load */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "2px 5px" }}>
          <span style={{ fontSize: "0.43rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(255,228,146,0.88)" }}>
            Traffic Load
          </span>
          <span id="ml-hud-traffic-msg" style={{ fontSize: "0.42rem", color: "rgba(255,241,191,0.9)", lineHeight: 1.3 }}>
            {trafficMsg || "Waiting for data…"}
          </span>
        </div>
      </div>

      {/* ── Metrics row ── */}
      <div style={{
        display:        "flex",
        justifyContent: "space-between",
        gap:            6,
        fontSize:       "0.46rem",
        color:          "rgba(255,228,146,0.84)",
      }}>
        <span style={{ display: "inline-flex", flex: "1 1 0", alignItems: "center", justifyContent: "space-between", gap: 4, minWidth: 0 }}>
          Frames{" "}
          <strong id="ml-hud-frames" style={{ color: "#fff7d8", fontVariantNumeric: "tabular-nums", textShadow: "0 0 5px rgba(255,214,0,0.18), 0 1px 4px rgba(0,0,0,0.45)" }}>
            {frameCount.toLocaleString()}
          </strong>
        </span>
        <span style={{ display: "inline-flex", flex: "1 1 0", alignItems: "center", justifyContent: "space-between", gap: 4, minWidth: 0 }}>
          Objects{" "}
          <strong id="ml-hud-dets" style={{ color: "#fff7d8", fontVariantNumeric: "tabular-nums", textShadow: "0 0 5px rgba(255,214,0,0.18), 0 1px 4px rgba(0,0,0,0.45)" }}>
            {objectCount}
          </strong>
        </span>
      </div>
    </div>
  );
}
