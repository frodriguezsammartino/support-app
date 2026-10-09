"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";

export function SuccessCelebration({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center bg-black/10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="flex size-24 items-center justify-center rounded-full bg-brand text-white shadow-xl"
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.15, 1] }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.25 }}
            >
              <Check className="size-12" strokeWidth={3} />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
