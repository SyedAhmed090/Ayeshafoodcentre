"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";

// The first page load must not start invisible: on a slow phone it would stay blank until JavaScript arrives.
let firstLoad = true;

// Page transition between menu, checkout and status.
export default function Template({ children }: { children: React.ReactNode }) {
  const animate = !firstLoad;
  useEffect(() => {
    firstLoad = false;
  }, []);
  return (
    <motion.div
      initial={animate ? { opacity: 0, y: 12 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
