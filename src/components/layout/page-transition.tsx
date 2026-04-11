"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";

type PageTransitionProps = {
  children: ReactNode;
  /** A unique key to trigger re-animation on route or content changes */
  pageKey?: string;
};

const PAGE_VARIANTS = {
  hidden: {
    opacity: 0,
    y: 12,
  },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: 0.2,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
} as const;

const TAB_VARIANTS = {
  hidden: {
    opacity: 0,
    x: 8,
  },
  enter: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.28,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
  exit: {
    opacity: 0,
    x: -8,
    transition: {
      duration: 0.15,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
} as const;

/**
 * Wraps page content in a smooth enter/exit animation.
 * Use `pageKey` to trigger re-animation when route changes.
 */
export function PageTransition({ children, pageKey }: PageTransitionProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pageKey}
        variants={PAGE_VARIANTS}
        initial="hidden"
        animate="enter"
        exit="exit"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Wraps tab content in a quick horizontal slide animation.
 * Use `pageKey` (e.g. the tab value) to trigger re-animation.
 */
export function TabTransition({ children, pageKey }: PageTransitionProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pageKey}
        variants={TAB_VARIANTS}
        initial="hidden"
        animate="enter"
        exit="exit"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
