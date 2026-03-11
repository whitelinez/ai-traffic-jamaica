"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const CYCLE_INTERVAL_MS = 5 * 60 * 1000; // 5 min auto-cycle
const AI_ACTIVE_MS = 3000;               // show AI frame for 3 s on hover/cycle

export function LogoPulse() {
  const [aiActive, setAiActive] = useState(false);
  const cycleTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const revertTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function activateAI() {
    setAiActive(true);
    if (revertTimer.current) clearTimeout(revertTimer.current);
    revertTimer.current = setTimeout(() => setAiActive(false), AI_ACTIVE_MS);
  }

  useEffect(() => {
    cycleTimer.current = setInterval(activateAI, CYCLE_INTERVAL_MS);
    return () => {
      if (cycleTimer.current)  clearInterval(cycleTimer.current);
      if (revertTimer.current) clearTimeout(revertTimer.current);
    };
  }, []);

  return (
    <Link
      href="/"
      className="flex items-center gap-2.5 no-underline group"
      aria-label="AI Traffic Jamaica — Home"
    >
      {/* Dual-image logo frame */}
      <span className="relative h-8 w-8 shrink-0">
        <Image
          src="/iconinframes.png"
          alt="AI Traffic Jamaica"
          fill
          className={`object-contain transition-opacity duration-500 ${
            aiActive ? "opacity-0" : "opacity-100"
          }`}
          priority
        />
        <Image
          src="/aiframes.png"
          alt=""
          aria-hidden
          fill
          className={`object-contain transition-opacity duration-500 ${
            aiActive ? "opacity-100" : "opacity-0"
          }`}
        />
      </span>

      {/* Wordmark */}
      <span
        className="flex flex-col leading-none"
        onMouseEnter={activateAI}
      >
        <span className="font-display text-sm font-bold tracking-widest text-foreground uppercase">
          AI Traffic
        </span>
        <span className="font-display text-[10px] font-bold tracking-[0.22em] text-primary uppercase">
          Jamaica
        </span>
      </span>
    </Link>
  );
}
