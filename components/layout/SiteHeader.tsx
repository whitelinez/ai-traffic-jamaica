"use client";

import { LogoPulse } from "./LogoPulse";
import { UserNav } from "./UserNav";
import { cn } from "@/lib/utils";

interface SiteHeaderProps {
  /** Fires when Analytics CTA is clicked — wired to GovOverlay in Phase 5 */
  onAnalyticsClick?: () => void;
  /** Fires when Login button is clicked */
  onLoginClick?: () => void;
  onRegisterClick?: () => void;
  /** Show Demo button (admin only, passed from page) */
  showDemo?: boolean;
  onDemoClick?: () => void;
  className?: string;
}

export function SiteHeader({
  onAnalyticsClick,
  onLoginClick    = () => {},
  onRegisterClick = () => {},
  showDemo        = false,
  onDemoClick,
  className,
}: SiteHeaderProps) {
  return (
    <header
      className={cn(
        "site-header sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background/90 backdrop-blur-md px-4",
        className,
      )}
    >
      {/* Left: Logo */}
      <LogoPulse />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right: Actions */}
      <nav className="flex items-center gap-2" aria-label="Site navigation">
        {showDemo && (
          <button
            onClick={onDemoClick}
            className="hidden sm:flex items-center gap-1 px-3 py-1.5 text-xs font-label font-semibold tracking-wider text-accent border border-accent/30 rounded hover:bg-accent/10 transition-colors"
          >
            DEMO
          </button>
        )}

        <button
          onClick={onAnalyticsClick}
          className="px-3 py-1.5 text-xs font-label font-semibold tracking-wider text-primary-foreground bg-primary rounded hover:opacity-90 transition-opacity"
          aria-label="Open analytics dashboard"
        >
          ANALYTICS
        </button>

        <UserNav
          onLoginClick={onLoginClick}
          onRegisterClick={onRegisterClick}
        />
      </nav>
    </header>
  );
}
