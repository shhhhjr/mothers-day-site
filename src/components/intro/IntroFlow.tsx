"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { INTRO_STORAGE_KEY } from "@/lib/constants";
import { PresentOpening } from "./PresentOpening";

type Phase = "present" | "happy" | "slideA" | "slideB";

const SLIDE_A = `You have been such an amazing mother to me throughout all my life — this is our 18th Mother's Day together. You should be proud you made it this far. I know this year has been tricky, but despite that you still were there for me whenever I needed it, whether I was in Toronto or London. You always looked out for me, offered to get me food or Ubers, always trying to spoil me. I really appreciate that I can come to you with anything and you'll listen to me and help me deal with it.

Anyways, right now I do not have a lot of money, and I couldn't find any physical gift that I thought was personal enough — and so instead I made this…`;

const SLIDE_B = `This website is a simple family site where any of us can add memories, photos, songs, and more from our trips, photos of us as kids, or memories of you that were significant in our lives. Me, Haas, and Daddy already added a bunch of memories and photos involving you that were very strong for us.

My hope for this is that we can also use it when I go off to uni or when Daddy is on vacation and we are thinking of each other — we can add a memory we were thinking about or just look back on memories that were important to other family members.

Anyways, I really hope that this makes you smile — and if you're ever missing any of us, hopefully this can ease some of it. Happy Mother's Day. Love you, Mama.

Love, Jais`;

export function IntroFlow() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("present");
  const [presentStage, setPresentStage] = useState(0);

  useEffect(() => {
    try {
      if (localStorage.getItem(INTRO_STORAGE_KEY)) {
        router.replace("/profiles");
      }
    } catch {
      /* ignore */
    }
  }, [router]);

  const finishIntro = useCallback(() => {
    try {
      localStorage.setItem(INTRO_STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    router.replace("/profiles");
  }, [router]);

  const advancePresent = useCallback(() => {
    setPresentStage((s) => {
      const next = s + 1;
      if (next >= 5) {
        setPhase("happy");
        return 5;
      }
      return next;
    });
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="grain" aria-hidden />

      <AnimatePresence mode="wait">
        {phase === "present" && (
          <motion.section
            key="present"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35 }}
            className="flex min-h-screen flex-col items-center justify-center px-6 pb-24 pt-16"
          >
            <p className="mb-10 max-w-md text-center font-display text-2xl text-foreground sm:text-3xl">
              A little something for you
            </p>
            <PresentOpening stage={presentStage} onAdvance={advancePresent} />
          </motion.section>
        )}

        {phase === "happy" && (
          <motion.section
            key="happy"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex flex-col bg-background/95 px-6 pb-28 pt-20"
          >
            <div className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center text-center">
              <motion.h1
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="font-display text-4xl text-accent sm:text-5xl"
              >
                Happy Mother&apos;s Day
              </motion.h1>
              <p className="mt-6 text-lg text-muted">With love from Jais</p>
            </div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="fixed bottom-8 right-6 sm:bottom-10 sm:right-10"
            >
              <button
                type="button"
                onClick={() => setPhase("slideA")}
                className="rounded-full bg-accent/90 px-8 py-3 text-sm font-medium text-background shadow-lg transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-focus"
              >
                Next
              </button>
            </motion.div>
          </motion.section>
        )}

        {phase === "slideA" && (
          <motion.section
            key="slideA"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex flex-col bg-background px-6 pb-28 pt-16"
          >
            <div className="mx-auto max-h-[calc(100vh-8rem)] w-full max-w-2xl overflow-y-auto">
              <p className="whitespace-pre-line text-left leading-relaxed text-foreground/95">
                {SLIDE_A}
              </p>
            </div>
            <div className="fixed bottom-8 right-6 sm:bottom-10 sm:right-10">
              <button
                type="button"
                onClick={() => setPhase("slideB")}
                className="rounded-full border border-accent-gold/50 bg-card/80 px-8 py-3 text-sm font-medium text-foreground backdrop-blur transition hover:border-accent-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-focus"
              >
                Next
              </button>
            </div>
          </motion.section>
        )}

        {phase === "slideB" && (
          <motion.section
            key="slideB"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex flex-col bg-background px-6 pb-28 pt-16"
          >
            <div className="mx-auto max-h-[calc(100vh-8rem)] w-full max-w-2xl overflow-y-auto">
              <p className="whitespace-pre-line text-left leading-relaxed text-foreground/95">
                {SLIDE_B}
              </p>
            </div>
            <div className="fixed bottom-8 left-6 sm:bottom-10 sm:left-10">
              <button
                type="button"
                onClick={() => {
                  finishIntro();
                }}
                className="rounded-full bg-accent-gold/90 px-8 py-3 text-sm font-medium text-background shadow-lg transition hover:bg-accent-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-focus"
              >
                Open the family space
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
