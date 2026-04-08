import {
  asIngredientArray,
  asStepArray,
  asStringArray,
  defaultBaseYield,
  defaultMeasurement,
  isJsonObject,
} from "@/lib/recipe-document";

/** Keys the simplified editor owns; all other keys are preserved from loaded files only. */
export const ESSENTIAL_KEYS = [
  "recipe_name",
  "notes",
  "base_yield",
  "ingredients",
  "steps",
] as const;

export type EssentialKey = (typeof ESSENTIAL_KEYS)[number];

function migrateIngredientLine(line: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...line };
  if ("amounts" in out && !("amount" in out)) {
    const amounts = out.amounts;
    if (Array.isArray(amounts) && amounts.length > 0 && isJsonObject(amounts[0])) {
      out.amount = amounts[0];
    } else {
      out.amount = defaultMeasurement();
    }
  }
  delete out.amounts;

  const subs = out.substitutions;
  if (Array.isArray(subs)) {
    out.substitutions = subs.map((s) =>
      isJsonObject(s) ? migrateIngredientLine(s) : s
    );
  }
  return out;
}

/**
 * Maps pre–base_yield recipes (`yields` + `amounts` arrays) to `base_yield` + `amount`.
 */
export function migrateLegacyRecipeShape(
  data: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...data };
  if (!("base_yield" in out) && "yields" in out) {
    const y = out.yields;
    if (Array.isArray(y) && y.length > 0 && isJsonObject(y[0])) {
      out.base_yield = y[0];
    }
  }
  delete out.yields;

  const ingredients = out.ingredients;
  if (Array.isArray(ingredients)) {
    out.ingredients = ingredients.map((ing) =>
      isJsonObject(ing) ? migrateIngredientLine(ing) : ing
    );
  }
  return out;
}

export function ensureEssentials(
  partial: Record<string, unknown>
): Record<string, unknown> {
  return {
    recipe_name:
      typeof partial.recipe_name === "string" ? partial.recipe_name : "",
    notes: asStringArray(partial.notes),
    base_yield: isJsonObject(partial.base_yield)
      ? partial.base_yield
      : defaultBaseYield(),
    ingredients: asIngredientArray(partial.ingredients),
    steps: asStepArray(partial.steps),
  };
}

export function splitRecipeForEditor(data: Record<string, unknown>): {
  essentials: Record<string, unknown>;
  extras: Record<string, unknown>;
} {
  const migrated = migrateLegacyRecipeShape(data);
  const essentials: Record<string, unknown> = {};
  const extras: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(migrated)) {
    if ((ESSENTIAL_KEYS as readonly string[]).includes(k)) {
      essentials[k] = v;
    } else {
      extras[k] = v;
    }
  }
  return { essentials: ensureEssentials(essentials), extras };
}

/** Model object for validation: extras first, essentials override. */
export function mergeRecipeForModel(
  extras: Record<string, unknown> | null,
  essentials: Record<string, unknown>
): Record<string, unknown> {
  return { ...(extras ?? {}), ...essentials };
}

/**
 * Values saved to disk: stable id, optional $schema, trim empty notes.
 * Does not remove optional metadata loaded from elsewhere (oven, source, …).
 */
export function finalizeRecipeForExport(
  recipe: Record<string, unknown>,
  options?: { schemaId?: string | null }
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...recipe };
  const existing =
    typeof out.recipe_uuid === "string" ? out.recipe_uuid.trim() : "";
  out.recipe_uuid = existing || crypto.randomUUID();
  if (options?.schemaId) {
    out.$schema = options.schemaId;
  }
  if (Array.isArray(out.notes) && out.notes.length === 0) {
    delete out.notes;
  }
  return out;
}
