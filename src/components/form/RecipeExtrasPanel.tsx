import { CollapsibleSection } from "@/components/form/CollapsibleSection";
import { MeasurementFieldset } from "@/components/form/MeasurementFieldset";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  DURATION_MEASUREMENT_KINDS,
  SKILL_LEVELS,
} from "@/components/form/constants";
import { MEAL_TYPES, normalizeMealTypeArray } from "@/lib/meal-type";
import {
  applyVendorExtensionJson,
  asStringArray,
  buildSourceBook,
  defaultDurationMeasurement,
  defaultOvenTemperatureMeasurement,
  defaultOvenTimeMeasurement,
  isJsonObject,
  linesFromMultilineInput,
  parseOvenFan,
  sourceBookFromUnknown,
  splitVendorExtensionKeys,
} from "@/lib/recipe-document";
import {
  BookOpen,
  Braces,
  Clock,
  Code,
  Fingerprint,
  Flame,
  Link as LinkIcon,
  Settings2,
  Tags,
  Users,
} from "lucide-react";
import * as React from "react";

const FAN_NONE = "__none__";
const SKILL_NONE = "__none__";

function hasNonEmptyLine(v: unknown): boolean {
  return asStringArray(v).some((s) => s.trim().length > 0);
}

type Props = {
  recipe: Record<string, unknown>;
  extras: Record<string, unknown> | null;
  onExtrasChange: (patch: Record<string, unknown>) => void;
  /** Full replacement for extras (e.g. vendor JSON merge). */
  onExtrasReplace: (next: Record<string, unknown> | null) => void;
  editorSyncKey: number;
};

function measurementOr(
  v: unknown,
  fallback: Record<string, unknown>
): Record<string, unknown> {
  return isJsonObject(v) ? v : fallback;
}

