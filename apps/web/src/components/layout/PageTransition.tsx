'use client';

import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

// ── PageTransition ───────────────────────────────────────────────────────────
//
// Wraps a layout's {children} slot to animate route changes within that
// shell. Deliberately NOT placed at the root layout — the root wraps every
// route group (marketing/auth/app/admin), and those have entirely different
// persistent chrome (or none). Animating at that level would force the
// whole page — including things like the app sidebar — to remount and
// re-animate on every navigation, which reads as broken, not polished.
//
// Instead this is inserted inside each shell layout's own children slot:
//   (app)/layout.tsx        → wraps the <main> content area only
//   (app)/admin/layout.tsx  → wraps the admin content area only
//   (marketing)/layout.tsx  → wraps the <main> content area only
//   (auth)/layout.tsx       → wraps the whole (minimal) auth page
//
// The sidebar, header, and footer in each shell stay mounted and static;
// only the page content beneath them cross-fades and lifts on navigation.
//
// `key={pathname}` is what makes AnimatePresence detect a route change at
// all — without a changing key, React treats consecutive children as the
// same element and never fires exit/enter animations.

const variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -8 },
};

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // The global CSS reduced-motion block (globals.css) only catches
  // CSS `transition`/`animation` — it has no effect on Framer Motion,
  // which drives its own values via requestAnimationFrame. This runs on
  // every single route change in the app, making it the single most
  // consequential place that preference was previously being ignored.
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        variants={variants}
        initial={reduceMotion ? false : 'initial'}
        animate="animate"
        exit={reduceMotion ? undefined : 'exit'}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.22, ease: [0.33, 1, 0.68, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
