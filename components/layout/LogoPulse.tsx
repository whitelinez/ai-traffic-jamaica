"use client";

import Image from "next/image";
import Link from "next/link";

export function LogoPulse() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2.5 no-underline hover:no-underline group"
      aria-label="AI Traffic Jamaica — Home"
    >
      {/* Dual-image logo — AI frames always visible behind inner icon */}
      <span className="relative h-10 w-10 shrink-0">
        {/* AI frames — behind inner icon, scales up on hover */}
        <Image
          src="/aiframes.png"
          alt=""
          aria-hidden
          fill
          className="object-contain transition-transform duration-300 group-hover:scale-[1.22]"
          style={{ zIndex: 0 }}
        />
        {/* Inner icon — always on top */}
        <Image
          src="/iconinframes.png"
          alt="AI Traffic Jamaica"
          fill
          className="object-contain"
          style={{ zIndex: 10 }}
          priority
        />
      </span>

      {/* Wordmark */}
      <span className="flex flex-col leading-none">
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
