"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "wlz.onboarding.done";

const STEPS = [
  {
    num: "1 OF 4",
    title: <>Watch real traffic.</>,
    body: "AI counts every vehicle in real time on a live Jamaican road camera. The detection zone spans the lane — every car, truck, and bus that crosses it gets logged.",
    chips: null,
    badge: null,
  },
  {
    num: "2 OF 4",
    title: <>Predict. <span className="text-primary">Score.</span></>,
    body: "When a round opens, guess how many vehicles will cross in 1, 3, or 5 minutes. Exact prediction scores the most. Within ±3 earns partial. Miss gets nothing.",
    chips: null,
    badge: null,
  },
  {
    num: "3 OF 4",
    title: <>Beyond the count.</>,
    body: "The same live feed powers a full analytics dashboard — vehicle class breakdown, flow direction, queue depth, and speed stats. Open it from any camera view.",
    chips: ["Class Split", "Queue Depth", "Speed", "Turning Flow"],
    badge: "Traffic Intelligence",
  },
  {
    num: "4 OF 4",
    title: <>Early access.</>,
    body: "This platform is actively being built. Detection works best in daylight with a stable stream — we're integrating a dedicated provider for consistent 24/7 coverage and night detection. You're in early.",
    chips: null,
    badge: null,
    beta: true,
  },
] as const;

export function OnboardingOverlay() {
  const [visible, setVisible] = useState(false);
  const [step, setStep]       = useState(0);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  function next() {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else dismiss();
  }

  if (!visible) return null;

  const current = STEPS[step];

  return (
    <AnimatePresence>
      <motion.div
        key="ob-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
        role="dialog"
        aria-modal="true"
        aria-label="Welcome"
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="relative w-full max-w-sm rounded-xl border border-border bg-card/95 p-7 shadow-DEFAULT"
        >
          {/* Skip */}
          <button
            onClick={dismiss}
            aria-label="Skip intro"
            className="absolute right-4 top-4 text-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Step content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
            >
              <p className="mb-2 font-mono text-[10px] tracking-widest text-muted uppercase">
                {current.num}
              </p>

              {current.badge && (
                <div className="mb-3 inline-flex items-center gap-1.5 rounded border border-primary/20 bg-primary/5 px-2 py-1 text-[11px] text-primary">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/img/iconinframes.png" alt="" className="h-3 w-3" />
                  {current.badge}
                </div>
              )}

              <h2 className="mb-3 font-display text-2xl font-bold leading-tight text-foreground">
                {current.title}
              </h2>
              <p className="text-sm text-muted leading-relaxed">{current.body}</p>

              {current.chips && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {current.chips.map(chip => (
                    <span
                      key={chip}
                      className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[11px] text-primary"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              )}

              {"beta" in current && current.beta && (
                <div className="mt-4 flex items-center gap-2 rounded border border-accent/20 bg-accent/5 px-3 py-2">
                  <span className="rounded bg-accent px-1.5 py-0.5 text-[9px] font-bold text-accent-foreground tracking-widest">
                    BETA
                  </span>
                  <span className="text-[11px] text-muted">
                    Features and data may change as we develop.
                  </span>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="mt-6 flex items-center justify-between">
            {/* Dot indicators */}
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  aria-label={`Go to step ${i + 1}`}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === step
                      ? "w-5 bg-primary"
                      : "w-1.5 bg-border hover:bg-muted",
                  )}
                />
              ))}
            </div>

            <button
              onClick={next}
              className="flex items-center gap-1.5 rounded px-4 py-2 text-xs font-label font-semibold tracking-wider text-primary border border-primary/30 hover:bg-primary/10 transition-colors"
            >
              {step < STEPS.length - 1 ? (
                <>NEXT <ArrowRight className="h-3 w-3" /></>
              ) : (
                "LET'S GO"
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
