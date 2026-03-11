"use client";
/**
 * components/sidebar/Sidebar.tsx
 * 380px sidebar wrapper. Tab bar + panel routing.
 * Tabs: PLAY | RANKINGS | LIVE | INTEL
 * Active tab shows YOLO detection corner brackets (vanilla AI frames effect).
 */

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import MarketsTab from "./MarketsTab";
import LeaderboardTab from "./LeaderboardTab";
import ChatTab from "./ChatTab";
import IntelTab, { type MlStats } from "./IntelTab";
import { LAYOUT } from "@/lib/constants";

// ── Types ────────────────────────────────────────────────────────────────────

type Tab = "markets" | "leaderboard" | "chat" | "intel";

interface Camera {
  id: string;
  name: string;
  alias?: string;
}

interface RoundInfo {
  id?: string;
  status?: string;
  title?: string;
}

type WsStatus = "connected" | "connecting" | "disconnected" | "error";

interface Props {
  cameras?: Camera[];
  activeCameraId?: string;
  wsCount?: number;
  roundInfo?: RoundInfo | null;
  wsStatus?: WsStatus;
  mlStats?: MlStats | null;
}

// ── Tab config ───────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; ariaLabel: string }[] = [
  { id: "markets",     label: "PLAY",     ariaLabel: "Guess panel"          },
  { id: "leaderboard", label: "RANKINGS", ariaLabel: "Leaderboard rankings" },
  { id: "chat",        label: "LIVE",     ariaLabel: "Live chat"            },
  { id: "intel",       label: "INTEL",    ariaLabel: "AI intelligence data" },
];

// Inline SVG for detection corner brackets — matches vanilla exactly
const DETECT_BRACKET_URL = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 44' preserveAspectRatio='none'%3E%3Cg stroke='%2300d4ff' stroke-width='2.4' fill='none' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M14 1H1V14'/%3E%3Cpath d='M86 1H99V14'/%3E%3Cpath d='M1 30V43H14'/%3E%3Cpath d='M86 43H99V30'/%3E%3C/g%3E%3C/svg%3E")`;

// ── Component ────────────────────────────────────────────────────────────────

