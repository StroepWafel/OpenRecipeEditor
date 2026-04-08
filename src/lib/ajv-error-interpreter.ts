import type { ErrorObject } from "ajv";

/** Single human-readable validation line for the UI. */
export type InterpretedValidationError = {
  /** Where in the recipe (plain language). */
  where: string;
  /** What went wrong and how to fix it. */
  message: string;
};

const KEY_LABELS: Record<string, string> = {
  recipe_name: "Recipe name",
  recipe_uuid: "Recipe ID",
  notes: "Notes",
  categories: "Categories",
  cor: "Country / region",
  cuisine: "Cuisine",
  tags: "Tags",
  dietary: "Dietary",
  allergens: "Allergens",
  skill_level: "Skill level",
  meal_type: "Meal type",
  prep_time: "Prep time",
  cook_time: "Cook time",
  total_time: "Total time",
  equipment: "Equipment",
  base_yield: "Base yield",
  ingredients: "Ingredients",
  steps: "Steps",
  oven_fan: "Oven fan",
  oven_temp: "Oven temperature",
  oven_time: "Oven time",
  source_url: "Source URL",
  source_authors: "Source authors",
  source_book: "Source book",
  name: "Name",
  amount: "Amount",
  unit: "Unit",
  quantity_kind: "Quantity kind",
  unit_system: "Unit system",
  processing: "Processing tags",
  substitutions: "Substitutions",
  step: "Instruction",
  haccp: "HACCP",
  usda_num: "USDA number",
};

function labelSegment(seg: string): string {
  return KEY_LABELS[seg] ?? seg.replace(/_/g, " ");
}

/**
 * Turns JSON Pointer paths into short, readable locations (1-based indices for lists).
 */
export function humanizeInstancePath(instancePath: string | undefined): string {
  const raw = instancePath?.trim() ?? "";
  if (!raw || raw === "/") {
    return "Recipe";
  }
  const parts = raw.split("/").filter(Boolean);
  const out: string[] = [];
  let i = 0;
  while (i < parts.length) {
    const seg = parts[i];
    const next = parts[i + 1];
    if (
      (seg === "ingredients" || seg === "steps" || seg === "substitutions") &&
      next !== undefined &&
      /^\d+$/.test(next)
    ) {
      const n = Number(next);
      const label =
        seg === "ingredients"
          ? `Ingredient ${n + 1}`
          : seg === "steps"
            ? `Step ${n + 1}`
            : `Substitution ${n + 1}`;
      out.push(label);
      i += 2;
      continue;
    }
    const listPrefix: Record<string, string> = {
      notes: "Note",
      categories: "Category",
      tags: "Tag",
      cor: "Region",
      cuisine: "Cuisine entry",
      dietary: "Dietary label",
      allergens: "Allergen",
      meal_type: "Meal type",
      equipment: "Equipment item",
    };
    const listLabel = listPrefix[seg];
    if (listLabel && next !== undefined && /^\d+$/.test(next)) {
      out.push(`${listLabel} ${Number(next) + 1}`);
      i += 2;
      continue;
    }
    if (/^\d+$/.test(seg)) {
      out.push(`#${Number(seg) + 1}`);
      i += 1;
      continue;
    }
    out.push(labelSegment(seg));
    i += 1;
  }
  return out.join(" → ");
}

function allowedList(params: Record<string, unknown>): string | null {
  const v = params.allowedValues;
  if (Array.isArray(v) && v.length > 0) {
    return v.map(String).join(", ");
  }
  return null;
}

