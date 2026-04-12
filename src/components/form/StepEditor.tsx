import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  asStringArray,
  defaultStep,
  isJsonObject,
  linesFromMultilineInput,
} from "@/lib/recipe-document";
import { cn } from "@/lib/utils";
import { ChevronDown, Trash2 } from "lucide-react";
import * as React from "react";

import { useCollapsibleListRow } from "./useCollapsibleListRow";

type Props = {
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  onRemove: () => void;
  index: number;
  /** Total steps in the recipe (for auto-collapse when the list is long). */
  totalSteps: number;
  collapseAllSignal?: number;
  expandAllSignal?: number;
};

function previewSnippet(text: string, max = 80): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

/**
 * Instruction + notes only. Other step fields (e.g. HACCP) from loaded files
 * are preserved because we merge into the existing object.
 */
export function StepEditor({
  value,
  onChange,
  onRemove,
  index,
  totalSteps,
  collapseAllSignal = 0,
  expandAllSignal = 0,
}: Props) {
  const uid = React.useId();
  const line = isJsonObject(value) ? { ...value } : defaultStep();
  const stepText = typeof line.step === "string" ? line.step : "";
  const notes = asStringArray(line.notes);

  const patch = (next: Record<string, unknown>) => {
    onChange({ ...line, ...next });
  };

  const { minimized, toggleRow } = useCollapsibleListRow({
    rowIndex: index,
    siblingCount: totalSteps,
    collapseAllSignal,
    expandAllSignal,
  });

  const preview =
    stepText.trim() || (notes.length ? notes[0] : "") || "No instruction yet";

  return (
    <Card className="border-[var(--color-border)]">
      <CardHeader className="flex flex-row items-start gap-2 space-y-0 pb-2">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-start gap-2 rounded-md py-1 text-left outline-none ring-offset-2 ring-offset-[var(--color-canvas)] transition-colors hover:bg-stone-100/80 focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          onClick={toggleRow}
          aria-expanded={!minimized}
          aria-label={minimized ? `Expand step ${index + 1}` : `Collapse step ${index + 1}`}
        >
          <ChevronDown
            className={cn(
              "mt-0.5 size-4 shrink-0 text-[var(--color-muted)] transition-transform duration-200 ease-out",
              minimized && "-rotate-90"
            )}
            aria-hidden
          />
          <span className="min-w-0 flex-1">
            <CardTitle className="text-sm font-semibold leading-none">
              Step {index + 1}
            </CardTitle>
            {minimized ? (
              <span className="mt-1 block line-clamp-2 text-xs font-normal text-[var(--color-muted)]">
                {previewSnippet(preview)}
              </span>
            ) : null}
          </span>
        </button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 text-stone-500 hover:text-red-700"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label="Remove step"
        >
          <Trash2 />
        </Button>
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
              <Label htmlFor={`${uid}-step`}>Instruction</Label>
              <Textarea
                id={`${uid}-step`}
                value={stepText}
                onChange={(e) => patch({ step: e.target.value })}
                className="min-h-[100px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Step notes</Label>
              <Textarea
                value={notes.join("\n")}
                onChange={(e) =>
                  patch({
                    notes: linesFromMultilineInput(e.target.value),
                  })
                }
                placeholder="One per line"
                className="min-h-[72px] font-mono text-xs"
              />
            </div>
          </CardContent>
        </div>
      </div>
    </Card>
  );
}
