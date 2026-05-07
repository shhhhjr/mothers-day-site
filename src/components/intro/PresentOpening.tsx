"use client";

import { motion, AnimatePresence } from "framer-motion";

const STAGES = 5;

type PresentOpeningProps = {
  stage: number;
  onAdvance: () => void;
};

export function PresentOpening({ stage, onAdvance }: PresentOpeningProps) {
  const openAmount = Math.min(stage / STAGES, 1);
  const lidRotate = -35 * openAmount;
  const ribbonScale = 1 - openAmount * 0.85;

  return (
    <button
      type="button"
      onClick={onAdvance}
      className="relative flex h-[min(72vw,320px)] w-[min(72vw,320px)] cursor-pointer items-center justify-center rounded-3xl border-0 bg-transparent p-0 focus-visible:ring-2 focus-visible:ring-ring-focus"
      aria-label={
        stage < STAGES
          ? `Open the gift — step ${stage + 1} of ${STAGES}`
          : "Gift is open"
      }
    >
      <motion.div
        className="relative flex h-full w-full items-center justify-center"
        initial={false}
        animate={{ scale: 1 + openAmount * 0.02 }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
      >
        {/* Box base */}
        <div
          className="absolute bottom-0 h-[52%] w-[72%] rounded-lg bg-gradient-to-b from-[#4a2c55] to-[#2a142f] shadow-[0_24px_60px_rgba(0,0,0,0.45)]"
          style={{
            boxShadow: `inset 0 -12px 24px rgba(0,0,0,0.35), 0 20px 40px rgba(0,0,0,0.4)`,
          }}
        />
        {/* Lid */}
        <motion.div
          className="absolute bottom-[48%] left-[14%] h-[22%] w-[72%] origin-bottom rounded-md bg-gradient-to-b from-[#6b3d7a] to-[#4a2c55]"
          style={{ rotateX: 0 }}
          animate={{ rotate: lidRotate, y: openAmount * -8 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
        />
        {/* Ribbon vertical */}
        <motion.div
          className="absolute bottom-[10%] left-1/2 h-[65%] w-[14%] -translate-x-1/2 rounded-full bg-gradient-to-b from-rose-300 via-rose-400 to-rose-700 shadow-md"
          animate={{ scaleY: ribbonScale, opacity: 1 - openAmount * 0.6 }}
        />
        {/* Ribbon horizontal */}
        <motion.div
          className="absolute bottom-[42%] left-[14%] h-[12%] w-[72%] rounded-full bg-gradient-to-r from-rose-300 via-pink-500 to-rose-800 shadow-md"
          animate={{ scaleX: ribbonScale, opacity: 1 - openAmount * 0.5 }}
        />
        {/* Bow */}
        <motion.div
          className="absolute bottom-[58%] left-1/2 z-10 flex -translate-x-1/2 gap-1"
          animate={{
            scale: 1 - openAmount * 0.4,
            y: openAmount * -6,
            opacity: 1 - openAmount * 0.9,
          }}
        >
          <div className="h-10 w-14 rounded-full bg-gradient-to-br from-rose-200 to-rose-600 shadow-lg" />
          <div className="h-10 w-14 rounded-full bg-gradient-to-bl from-rose-200 to-rose-600 shadow-lg" />
        </motion.div>

        <AnimatePresence>
          {stage < STAGES && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute bottom-[-2.5rem] left-1/2 -translate-x-1/2 whitespace-nowrap text-sm text-muted"
            >
              Tap to unwrap ({stage}/{STAGES})
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
    </button>
  );
}