export function RecipeExtrasPanel({
  recipe,
  extras,
  onExtrasChange,
  onExtrasReplace,
  editorSyncKey,
}: Props) {
  const uuid =
    typeof recipe.recipe_uuid === "string" ? recipe.recipe_uuid : "";
  const fan = parseOvenFan(recipe.oven_fan);
  const ovenTemp = measurementOr(
    recipe.oven_temp,
    defaultOvenTemperatureMeasurement()
  );
  const ovenTime = measurementOr(
    recipe.oven_time,
    defaultOvenTimeMeasurement()
  );

  const sourceUrl = typeof recipe.source_url === "string" ? recipe.source_url : "";
  const recipeAuthors = asStringArray(recipe.recipe_authors);
  const sourceAuthors = asStringArray(recipe.source_authors);
  const sb = sourceBookFromUnknown(recipe.source_book);

  const [sbExtJson, setSbExtJson] = React.useState(sb.extensionJson);
  const [vendorText, setVendorText] = React.useState("");
  const [vendorError, setVendorError] = React.useState<string | null>(null);
  const [sbExtError, setSbExtError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const next = sourceBookFromUnknown(recipe.source_book);
    setSbExtJson(next.extensionJson);
    setSbExtError(null);
  }, [recipe.source_book, editorSyncKey]);

  React.useEffect(() => {
    const { vendor } = splitVendorExtensionKeys(extras);
    setVendorText(JSON.stringify(vendor, null, 2));
    setVendorError(null);
  }, [extras, editorSyncKey]);

  const fanSelectValue = fan || FAN_NONE;

  const skillLevel =
    typeof recipe.skill_level === "string" &&
    (SKILL_LEVELS as readonly string[]).includes(recipe.skill_level)
      ? recipe.skill_level
      : "";
  const skillSelectValue = skillLevel || SKILL_NONE;

  const vendorKeysCount = Object.keys(
    splitVendorExtensionKeys(extras).vendor
  ).length;

  const hasClassificationMetadata =
    hasNonEmptyLine(recipe.categories) ||
    hasNonEmptyLine(recipe.cor) ||
    hasNonEmptyLine(recipe.cuisine) ||
    hasNonEmptyLine(recipe.tags) ||
    hasNonEmptyLine(recipe.dietary) ||
    hasNonEmptyLine(recipe.allergens) ||
    normalizeMealTypeArray(recipe.meal_type).length > 0 ||
    hasNonEmptyLine(recipe.equipment) ||
    Boolean(skillLevel) ||
    isJsonObject(recipe.prep_time) ||
    isJsonObject(recipe.cook_time) ||
    isJsonObject(recipe.total_time);

  const outerSummary = React.useMemo(() => {
    const bits: string[] = [];
    if (uuid.trim()) bits.push("UUID");
    if (hasClassificationMetadata) bits.push("Classification");
    if (
      fan ||
      isJsonObject(recipe.oven_temp) ||
      isJsonObject(recipe.oven_time) ||
      typeof recipe.oven_required === "boolean"
    )
      bits.push("Oven");
    if (
      sourceUrl.trim() ||
      sourceAuthors.length ||
      isJsonObject(recipe.source_book)
    )
      bits.push("Source");
    if (vendorKeysCount) bits.push("Vendor");
    return bits.length ? bits.join(" · ") : "Optional metadata";
  }, [
    uuid,
    hasClassificationMetadata,
    fan,
    recipe.oven_temp,
    recipe.oven_time,
    recipe.oven_required,
    sourceUrl,
    sourceAuthors.length,
    recipe.source_book,
    vendorKeysCount,
  ]);

  const commitSourceBook = (
    title: string,
    isbn: string,
    authorsLines: string,
    notesLines: string,
    extJson: string
  ) => {
    const ext = extJson;
    if (ext.trim() && ext.trim() !== "{}") {
      try {
        const p = JSON.parse(ext) as unknown;
        if (!isJsonObject(p)) throw new Error("Must be a JSON object");
        setSbExtError(null);
      } catch (e) {
        setSbExtError(
          e instanceof Error ? e.message : "Invalid JSON in book extras"
        );
        return;
      }
    } else {
      setSbExtError(null);
    }
    const built = buildSourceBook(title, isbn, authorsLines, notesLines, ext);
    onExtrasChange({ source_book: built ?? undefined });
  };

  const mealTypeSelected = new Set(normalizeMealTypeArray(recipe.meal_type));

  return (
    <CollapsibleSection
      id="recipe-more-fields"
      title="More recipe fields"
      icon={<Settings2 />}
      defaultOpen={false}
      summary={outerSummary}
      className="w-full min-w-0 bg-stone-50/30"
    >
      <div className="space-y-3">
        <CollapsibleSection
          id="extra-identifier"
          title="Identifier"
          icon={<Fingerprint />}
          defaultOpen={false}
          summary={
            uuid.trim() ? `${uuid.slice(0, 36)}${uuid.length > 36 ? "…" : ""}` : "Not set"
          }
        >
          <div className="space-y-1.5">
            <Label htmlFor="recipe_uuid">recipe_uuid</Label>
            <Input
              id="recipe_uuid"
              value={uuid}
              onChange={(e) =>
                onExtrasChange({ recipe_uuid: e.target.value || undefined })
              }
              placeholder="Stable id (e.g. vendor:recipe:001)"
              className="font-mono text-sm"
            />
            <p className="text-xs text-[var(--color-muted)]">
              If empty, a new UUID is written when you save.
            </p>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          id="extra-classification"
          title="Classification & metadata"
          icon={<Tags />}
          defaultOpen={false}
          summary={
            hasClassificationMetadata ? "Set" : "Not set"
          }
        >
          <div className="space-y-5">
            <p className="text-xs leading-relaxed text-[var(--color-muted)]">
              Optional Open Recipe Standard metadata: tags, times as metric
              duration, and fixed meal-type values.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="meta-categories">Categories</Label>
                <p className="text-[11px] text-[var(--color-muted)]">
                  One per line
                </p>
                <Textarea
                  id="meta-categories"
                  value={asStringArray(recipe.categories).join("\n")}
                  onChange={(e) =>
                    onExtrasChange({
                      categories: linesFromMultilineInput(e.target.value),
                    })
                  }
                  placeholder="sweet"
                  rows={2}
                  className="min-h-0 resize-y font-mono text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="meta-cor">Country of recipe (cor)</Label>
                <p className="text-[11px] text-[var(--color-muted)]">
                  One per line
                </p>
                <Textarea
                  id="meta-cor"
                  value={asStringArray(recipe.cor).join("\n")}
                  onChange={(e) =>
                    onExtrasChange({
                      cor: linesFromMultilineInput(e.target.value),
                    })
                  }
                  placeholder="United States"
                  rows={2}
                  className="min-h-0 resize-y font-mono text-xs"
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="meta-cuisine">Cuisine</Label>
                <p className="text-[11px] text-[var(--color-muted)]">
                  One per line
                </p>
                <Textarea
                  id="meta-cuisine"
                  value={asStringArray(recipe.cuisine).join("\n")}
                  onChange={(e) =>
                    onExtrasChange({
                      cuisine: linesFromMultilineInput(e.target.value),
                    })
                  }
                  placeholder="American"
                  rows={2}
                  className="min-h-0 resize-y font-mono text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="meta-tags">Tags</Label>
                <p className="text-[11px] text-[var(--color-muted)]">
                  One per line
                </p>
                <Textarea
                  id="meta-tags"
                  value={asStringArray(recipe.tags).join("\n")}
                  onChange={(e) =>
                    onExtrasChange({
                      tags: linesFromMultilineInput(e.target.value),
                    })
                  }
                  placeholder="chocolate"
                  rows={2}
                  className="min-h-0 resize-y font-mono text-xs"
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="meta-dietary">Dietary</Label>
                <p className="text-[11px] text-[var(--color-muted)]">
                  One per line
                </p>
                <Textarea
                  id="meta-dietary"
                  value={asStringArray(recipe.dietary).join("\n")}
                  onChange={(e) =>
                    onExtrasChange({
                      dietary: linesFromMultilineInput(e.target.value),
                    })
                  }
                  placeholder="vegetarian"
                  rows={2}
                  className="min-h-0 resize-y font-mono text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="meta-allergens">Allergens</Label>
                <p className="text-[11px] text-[var(--color-muted)]">
                  One per line
                </p>
                <Textarea
                  id="meta-allergens"
                  value={asStringArray(recipe.allergens).join("\n")}
                  onChange={(e) =>
                    onExtrasChange({
                      allergens: linesFromMultilineInput(e.target.value),
                    })
                  }
                  placeholder="milk"
                  rows={2}
                  className="min-h-0 resize-y font-mono text-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label id="meta-meal-type-label">Meal type</Label>
              <p className="text-[11px] text-[var(--color-muted)]">
                Choose any that apply.
              </p>
              <div
                className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5 rounded-md border border-[var(--color-border)]/80 bg-stone-50/40 p-3"
                role="group"
                aria-labelledby="meta-meal-type-label"
              >
                {MEAL_TYPES.map((mt) => (
                  <label
                    key={mt}
                    className="flex cursor-pointer items-center gap-2 text-sm text-[var(--color-ink)]"
                  >
                    <input
                      type="checkbox"
                      className="size-4 shrink-0 rounded border border-[var(--color-border)] bg-[var(--color-canvas)] text-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                      checked={mealTypeSelected.has(mt)}
                      onChange={() => {
                        const next = new Set(mealTypeSelected);
                        if (next.has(mt)) next.delete(mt);
                        else next.add(mt);
                        const arr = MEAL_TYPES.filter((m) => next.has(m));
                        onExtrasChange({
                          meal_type: arr.length ? arr : undefined,
                        });
                      }}
                    />
                    <span className="capitalize">{mt}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="meta-equipment">Equipment</Label>
                <p className="text-[11px] text-[var(--color-muted)]">
                  One per line
                </p>
                <Textarea
                  id="meta-equipment"
                  value={asStringArray(recipe.equipment).join("\n")}
                  onChange={(e) =>
                    onExtrasChange({
                      equipment: linesFromMultilineInput(e.target.value),
                    })
                  }
                  placeholder="oven"
                  rows={3}
                  className="min-h-0 resize-y font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="meta-skill-level">Skill level</Label>
                <p className="text-[11px] text-[var(--color-muted)]">
                  Optional difficulty
                </p>
                <Select
                  value={skillSelectValue}
                  onValueChange={(v) => {
                    if (v === SKILL_NONE) {
                      onExtrasChange({ skill_level: undefined });
                    } else {
                      onExtrasChange({ skill_level: v });
                    }
                  }}
                >
                  <SelectTrigger id="meta-skill-level" className="w-full">
                    <SelectValue placeholder="Not set" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SKILL_NONE}>Not set</SelectItem>
                    {SKILL_LEVELS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3 border-t border-[var(--color-border)] pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <Clock className="size-4 shrink-0 text-[var(--color-muted)]" aria-hidden />
                <span className="text-sm font-medium text-[var(--color-ink)]">
                  Times
                </span>
                <span className="text-xs text-[var(--color-muted)]">
                  Prep, cook, and total — metric duration only (min, s, h).
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <div className="flex min-w-0 flex-col gap-2 rounded-lg border border-[var(--color-border)]/90 bg-stone-50/30 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-[var(--color-ink)]">
                      Prep time
                    </span>
                    {isJsonObject(recipe.prep_time) ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 shrink-0 px-2 text-xs text-[var(--color-muted)]"
                        onClick={() => onExtrasChange({ prep_time: undefined })}
                      >
                        Clear
                      </Button>
                    ) : null}
                  </div>
                  {isJsonObject(recipe.prep_time) ? (
                    <MeasurementFieldset
                      value={recipe.prep_time}
                      onChange={(m) => onExtrasChange({ prep_time: m })}
                      quantityKindOptions={DURATION_MEASUREMENT_KINDS}
                    />
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={() =>
                        onExtrasChange({
                          prep_time: defaultDurationMeasurement(),
                        })
                      }
                    >
                      Add prep time
                    </Button>
                  )}
                </div>
                <div className="flex min-w-0 flex-col gap-2 rounded-lg border border-[var(--color-border)]/90 bg-stone-50/30 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-[var(--color-ink)]">
                      Cook time
                    </span>
                    {isJsonObject(recipe.cook_time) ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 shrink-0 px-2 text-xs text-[var(--color-muted)]"
                        onClick={() => onExtrasChange({ cook_time: undefined })}
                      >
                        Clear
                      </Button>
                    ) : null}
                  </div>
                  {isJsonObject(recipe.cook_time) ? (
                    <MeasurementFieldset
                      value={recipe.cook_time}
                      onChange={(m) => onExtrasChange({ cook_time: m })}
                      quantityKindOptions={DURATION_MEASUREMENT_KINDS}
                    />
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={() =>
                        onExtrasChange({
                          cook_time: defaultDurationMeasurement(),
                        })
                      }
                    >
                      Add cook time
                    </Button>
                  )}
                </div>
                <div className="flex min-w-0 flex-col gap-2 rounded-lg border border-[var(--color-border)]/90 bg-stone-50/30 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-[var(--color-ink)]">
                      Total time
                    </span>
                    {isJsonObject(recipe.total_time) ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 shrink-0 px-2 text-xs text-[var(--color-muted)]"
                        onClick={() => onExtrasChange({ total_time: undefined })}
                      >
                        Clear
                      </Button>
                    ) : null}
                  </div>
                  {isJsonObject(recipe.total_time) ? (
                    <MeasurementFieldset
                      value={recipe.total_time}
                      onChange={(m) => onExtrasChange({ total_time: m })}
                      quantityKindOptions={DURATION_MEASUREMENT_KINDS}
                    />
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={() =>
                        onExtrasChange({
                          total_time: defaultDurationMeasurement(),
                        })
                      }
                    >
                      Add total time
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          id="extra-oven"
          title="Oven"
          icon={<Flame />}
          defaultOpen={false}
          summary={
            [
              typeof recipe.oven_required === "boolean"
                ? recipe.oven_required
                  ? "Oven required"
                  : "Oven not required"
                : null,
              fan ? `Fan ${fan}` : null,
            ]
              .filter(Boolean)
              .join(" · ") || "Not set"
          }
        >
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="oven_required"
                className="flex cursor-pointer items-start gap-2.5 rounded-md border border-[var(--color-border)]/80 bg-stone-50/40 p-3 text-sm text-[var(--color-ink)]"
              >
                <input
                  id="oven_required"
                  type="checkbox"
                  className="mt-0.5 size-4 shrink-0 rounded border border-[var(--color-border)] bg-[var(--color-canvas)] text-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                  checked={recipe.oven_required === true}
                  onChange={(e) =>
                    onExtrasChange({
                      oven_required: e.target.checked,
                    })
                  }
                />
                <span>
                  <span className="font-medium">Oven required</span>
                  <span className="mt-0.5 block text-xs font-normal text-[var(--color-muted)]">
                    Off means oven not required (false). On means an oven is required.
                  </span>
                </span>
              </label>
            </div>
            <div className="space-y-1.5">
              <Label>Convection (oven_fan)</Label>
              <Select
                value={fanSelectValue}
                onValueChange={(v) => {
                  if (v === FAN_NONE) {
                    onExtrasChange({ oven_fan: undefined });
                  } else {
                    onExtrasChange({ oven_fan: v });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Not set" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={FAN_NONE}>Not set</SelectItem>
                  <SelectItem value="Off">Off</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-[var(--color-muted)]">
                Starting temperature (oven_temp)
              </div>
              <MeasurementFieldset
                value={ovenTemp}
                onChange={(m) => onExtrasChange({ oven_temp: m })}
                label="Temperature"
              />
            </div>
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-[var(--color-muted)]">
                Duration (oven_time)
              </div>
              <MeasurementFieldset
                value={ovenTime}
                onChange={(m) => onExtrasChange({ oven_time: m })}
                label="Time"
              />
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          id="extra-source"
          title="Source & attribution"
          icon={<LinkIcon />}
          defaultOpen={false}
          summary={
            sourceUrl.trim()
              ? sourceUrl.replace(/^https?:\/\//, "").slice(0, 48)
              : recipeAuthors.length
                ? `Recipe: ${recipeAuthors.length} author(s)`
                : sourceAuthors.length
                  ? `Source authors: ${sourceAuthors.length}`
                  : sb.title
                    ? sb.title
                    : "Not set"
          }
        >
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="recipe_authors" className="flex items-center gap-1.5">
                <Users className="size-3.5" />
                recipe_authors (one per line)
              </Label>
              <p className="text-xs text-[var(--color-muted)]">
                Who wrote or created this recipe (including yourself). Separate from
                source authors below, which cite an external publication.
              </p>
              <Textarea
                id="recipe_authors"
                value={recipeAuthors.join("\n")}
                onChange={(e) =>
                  onExtrasChange({
                    recipe_authors: linesFromMultilineInput(e.target.value),
                  })
                }
                placeholder="One name per line"
                className="min-h-[72px] font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="source_url" className="flex items-center gap-1.5">
                <LinkIcon className="size-3.5" />
                source_url
              </Label>
              <Input
                id="source_url"
                value={sourceUrl}
                onChange={(e) =>
                  onExtrasChange({ source_url: e.target.value || undefined })
                }
                placeholder="https://…"
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="source_authors" className="flex items-center gap-1.5">
                <Users className="size-3.5" />
                source_authors (one per line)
              </Label>
              <p className="text-xs text-[var(--color-muted)]">
                Authors credited on the site, book, or other external source (not
                necessarily who entered the recipe here).
              </p>
              <Textarea
                id="source_authors"
                value={sourceAuthors.join("\n")}
                onChange={(e) =>
                  onExtrasChange({
                    source_authors: linesFromMultilineInput(e.target.value),
                  })
                }
                placeholder="One author per line"
                className="min-h-[72px] font-mono text-xs"
              />
            </div>

            <div className="space-y-2 border-t border-[var(--color-border)] pt-3">
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <BookOpen className="size-4 text-[var(--color-muted)]" />
                source_book
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sb-title">Title</Label>
                <Input
                  id="sb-title"
                  value={sb.title}
                  onChange={(e) =>
                    commitSourceBook(
                      e.target.value,
                      sb.isbn,
                      sb.authors.join("\n"),
                      sb.notes.join("\n"),
                      sbExtJson
                    )
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sb-isbn">ISBN</Label>
                <Input
                  id="sb-isbn"
                  value={sb.isbn}
                  onChange={(e) =>
                    commitSourceBook(
                      sb.title,
                      e.target.value,
                      sb.authors.join("\n"),
                      sb.notes.join("\n"),
                      sbExtJson
                    )
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sb-authors">Book authors (one per line)</Label>
                <Textarea
                  id="sb-authors"
                  value={sb.authors.join("\n")}
                  onChange={(e) =>
                    commitSourceBook(
                      sb.title,
                      sb.isbn,
                      e.target.value,
                      sb.notes.join("\n"),
                      sbExtJson
                    )
                  }
                  className="min-h-[72px] font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sb-notes">Book notes (one per line)</Label>
                <Textarea
                  id="sb-notes"
                  value={sb.notes.join("\n")}
                  onChange={(e) =>
                    commitSourceBook(
                      sb.title,
                      sb.isbn,
                      sb.authors.join("\n"),
                      e.target.value,
                      sbExtJson
                    )
                  }
                  className="min-h-[72px] font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sb-ext" className="flex items-center gap-1.5">
                  <Braces className="size-3.5" />
                  Extra keys on book (JSON, e.g. X-…)
                </Label>
                <Textarea
                  id="sb-ext"
                  value={sbExtJson}
                  onChange={(e) => setSbExtJson(e.target.value)}
                  onBlur={() =>
                    commitSourceBook(
                      sb.title,
                      sb.isbn,
                      sb.authors.join("\n"),
                      sb.notes.join("\n"),
                      sbExtJson
                    )
                  }
                  className="min-h-[72px] font-mono text-xs"
                />
                {sbExtError ? (
                  <p className="text-xs text-red-700">{sbExtError}</p>
                ) : null}
              </div>
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          id="extra-vendor"
          title="Vendor extensions"
          icon={<Code />}
          defaultOpen={false}
          summary={
            vendorKeysCount
              ? `${vendorKeysCount} key(s)`
              : "JSON object for ^X- keys"
          }
        >
          <div className="space-y-1.5">
            <Label htmlFor="vendor-json" className="flex items-center gap-1.5">
              <Braces className="size-3.5" />
              Top-level keys matching ^X-
            </Label>
            <Textarea
              id="vendor-json"
              value={vendorText}
              onChange={(e) => {
                setVendorText(e.target.value);
                setVendorError(null);
              }}
              onBlur={() => {
                const r = applyVendorExtensionJson(extras, vendorText);
                if (r.ok) {
                  onExtrasReplace(r.next);
                } else {
                  setVendorError(r.error);
                }
              }}
              className="min-h-[120px] font-mono text-xs"
              spellCheck={false}
            />
            {vendorError ? (
              <p className="text-xs text-red-700">{vendorError}</p>
            ) : null}
            <p className="text-xs text-[var(--color-muted)]">
              Valid JSON object. Only keys starting with <code className="rounded bg-stone-100 px-0.5">X-</code>{" "}
              are kept. On blur, values merge into the recipe.
            </p>
          </div>
        </CollapsibleSection>
      </div>
    </CollapsibleSection>
  );
}
