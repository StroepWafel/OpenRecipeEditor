/**
 * Allowed `unit` codes per `quantity_kind` for metric-only measurements
 * (Open Recipe Standard: `unit_system` is always `"metric"`).
 * `quantity_kind` **count** is not restricted here: `unit` is any non-empty string in the schema.
 */
const BY_KIND: Record<string, readonly string[]> = {
  mass: ["mg", "g", "kg"],
  volume: ["ml", "cl", "L"],
  temperature: ["C"],
  duration: ["ms", "s", "min", "h"],
};

/**
 * Allowed unit codes for the given `quantity_kind` (metric / SI only).
 * Returns an empty list for **count** (free-form unit label).
 */
export function unitsForQuantityKind(quantityKind: string): string[] {
  if (quantityKind === "count") return [];
  const list = BY_KIND[quantityKind];
  return list ? [...list] : [];
}

/**
 * Keeps `current` if it is allowed for `quantity_kind`, otherwise the first allowed code.
 * For **count**, returns trimmed text, or `"each"` if empty (schema requires minLength 1 on export).
 */
export function resolveMeasurementUnit(
  quantityKind: string,
  current: string
): string {
  const t = current.trim();
  if (quantityKind === "count") {
    return t === "" ? "each" : t;
  }
  const allowed = unitsForQuantityKind(quantityKind);
  if (t && allowed.includes(t)) return t;
  return allowed[0] ?? "each";
}