export default function Sidebar({
  activeCameraId = "",
  mlStats,
  wsStatus,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("markets");
  const [chatUnread, setChatUnread] = useState(0);

  // Listen for programmatic tab switches (e.g. "View Rankings" from bet result)
  useEffect(() => {
    function onTabSwitch(e: Event) {
      const tab = (e as CustomEvent<Tab>).detail;
      if (TABS.some((t) => t.id === tab)) {
        setActiveTab(tab);
        if (tab === "chat") setChatUnread(0);
      }
    }
    window.addEventListener("sidebar:tab", onTabSwitch);
    return () => window.removeEventListener("sidebar:tab", onTabSwitch);
  }, []);

  // Track chat unread when not on chat tab
  useEffect(() => {
    function onMessage() {
      if (activeTab !== "chat") setChatUnread((n) => n + 1);
    }
    window.addEventListener("chat:message-received", onMessage);
    return () => window.removeEventListener("chat:message-received", onMessage);
  }, [activeTab]);

  function handleTabClick(tab: Tab) {
    setActiveTab(tab);
    if (tab === "chat") setChatUnread(0);
  }

  return (
    <aside
      className="flex flex-col bg-surface border-l border-border h-full overflow-hidden"
      style={{ width: LAYOUT.SIDEBAR_W, minWidth: LAYOUT.SIDEBAR_W, maxWidth: LAYOUT.SIDEBAR_W }}
      aria-label="Game sidebar"
    >
      {/* Tab bar */}
      <nav
        className="flex-shrink-0 flex items-stretch bg-background border-b border-border sticky top-0 z-10"
        style={{ overflow: "visible" }}
        role="tablist"
        aria-label="Sidebar tabs"
      >
        {TABS.map((tab) => {
          const isActive   = activeTab === tab.id;
          const showBadge  = tab.id === "chat" && chatUnread > 0 && !isActive;
          const showOnline = tab.id === "chat" && wsStatus === "connected" && !showBadge;

          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-label={tab.ariaLabel}
              onClick={() => handleTabClick(tab.id)}
              style={{
                position:    "relative",
                flex:        1,
                padding:     "12px 0",
                fontSize:    "0.82rem",
                fontWeight:  600,
                letterSpacing: "0.04em",
                color:       isActive ? "#00d4ff" : "rgba(130,155,185,0.7)",
                background:  isActive ? "rgba(0,212,255,0.04)" : "transparent",
                border:      "none",
                borderBottom: "none",
                textShadow:  isActive ? "0 0 10px rgba(0,212,255,0.2)" : "none",
                transition:  "color .15s, background .15s",
                overflow:    "visible",
                cursor:      "pointer",
                display:     "flex",
                alignItems:  "center",
                justifyContent: "center",
                gap:         5,
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.color = "rgba(190,220,240,0.9)";
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,212,255,0.04)";
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.color = "rgba(130,155,185,0.7)";
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                }
              }}
            >
              {/* YOLO detection bracket overlay — active only */}
              {isActive && (
                <span
                  aria-hidden="true"
                  style={{
                    position:           "absolute",
                    top:                3,
                    right:              5,
                    bottom:             3,
                    left:               5,
                    backgroundImage:    DETECT_BRACKET_URL,
                    backgroundSize:     "100% 100%",
                    backgroundRepeat:   "no-repeat",
                    backgroundPosition: "center",
                    pointerEvents:      "none",
                    opacity:            0.85,
                    animation:          "tabDetectIn 0.18s ease-out forwards",
                    zIndex:             2,
                  }}
                />
              )}

              {tab.label}

              {/* Chat unread badge */}
              {showBadge && (
                <span style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  minWidth: 16, height: 16, borderRadius: 999, padding: "0 4px",
                  background: "rgba(0,188,212,0.2)", border: "1px solid rgba(0,188,212,0.52)",
                  color: "#baf8ff", fontSize: "0.62rem", fontWeight: 700,
                }}>
                  {chatUnread > 99 ? "99+" : chatUnread}
                </span>
              )}

              {/* Live dot when connected on chat tab */}
              {showOnline && (
                <span className="w-1.5 h-1.5 rounded-full bg-green-active animate-pulse-dot" />
              )}
            </button>
          );
        })}
      </nav>

      {/* WS status bar */}
      {wsStatus && wsStatus !== "connected" && (
        <div
          className={cn(
            "flex-shrink-0 flex items-center gap-1.5 px-4 py-1.5 text-[10px] font-label font-semibold tracking-wider",
            wsStatus === "connecting"
              ? "bg-amber-500/10 text-amber-400 border-b border-amber-500/20"
              : "bg-destructive/10 text-destructive border-b border-destructive/20"
          )}
        >
          <span className={cn(
            "w-1.5 h-1.5 rounded-full",
            wsStatus === "connecting" ? "bg-amber-400 animate-pulse" : "bg-destructive"
          )} />
          {wsStatus === "connecting" ? "Connecting..." : "Disconnected — retrying"}
        </div>
      )}

      {/* Tab panels */}
      <div
        className="flex-1 overflow-hidden"
        role="tabpanel"
        aria-label={TABS.find((t) => t.id === activeTab)?.ariaLabel}
      >
        {activeTab === "markets" && (
          <div className="h-full overflow-y-auto">
            <MarketsTab activeCameraId={activeCameraId} />
          </div>
        )}
        {activeTab === "leaderboard" && (
          <div className="h-full overflow-hidden flex flex-col">
            <LeaderboardTab />
          </div>
        )}
        {activeTab === "chat" && (
          <div className="h-full overflow-hidden flex flex-col">
            <ChatTab />
          </div>
        )}
        {activeTab === "intel" && (
          <div className="h-full overflow-y-auto">
            <IntelTab mlStats={mlStats} />
          </div>
        )}
      </div>
    </aside>
  );
}
