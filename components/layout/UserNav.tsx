"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, LogOut, Shield, Star, User } from "lucide-react";
import { sb } from "@/lib/supabase-client";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";

interface UserNavProps {
  onLoginClick:    () => void;
  onRegisterClick: () => void;
}

export function UserNav({ onLoginClick, onRegisterClick }: UserNavProps) {
  const supabase = sb;
  const [user, setUser]       = useState<SupabaseUser | null>(null);
  const [balance, setBalance] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen]       = useState(false);
  const menuRef               = useRef<HTMLDivElement>(null);

  /* ── Auth state ── */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  /* ── Profile: balance + role ── */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!user) { setBalance(0); setIsAdmin(false); return; }
    supabase
      .from("profiles")
      .select("points, role")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setBalance(data.points ?? 0);
        setIsAdmin(data.role === "admin");
      });
  }, [user]);

  /* ── Close on outside click ── */
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setOpen(false);
  }

  /* ── Logged out ── */
  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={onLoginClick}
          className="px-3 py-1.5 text-xs font-label font-semibold tracking-wider text-foreground border border-border rounded hover:border-primary/40 hover:text-primary transition-colors"
        >
          LOGIN
        </button>
        {/* Hidden register trigger for JS wiring */}
        <button onClick={onRegisterClick} className="sr-only" tabIndex={-1}>
          Register
        </button>
      </div>
    );
  }

  /* ── Logged in ── */
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;
  const initials  = (user.email ?? "U")[0].toUpperCase();

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full hover:ring-1 hover:ring-primary/40 transition-all"
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt="Profile"
            width={30}
            height={30}
            className="rounded-full object-cover"
          />
        ) : (
          <span className="h-[30px] w-[30px] rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
            {initials}
          </span>
        )}
        <ChevronDown
          className={cn("h-3 w-3 text-muted transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-border bg-popover shadow-DEFAULT z-50 py-1">
          {/* Balance */}
          <div className="flex items-center gap-1.5 px-3 py-2 text-xs text-accent">
            <Star className="h-3 w-3" aria-hidden />
            <span className="font-mono-data font-bold">{balance.toLocaleString()}</span>
            <span className="text-muted ml-1">PTS</span>
          </div>
          <div className="my-1 border-t border-border" />

          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-white/5 no-underline transition-colors"
          >
            <User className="h-3.5 w-3.5 text-muted" aria-hidden />
            Account
          </Link>

          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-white/5 no-underline transition-colors"
            >
              <Shield className="h-3.5 w-3.5 text-muted" aria-hidden />
              Admin
            </Link>
          )}

          <div className="my-1 border-t border-border" />

          <button
            onClick={signOut}
            className="flex w-full items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
