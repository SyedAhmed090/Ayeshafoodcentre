"use client";

import { MotionConfig } from "framer-motion";

// Animation is for the customer site only; "user" turns it off for people who ask their phone for less motion.
export function CustomerMotion({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
