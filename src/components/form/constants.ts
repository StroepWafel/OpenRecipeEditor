export const QUANTITY_KINDS = [
  "mass",
  "volume",
  "count",
  "temperature",
  "duration",
] as const;

export { YIELD_QUANTITY_KINDS } from "@/lib/recipe-document";

/** Normative schema: `unit_system` is always `"metric"`. */
export const UNIT_SYSTEMS = ["metric"] as const;

export const OVEN_FAN = ["Off", "Low", "High"] as const;

/** `DurationMeasurement`: only `quantity_kind` `duration` (prep/cook/total time). */
export const DURATION_MEASUREMENT_KINDS = ["duration"] as const;

export const SKILL_LEVELS = ["beginner", "intermediate", "advanced"] as const;
