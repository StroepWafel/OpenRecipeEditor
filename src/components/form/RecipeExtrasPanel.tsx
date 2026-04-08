import { CollapsibleSection } from "@/components/form/CollapsibleSection";
import { MeasurementFieldset } from "@/components/form/MeasurementFieldset";
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
  applyVendorExtensionJson,
  asStringArray,
  buildSourceBook,
  defaultOvenTemperatureMeasurement,
  defaultOvenTimeMeasurement,
  isJsonObject,
  parseOvenFan,
  sourceBookFromUnknown,
  splitVendorExtensionKeys,
} from "@/lib/recipe-document";
import {
  BookOpen,
  Braces,
  Code,
  Fingerprint,
  Flame,
  Link as LinkIcon,
  Settings2,
  Users,
} from "lucide-react";
import * as React from "react";

const FAN_NONE = "__none__";

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

  const vendorKeysCount = Object.keys(
    splitVendorExtensionKeys(extras).vendor
  ).length;

  const outerSummary = React.useMemo(() => {
    const bits: string[] = [];
    if (uuid.trim()) bits.push("UUID");
    if (fan || isJsonObject(recipe.oven_temp) || isJsonObject(recipe.oven_time))
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
    fan,
    recipe.oven_temp,
    recipe.oven_time,
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
          id="extra-oven"
          title="Oven"
          icon={<Flame />}
          defaultOpen={false}
          summary={fan ? fan : "Not set"}
        >
          <div className="space-y-4">
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
              : sourceAuthors.length
                ? `Authors: ${sourceAuthors.length}`
                : sb.title
                  ? sb.title
                  : "Not set"
          }
        >
          <div className="space-y-4">
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
              <Textarea
                id="source_authors"
                value={sourceAuthors.join("\n")}
                onChange={(e) =>
                  onExtrasChange({
                    source_authors: e.target.value
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean),
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
