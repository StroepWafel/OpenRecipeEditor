/**
 * Matches `#/$defs/MealType` in the Open Recipe Standard schema.
 */
export const MEAL_TYPES = [
  "breakfast",
  "brunch",
  "lunch",
  "dinner",
  "supper",
  "snack",
  "dessert",
  "tea",
  "appetizer",
  "side",
] as const;

export type MealType = (typeof MEAL_TYPES)[number];

const ALLOWED = new Set<string>(MEAL_TYPES);

/** Keeps only strings that are valid `MealType` enum values. */
export function normalizeMealTypeArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter(
    (x): x is string => typeof x === "string" && ALLOWED.has(x)
  );
}
