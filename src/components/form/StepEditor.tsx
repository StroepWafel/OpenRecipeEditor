import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  asStringArray,
  defaultStep,
  isJsonObject,
} from "@/lib/recipe-document";
import { Trash2 } from "lucide-react";
import * as React from "react";

type Props = {
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  onRemove: () => void;
  index: number;
};

/**
 * Instruction + notes only. Other step fields (e.g. HACCP) from loaded files
 * are preserved because we merge into the existing object.
 */
export function StepEditor({ value, onChange, onRemove, index }: Props) {
  const uid = React.useId();
  const line = isJsonObject(value) ? { ...value } : defaultStep();
  const stepText = typeof line.step === "string" ? line.step : "";
  const notes = asStringArray(line.notes);

  const patch = (next: Record<string, unknown>) => {
    onChange({ ...line, ...next });
  };

  return (
    <Card className="border-[var(--color-border)]">
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold">Step {index + 1}</CardTitle>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 text-stone-500 hover:text-red-700"
          onClick={onRemove}
          aria-label="Remove step"
        >
          <Trash2 />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
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
      </CardContent>
    </Card>
  );
}
