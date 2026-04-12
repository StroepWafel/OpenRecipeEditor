import {
  resolveMeasurementUnit,
  US_VOLUME_TO_ML,
} from "@/lib/measurement-units";

export function isJsonObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function asObject(v: unknown): Record<string, unknown> {
  if (!isJsonObject(v)) throw new Error("Expected a JSON object");
  return v;
}

export function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => (typeof x === "string" ? x : String(x)));
}

/**
 * Multiline textarea ↔ string[] round-trip: preserves internal spaces and blank lines.
 */
export function linesFromMultilineInput(text: string): string[] {
  return text.split("\n");
}

export function asMeasurementArray(v: unknown): Record<string, unknown>[] {
  if (!Array.isArray(v)) return [];
  return v.filter(isJsonObject);
}

export function asIngredientArray(v: unknown): Record<string, unknown>[] {
  if (!Array.isArray(v)) return [];
  return v.filter(isJsonObject);
}

export function asStepArray(v: unknown): Record<string, unknown>[] {
  if (!Array.isArray(v)) return [];
  return v.filter(isJsonObject);
}

/** Allowed `quantity_kind` values for `base_yield` (`YieldMeasurement` in the normative schema). */
export const YIELD_QUANTITY_KINDS = ["count", "mass", "volume"] as const;

export function isYieldQuantityKind(
  v: unknown
): v is (typeof YIELD_QUANTITY_KINDS)[number] {
  return v === "count" || v === "mass" || v === "volume";
}

/** Default output for an empty recipe; matches typical minimal examples. */
export function defaultBaseYield(): Record<string, unknown> {
  return {
    amount: 1,
    unit: "portion",
    quantity_kind: "count",
    unit_system: "metric",
  };
}

export function defaultMeasurement(): Record<string, unknown> {
  return {
    amount: 0,
    unit: "each",
    quantity_kind: "count",
    unit_system: "metric",
  };
}

/**
 * Coerces any measurement to metric (`unit_system: "metric"`) and a schema-allowed `unit`.
 * Converts US customary volume (tsp, tbsp, cup) to ml using standard US kitchen definitions.
 * Converts °F → °C and K → °C for temperature when migrating legacy data.
 */
export function normalizeMeasurementMetric(
  m: Record<string, unknown>
): Record<string, unknown> {
  const qk = typeof m.quantity_kind === "string" ? m.quantity_kind : "count";
  let amount =
    typeof m.amount === "number" && Number.isFinite(m.amount)
      ? m.amount
      : typeof m.amount === "string"
        ? parseFloat(m.amount)
        : 0;
  let unit = typeof m.unit === "string" ? m.unit : "";
  const unitSystem =
    typeof m.unit_system === "string" ? m.unit_system : "metric";

  if (qk === "volume" && unitSystem === "us_customary") {
    const t = unit.trim();
    const factor = US_VOLUME_TO_ML[t];
    if (factor !== undefined) {
      amount = amount * factor;
      unit = "ml";
    }
  }

  if (qk === "temperature") {
    if (unit === "F") {
      amount = ((amount - 32) * 5) / 9;
      unit = "C";
    } else if (unit === "K") {
      amount = amount - 273.15;
      unit = "C";
    }
  }

  if (qk === "duration") {
    const syn: Record<string, string> = {
      seconds: "s",
      minutes: "min",
      hours: "h",
    };
    if (unit in syn) unit = syn[unit];
  }

  const unitOut =
    qk === "count"
      ? unit.trim() === ""
        ? "each"
        : unit.trim()
      : resolveMeasurementUnit(qk, unit, "metric");

  return {
    ...m,
    amount,
    quantity_kind: qk,
    unit_system: "metric",
    unit: unitOut,
  };
}

/**
 * Coerces a measurement to valid yield semantics: count, mass, or volume only.
 * Normalizes to metric units for the in-app model (US volume → ml).
 * Used when loading legacy data or migrating `yields[0]` that used a full Measurement kind set.
 */
export function normalizeYieldMeasurement(
  m: Record<string, unknown>
): Record<string, unknown> {
  if (isYieldQuantityKind(m.quantity_kind)) {
    return normalizeMeasurementMetric({ ...m });
  }
  const d = defaultBaseYield();
  const rawAmount = m.amount;
  const amount =
    typeof rawAmount === "number" && Number.isFinite(rawAmount)
      ? rawAmount
      : typeof rawAmount === "string"
        ? parseFloat(rawAmount)
        : NaN;
  return normalizeMeasurementMetric({
    ...d,
    amount: Number.isFinite(amount) ? amount : d.amount,
    unit:
      typeof m.unit === "string" && m.unit.trim() !== ""
        ? m.unit
        : d.unit,
    quantity_kind: "count",
  });
}

export function emptyRecipe(): Record<string, unknown> {
  return {
    recipe_name: "",
    notes: [],
    base_yield: defaultBaseYield(),
    ingredients: [],
    steps: [],
  };
}

export function defaultIngredient(): Record<string, unknown> {
  return {
    name: "",
    amount: defaultMeasurement(),
  };
}

export function defaultStep(): Record<string, unknown> {
  return {
    step: "",
  };
}

export function splitExtensionKeys(
  doc: Record<string, unknown>
): { core: Record<string, unknown>; extensions: [string, unknown][] } {
  const core: Record<string, unknown> = {};
  const extensions: [string, unknown][] = [];
  for (const [k, val] of Object.entries(doc)) {
    if (/^X-/.test(k)) extensions.push([k, val]);
    else core[k] = val;
  }
  return { core, extensions };
}

export function mergeExtensionKeys(
  core: Record<string, unknown>,
  extensions: [string, unknown][]
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...core };
  for (const [k, v] of extensions) {
    if (k) out[k] = v;
  }
  return out;
}

