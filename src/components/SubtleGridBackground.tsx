import { motion } from "motion/react";

/**
 * Restrained editorial background (grid + soft vignette). Inspired by shader/grid
 * aesthetics without heavy WebGL — keeps the editor calm and non-"AI product" looking.
 */
export function SubtleGridBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden
    >
      <motion.div
        className="absolute inset-0 opacity-[0.22]"
        initial={{ opacity: 0.12 }}
        animate={{ opacity: 0.22 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        style={{
          backgroundImage: `
            linear-gradient(to right, var(--color-border) 1px, transparent 1px),
            linear-gradient(to bottom, var(--color-border) 1px, transparent 1px)
          `,
          backgroundSize: "56px 56px",
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--color-canvas)_0%,_transparent_55%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-canvas)]/80 via-transparent to-[var(--color-canvas)]" />
    </div>
  );
}
