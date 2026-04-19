/**
 * Allowed `unit` codes for `quantity_kind` **count** on a normative `Measurement`
 * (ingredient amounts, alternates, oven metadata—not `YieldMeasurement` count output).
 */
export const MEASUREMENT_COUNT_UNIT_CODES = [
  "each",
  "dozen",
  "serving",
  "servings",
  "portion",
  "portions",
  "cookie",
  "cookies",
  "slice",
  "slices",
  "egg",
  "eggs",
  "batch",
  "batches",
  "loaf",
  "loaves",
  "muffin",
  "muffins",
] as const;

export function isMeasurementCountUnitCode(unit: string): boolean {
  return (MEASUREMENT_COUNT_UNIT_CODES as readonly string[]).includes(unit);
}

/** Map legacy or unknown count labels to a schema `Measurement` count unit. */
export function coerceMeasurementCountUnit(unit: string): string {
  const t = unit.trim();
  if (t === "") return "each";
  if (isMeasurementCountUnitCode(t)) return t;
  return "each";
}

/**
 * Allowed `unit` codes per `quantity_kind` (and for volume, `unit_system`).
 * Open Recipe Standard: mass, temperature, duration are metric; volume may be
 * metric (ml, cl, L) or US customary (tsp, tbsp, cup).
 * For **count** on `Measurement`, see `MEASUREMENT_COUNT_UNIT_CODES`; yield-only count uses a free-form label.
 */
const METRIC_BY_KIND: Record<string, readonly string[]> = {
  mass: ["mg", "g", "kg"],
  volume: ["ml", "cl", "L"],
  temperature: ["C"],
  duration: ["ms", "s", "min", "h"],
};

const US_VOLUME_UNITS = ["tsp", "tbsp", "cup"] as const;

/**
 * Allowed unit codes for the given `quantity_kind`.
 * For **volume**, pass `unit_system` (`metric` or `us_customary`).
 * Returns an empty list for **count** unless `measurementCountUnits` is true (normative `Measurement` enum).
 */
export function unitsForQuantityKind(
  quantityKind: string,
  unitSystem: "metric" | "us_customary" = "metric",
  measurementCountUnits = false
): string[] {
  if (quantityKind === "count") {
    return measurementCountUnits ? [...MEASUREMENT_COUNT_UNIT_CODES] : [];
  }
  if (quantityKind === "volume") {
    if (unitSystem === "us_customary") {
      return [...US_VOLUME_UNITS];
    }
    return [...(METRIC_BY_KIND.volume ?? [])];
  }
  const list = METRIC_BY_KIND[quantityKind];
  return list ? [...list] : [];
}

/**
 * Keeps `current` if it is allowed for `quantity_kind` (and `unit_system` when volume),
 * otherwise the first allowed code.
 * For **count**, returns trimmed text, or `"each"` if empty (schema requires minLength 1 on export).
 */
export function resolveMeasurementUnit(
  quantityKind: string,
  current: string,
  unitSystem: "metric" | "us_customary" = "metric"
): string {
  const t = current.trim();
  if (quantityKind === "count") {
    return t === "" ? "each" : t;
  }
  if (quantityKind === "volume") {
    const metric = METRIC_BY_KIND.volume ?? [];
    if (t && metric.includes(t) && unitSystem === "metric") return t;
    if (t && US_VOLUME_UNITS.includes(t as (typeof US_VOLUME_UNITS)[number])) {
      if (unitSystem === "us_customary") return t;
      return metric[0] ?? "ml";
    }
    const allowed = unitsForQuantityKind("volume", unitSystem);
    if (t && allowed.includes(t)) return t;
    return allowed[0] ?? "ml";
  }
  const allowed = unitsForQuantityKind(quantityKind, "metric");
  if (t && allowed.includes(t)) return t;
  return allowed[0] ?? "each";
}

/** US customary kitchen units to millilitres (1 US cup ≈ 236.588 ml). */
export const US_VOLUME_TO_ML: Readonly<Record<string, number>> = {
  tsp: 4.92892159375,
  tbsp: 14.78676478125,
  cup: 236.5882365,
};
