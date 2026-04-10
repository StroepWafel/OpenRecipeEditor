export const QUANTITY_KINDS = [
  "mass",
  "volume",
  "count",
  "temperature",
  "duration",
] as const;

/**
 * Ingredient line amounts: same as yield (count, mass, volume)—not temperature or duration.
 */
export const INGREDIENT_QUANTITY_KINDS = [
  "mass",
  "volume",
  "count",
] as const;

export { YIELD_QUANTITY_KINDS } from "@/lib/recipe-document";

/** Normative schema: `metric` for SI units; `us_customary` only for volume (tsp, tbsp, cup). */
export const UNIT_SYSTEMS = ["metric", "us_customary"] as const;

export const OVEN_FAN = ["Off", "Low", "High"] as const;

/** `DurationMeasurement`: only `quantity_kind` `duration` (prep/cook/total time). */
export const DURATION_MEASUREMENT_KINDS = ["duration"] as const;

export const SKILL_LEVELS = ["beginner", "intermediate", "advanced"] as const;

/**
 * When a list has more than this many rows, the **top** rows (lowest indices) auto-collapse
 * first so the **last** this many rows stay expanded unless the user opens a collapsed row.
 */
export const LIST_AUTO_COLLAPSE_THRESHOLD = 5;
