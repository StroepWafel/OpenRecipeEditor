import * as React from "react";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isJsonObject } from "@/lib/recipe-document";
import { defaultMeasurement } from "@/lib/recipe-document";
import { QUANTITY_KINDS, UNIT_SYSTEMS } from "./constants";

type Props = {
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  label?: string;
};

export function MeasurementFieldset({ value, onChange, label }: Props) {
  const uid = React.useId();
  const v = isJsonObject(value) ? value : defaultMeasurement();
  const amount =
    typeof v.amount === "number"
      ? v.amount
      : typeof v.amount === "string"
        ? parseFloat(v.amount)
        : 0;
  const unit = typeof v.unit === "string" ? v.unit : "";
  const qk =
    typeof v.quantity_kind === "string" ? v.quantity_kind : "count";
  const us =
    typeof v.unit_system === "string" ? v.unit_system : "unspecified";

  const patch = (patch: Record<string, unknown>) => {
    onChange({ ...v, ...patch });
  };

  return (
    <div className="grid gap-3 rounded-md border border-[var(--color-border)]/80 bg-stone-50/50 p-3 sm:grid-cols-2">
      {label ? (
        <div className="col-span-full text-xs font-medium text-[var(--color-muted)]">
          {label}
        </div>
      ) : null}
      <div className="space-y-1.5">
        <Label htmlFor={`${uid}-amt`}>Amount</Label>
        <Input
          id={`${uid}-amt`}
          type="number"
          step="any"
          value={Number.isFinite(amount) ? amount : 0}
          onChange={(e) =>
            patch({ amount: parseFloat(e.target.value) || 0 })
          }
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${uid}-unit`}>Unit</Label>
        <Input
          id={`${uid}-unit`}
          value={unit}
          onChange={(e) => patch({ unit: e.target.value })}
          placeholder="g, ml, cup, each…"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Quantity kind</Label>
        <Select
          value={qk}
          onValueChange={(val) => patch({ quantity_kind: val })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {QUANTITY_KINDS.map((k) => (
              <SelectItem key={k} value={k}>
                {k}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Unit system</Label>
        <Select value={us} onValueChange={(val) => patch({ unit_system: val })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {UNIT_SYSTEMS.map((k) => (
              <SelectItem key={k} value={k}>
                {k}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