function interpretParams(e: ErrorObject): string {
  const kw = e.keyword;
  const p = (e.params ?? {}) as Record<string, unknown>;

  switch (kw) {
    case "enum": {
      const list = allowedList(p);
      return list
        ? `Use one of: ${list}.`
        : "The value is not an allowed option.";
    }
    case "const": {
      const v = p.allowedValue;
      return `Must be exactly ${JSON.stringify(v)}.`;
    }
    case "required": {
      const missing = p.missingProperty;
      return typeof missing === "string"
        ? `Add the required field “${labelSegment(missing)}”.`
        : "A required field is missing.";
    }
    case "type": {
      const t = p.type;
      return typeof t === "string"
        ? `This must be ${t === "object" ? "an object" : t === "array" ? "a list" : `a ${t}`}.`
        : "The type of this value is wrong.";
    }
    case "additionalProperties": {
      const extra = p.additionalProperty;
      return typeof extra === "string"
        ? `Remove or rename the unknown field “${extra}”.`
        : "This object has a field that is not allowed here.";
    }
    case "minLength": {
      const lim = p.limit;
      return typeof lim === "number"
        ? `Enter at least ${lim} character${lim === 1 ? "" : "s"}.`
        : "This text is too short.";
    }
    case "maxLength": {
      const lim = p.limit;
      return typeof lim === "number"
        ? `Use at most ${lim} character${lim === 1 ? "" : "s"}.`
        : "This text is too long.";
    }
    case "minimum": {
      const lim = p.limit;
      return typeof lim === "number"
        ? `Must be at least ${lim}.`
        : "This number is too small.";
    }
    case "exclusiveMinimum": {
      const lim = p.limit;
      return typeof lim === "number"
        ? `Must be greater than ${lim}.`
        : "This number is too small.";
    }
    case "maximum": {
      const lim = p.limit;
      return typeof lim === "number"
        ? `Must be at most ${lim}.`
        : "This number is too large.";
    }
    case "exclusiveMaximum": {
      const lim = p.limit;
      return typeof lim === "number"
        ? `Must be less than ${lim}.`
        : "This number is too large.";
    }
    case "oneOf":
      return "This block does not match any allowed shape. Fix the fields below it (often amount, unit, quantity kind, or unit system).";
    case "anyOf":
      return "This value does not match any allowed option.";
    case "allOf":
      return "Multiple rules failed for this value.";
    case "format": {
      const fmt = p.format;
      return typeof fmt === "string"
        ? `Must be valid ${fmt} (e.g. a proper URL or email).`
        : "The format is invalid.";
    }
    case "if": {
      const fk = p.failingKeyword;
      if (fk === "then") {
        return "This part of the recipe does not match the rules for its fields (see other messages for details).";
      }
      return e.message ?? "A conditional rule failed.";
    }
    default:
      break;
  }

  return e.message ?? "Invalid value.";
}

/** Drops noisy parent errors when more specific errors exist on nested paths. */
function filterRedundantErrors(errors: ErrorObject[]): ErrorObject[] {
  const paths = new Set(
    errors.map((e) => e.instancePath ?? "").filter((p) => p.length > 0)
  );
  return errors.filter((e) => {
    if (e.keyword === "if" && (!e.instancePath || e.instancePath === "")) {
      const hasNested = [...paths].some(
        (p) => p.length > 0 && p !== e.instancePath
      );
      if (hasNested) return false;
    }
    return true;
  });
}

function dedupeErrors(errors: ErrorObject[]): ErrorObject[] {
  const seen = new Set<string>();
  const out: ErrorObject[] = [];
  for (const e of errors) {
    const key = `${e.instancePath ?? ""}|${e.keyword}|${e.message ?? ""}|${JSON.stringify(e.params)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}

/**
 * Converts Ajv error objects into plain-language { where, message } entries.
 */
export function interpretAjvErrors(
  errors: ErrorObject[] | null | undefined
): InterpretedValidationError[] {
  if (!errors?.length) return [];
  const cleaned = dedupeErrors(filterRedundantErrors(errors));
  return cleaned.map((e) => {
    const where = humanizeInstancePath(e.instancePath);
    const message = interpretParams(e);
    return { where, message };
  });
}

/**
 * Flat strings for simple lists (backwards compatible with older callers).
 */
export function formatInterpretedAjvErrors(
  errors: ErrorObject[] | null | undefined
): string[] {
  return interpretAjvErrors(errors).map(
    (x) => `${x.where}: ${x.message}`
  );
}