/**
 * Merges a patch into extras. Values that are empty (null, undefined, "", empty array,
 * empty plain object) remove the key so the merged recipe omits optional fields.
 */
export function mergeExtrasPatch(
  prev: Record<string, unknown> | null,
  patch: Record<string, unknown>
): Record<string, unknown> | null {
  const base: Record<string, unknown> = { ...(prev ?? {}) };
  for (const [k, v] of Object.entries(patch)) {
    if (shouldOmitExtrasValue(v)) {
      delete base[k];
    } else {
      base[k] = v;
    }
  }
  return Object.keys(base).length > 0 ? base : null;
}

function shouldOmitExtrasValue(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === "string" && v.trim() === "") return true;
  if (Array.isArray(v) && v.length === 0) return true;
  if (isJsonObject(v) && Object.keys(v).length === 0) return true;
  return false;
}

export function defaultOvenTemperatureMeasurement(): Record<string, unknown> {
  return {
    amount: 180,
    unit: "C",
    quantity_kind: "temperature",
    unit_system: "metric",
  };
}

export function defaultOvenTimeMeasurement(): Record<string, unknown> {
  return {
    amount: 0,
    unit: "min",
    quantity_kind: "duration",
    unit_system: "metric",
  };
}

/** `DurationMeasurement` in the schema: `quantity_kind` is always `duration`. */
export function defaultDurationMeasurement(): Record<string, unknown> {
  return {
    amount: 0,
    unit: "min",
    quantity_kind: "duration",
    unit_system: "metric",
  };
}

const OVEN_FAN_VALUES = ["Off", "Low", "High"] as const;

export function parseOvenFan(v: unknown): (typeof OVEN_FAN_VALUES)[number] | "" {
  if (typeof v !== "string") return "";
  return (OVEN_FAN_VALUES as readonly string[]).includes(v)
    ? (v as (typeof OVEN_FAN_VALUES)[number])
    : "";
}

export function sourceBookFromUnknown(v: unknown): {
  title: string;
  isbn: string;
  authors: string[];
  notes: string[];
  extensionJson: string;
} {
  if (!isJsonObject(v)) {
    return { title: "", isbn: "", authors: [], notes: [], extensionJson: "{}" };
  }
  const title = typeof v.title === "string" ? v.title : "";
  const isbn = typeof v.isbn === "string" ? v.isbn : "";
  const authors = asStringArray(v.authors);
  const notes = asStringArray(v.notes);
  const ext: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(v)) {
    if (key === "title" || key === "isbn" || key === "authors" || key === "notes")
      continue;
    ext[key] = val;
  }
  const extensionJson =
    Object.keys(ext).length > 0 ? JSON.stringify(ext, null, 2) : "{}";
  return { title, isbn, authors, notes, extensionJson };
}

export function buildSourceBook(
  title: string,
  isbn: string,
  authorsLines: string,
  notesLines: string,
  extensionJson: string
): Record<string, unknown> | null {
  const authors = authorsLines.split("\n");
  const notes = notesLines.split("\n");
  const out: Record<string, unknown> = {};
  if (title.trim()) out.title = title.trim();
  if (isbn.trim()) out.isbn = isbn.trim();
  if (authors.length) out.authors = authors;
  if (notes.length) out.notes = notes;
  let ext: Record<string, unknown> = {};
  const t = extensionJson.trim();
  if (t && t !== "{}") {
    try {
      const parsed = JSON.parse(t) as unknown;
      ext = isJsonObject(parsed) ? parsed : {};
    } catch {
      ext = {};
    }
  }
  for (const [k, val] of Object.entries(ext)) {
    out[k] = val;
  }
  return Object.keys(out).length > 0 ? out : null;
}

/** Keys matching ^X- at the top level of extras (vendor extensions). */
export function splitVendorExtensionKeys(
  extras: Record<string, unknown> | null
): { known: Record<string, unknown>; vendor: Record<string, unknown> } {
  if (!extras) return { known: {}, vendor: {} };
  const known: Record<string, unknown> = {};
  const vendor: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(extras)) {
    if (/^X-/.test(k)) vendor[k] = v;
    else known[k] = v;
  }
  return { known, vendor };
}

export function mergeVendorIntoExtras(
  known: Record<string, unknown>,
  vendor: Record<string, unknown>
): Record<string, unknown> | null {
  const out = { ...known, ...vendor };
  return Object.keys(out).length > 0 ? out : null;
}

export function applyVendorExtensionJson(
  extras: Record<string, unknown> | null,
  text: string
):
  | { ok: true; next: Record<string, unknown> | null }
  | { ok: false; error: string } {
  const trimmed = text.trim();
  if (trimmed === "" || trimmed === "{}") {
    const { known } = splitVendorExtensionKeys(extras);
    return { ok: true, next: Object.keys(known).length > 0 ? known : null };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Invalid JSON",
    };
  }
  if (!isJsonObject(parsed)) {
    return { ok: false, error: "JSON must be an object" };
  }
  const vendor: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed)) {
    if (/^X-/.test(k)) vendor[k] = v;
  }
  const { known } = splitVendorExtensionKeys(extras);
  return { ok: true, next: mergeVendorIntoExtras(known, vendor) };
}

/** UX hint when ingredients exist but base_yield is missing (Ajv also errors). */
export function missingBaseYieldWarnings(doc: Record<string, unknown>): string[] {
  const ingredients = doc.ingredients;
  if (!Array.isArray(ingredients) || ingredients.length === 0) return [];
  const by = doc.base_yield;
  if (by !== undefined && isJsonObject(by)) return [];
  return [
    "With one or more ingredients, base_yield is required: set what batch size the written amounts produce.",
  ];
}
