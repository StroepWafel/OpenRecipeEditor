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

/** Default output for an empty recipe; matches typical minimal examples. */
export function defaultBaseYield(): Record<string, unknown> {
  return {
    amount: 1,
    unit: "portion",
    quantity_kind: "count",
    unit_system: "unspecified",
  };
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

export function defaultMeasurement(): Record<string, unknown> {
  return {
    amount: 0,
    unit: "",
    quantity_kind: "count",
    unit_system: "unspecified",
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
