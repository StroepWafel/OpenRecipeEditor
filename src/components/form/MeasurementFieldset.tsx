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
import {
  resolveMeasurementUnit,
  unitsForQuantityKind,
} from "@/lib/measurement-units";
import { isJsonObject } from "@/lib/recipe-document";
import { defaultMeasurement } from "@/lib/recipe-document";
import { QUANTITY_KINDS } from "./constants";

type Props = {
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  label?: string;
  /**
   * If set, only these quantity kinds appear in the selector (e.g. `base_yield` uses
   * count, mass, volume per `YieldMeasurement` — not temperature or duration).
   */
  quantityKindOptions?: readonly string[];
};

export function MeasurementFieldset({
  value,
  onChange,
  label,
  quantityKindOptions,
}: Props) {
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
  const us = typeof v.unit_system === "string" ? v.unit_system : "metric";

  const kinds = quantityKindOptions ?? QUANTITY_KINDS;
  const resolvedKind = kinds.includes(qk) ? qk : kinds[0];
  const isCount = resolvedKind === "count";

  const resolvedUnit = isCount
    ? unit
    : resolveMeasurementUnit(resolvedKind, unit);

  const allowedUnits = React.useMemo(
    () => unitsForQuantityKind(resolvedKind),
    [resolvedKind]
  );

  const patch = React.useCallback(
    (patch: Record<string, unknown>) => {
      onChange({ ...v, ...patch });
    },
    [onChange, v]
  );

  React.useEffect(() => {
    if (qk !== resolvedKind) {
      patch({ quantity_kind: resolvedKind });
    }
  }, [qk, resolvedKind, patch]);

  React.useEffect(() => {
    if (isCount) return;
    const next = resolveMeasurementUnit(resolvedKind, unit);
    if (unit !== next) {
      patch({ unit: next });
    }
  }, [unit, resolvedKind, patch, isCount]);

  React.useEffect(() => {
    if (us !== "metric") {
      patch({ unit_system: "metric" });
    }
  }, [us, patch]);

  return (
    <div className="grid w-full min-w-0 gap-3 rounded-md border border-[var(--color-border)]/80 bg-stone-50/50 p-3 sm:grid-cols-2 xl:grid-cols-3">
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
        <Label>Quantity kind</Label>
        <Select
          value={resolvedKind}
          onValueChange={(val) => patch({ quantity_kind: val })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {kinds.map((k) => (
              <SelectItem key={k} value={k}>
                {k}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${uid}-unit`}>Unit</Label>
        {isCount ? (
          <Input
            id={`${uid}-unit`}
            value={unit}
            onChange={(e) => patch({ unit: e.target.value })}
            placeholder="e.g. cookies, servings, each…"
            className="font-mono text-sm"
          />
        ) : (
          <Select
            value={resolvedUnit}
            onValueChange={(val) => patch({ unit: val })}
          >
            <SelectTrigger id={`${uid}-unit`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-[min(24rem,70vh)]">
              {allowedUnits.map((u) => (
                <SelectItem key={u} value={u}>
                  {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}
