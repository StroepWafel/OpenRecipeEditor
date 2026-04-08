import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  asStringArray,
  defaultIngredient,
  defaultMeasurement,
  isJsonObject,
} from "@/lib/recipe-document";
import { cn } from "@/lib/utils";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import * as React from "react";
import { MeasurementFieldset } from "./MeasurementFieldset";
import { useCollapsibleListRow } from "./useCollapsibleListRow";

type Props = {
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  onRemove?: () => void;
  title: string;
  allowSubstitutions: boolean;
  /** 0-based index among siblings (ingredients or substitutions). */
  rowIndex: number;
  /** Total rows at this list level (ingredients.length or subs.length). */
  siblingCount: number;
  /** Increment from parent to collapse this row (and pass through to nested lines). */
  collapseAllSignal?: number;
  /** Increment from parent to expand this row (and pass through to nested lines). */
  expandAllSignal?: number;
};

/** Normalize legacy `amounts` arrays to singular `amount`. */
function lineOrDefault(v: unknown): Record<string, unknown> {
  const base = isJsonObject(v) ? { ...v } : defaultIngredient();
  if (!("amount" in base) && "amounts" in base) {
    const raw = base.amounts;
    if (Array.isArray(raw) && raw.length > 0 && isJsonObject(raw[0])) {
      base.amount = raw[0];
    } else {
      base.amount = defaultMeasurement();
    }
    delete base.amounts;
  }
  if (!isJsonObject(base.amount)) {
    base.amount = defaultMeasurement();
  }
  return base;
}

export function IngredientLineEditor({
  value,
  onChange,
  onRemove,
  title,
  allowSubstitutions,
  rowIndex,
  siblingCount,
  collapseAllSignal = 0,
  expandAllSignal = 0,
}: Props) {
  const uid = React.useId();
  const line = lineOrDefault(value);
  const name = typeof line.name === "string" ? line.name : "";
  const amount = isJsonObject(line.amount)
    ? line.amount
    : defaultMeasurement();
  const processing = asStringArray(line.processing);
  const notes = asStringArray(line.notes);
  const usda = typeof line.usda_num === "string" ? line.usda_num : "";

  const patch = (next: Record<string, unknown>) => {
    onChange({ ...line, ...next });
  };

  const subsRaw = line.substitutions;
  const subs: Record<string, unknown>[] = Array.isArray(subsRaw)
    ? subsRaw.filter(isJsonObject)
    : [];

  const setSubs = (next: Record<string, unknown>[]) => {
    patch({ substitutions: next });
  };

  const { minimized, toggleRow } = useCollapsibleListRow({
    rowIndex,
    siblingCount,
    collapseAllSignal,
    expandAllSignal,
  });

  return (
    <Card className="border-[var(--color-border)]">
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md py-1 text-left outline-none ring-offset-2 ring-offset-[var(--color-canvas)] transition-colors hover:bg-stone-100/80 focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          onClick={toggleRow}
          aria-expanded={!minimized}
          aria-label={minimized ? `Expand ${title}` : `Collapse ${title}`}
        >
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-[var(--color-muted)] transition-transform duration-200 ease-out",
              minimized && "-rotate-90"
            )}
            aria-hidden
          />
          <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0">
            <span className="text-sm font-semibold leading-none">{title}</span>
            {name.trim() ? (
              <span className="truncate text-sm font-normal text-[var(--color-muted)]">
                {name}
              </span>
            ) : (
              <span className="text-sm font-normal italic text-[var(--color-muted)] opacity-70">
                No name yet
              </span>
            )}
          </span>
        </button>
        {onRemove ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-stone-500 hover:text-red-700"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            aria-label="Remove ingredient"
          >
            <Trash2 />
          </Button>
        ) : null}
      </CardHeader>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          minimized ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <CardContent className="space-y-4 pt-0">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => patch({ name: e.target.value })}
                placeholder="Ingredient name"
              />
            </div>

            <div className="space-y-2">
              <div className="text-xs font-medium text-[var(--color-muted)]">
                Amount (for base yield)
              </div>
              <MeasurementFieldset
                value={amount}
                onChange={(m) => patch({ amount: m })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Processing tags</Label>
              <Textarea
                value={processing.join("\n")}
                onChange={(e) =>
                  patch({
                    processing: e.target.value
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="One per line, e.g. minced"
                className="min-h-[72px] font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={notes.join("\n")}
                onChange={(e) =>
                  patch({
                    notes: e.target.value
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="One per line"
                className="min-h-[72px] font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`${uid}-usda`}>USDA number (optional)</Label>
              <Input
                id={`${uid}-usda`}
                value={usda}
                onChange={(e) => patch({ usda_num: e.target.value || undefined })}
              />
            </div>

            {allowSubstitutions ? (
              <div className="space-y-3 border-t border-[var(--color-border)] pt-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">Substitutions</span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      setSubs([
                        ...subs,
                        {
                          name: "",
                          amount: defaultMeasurement(),
                        },
                      ])
                    }
                  >
                    <Plus className="size-4" />
                    Add substitution
                  </Button>
                </div>
                {subs.map((sub, si) => (
                  <IngredientLineEditor
                    key={si}
                    title={`Substitution ${si + 1}`}
                    allowSubstitutions={false}
                    rowIndex={si}
                    siblingCount={subs.length}
                    collapseAllSignal={collapseAllSignal}
                    expandAllSignal={expandAllSignal}
                    value={sub}
                    onChange={(next) => {
                      const copy = [...subs];
                      copy[si] = next;
                      setSubs(copy);
                    }}
                    onRemove={() => setSubs(subs.filter((_, j) => j !== si))}
                  />
                ))}
              </div>
            ) : null}
          </CardContent>
        </div>
      </div>
    </Card>
  );
}
