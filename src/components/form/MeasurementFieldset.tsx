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
  coerceMeasurementCountUnit,
  MEASUREMENT_COUNT_UNIT_CODES,
  resolveMeasurementUnit,
  unitsForQuantityKind,
} from "@/lib/measurement-units";
import {
  filterDecimalAmountInput,
  parseAmountFromInput,
} from "@/lib/parse-amount-input";
import { isJsonObject } from "@/lib/recipe-document";
import { defaultMeasurement } from "@/lib/recipe-document";
import { QUANTITY_KINDS, UNIT_SYSTEMS } from "./constants";

type Props = {
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  label?: string;
  /**
   * If set, only these quantity kinds appear in the selector (e.g. `base_yield` uses
   * count, mass, volume per `YieldMeasurement` — not temperature or duration).
   */
  quantityKindOptions?: readonly string[];
  /**
   * When true with quantity kind count, `unit` uses the normative `Measurement` enum
   * (ingredient lines). When false, count `unit` is free text (`YieldMeasurement` output).
   */
  ingredientCountUnits?: boolean;
};

export function MeasurementFieldset({
  value,
  onChange,
  label,
  quantityKindOptions,
  ingredientCountUnits = false,
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
  const isVolume = resolvedKind === "volume";
  const volumeSystem: "metric" | "us_customary" =
    us === "us_customary" ? "us_customary" : "metric";

  const countUnitResolved = ingredientCountUnits
    ? coerceMeasurementCountUnit(unit)
    : unit;

  const resolvedUnit = isCount
    ? countUnitResolved
    : resolveMeasurementUnit(
        resolvedKind,
        unit,
        isVolume ? volumeSystem : "metric"
      );

  const allowedUnits = React.useMemo(() => {
    if (isCount) {
      return ingredientCountUnits ? [...MEASUREMENT_COUNT_UNIT_CODES] : [];
    }
    if (isVolume) {
      return unitsForQuantityKind("volume", volumeSystem);
    }
    return unitsForQuantityKind(resolvedKind, "metric");
  }, [isCount, isVolume, ingredientCountUnits, resolvedKind, volumeSystem]);

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
    if (!isCount || !ingredientCountUnits) return;
    if (countUnitResolved !== unit) {
      patch({ unit: countUnitResolved, unit_system: "metric" });
    }
  }, [isCount, ingredientCountUnits, countUnitResolved, unit, patch]);

  React.useEffect(() => {
    if (isCount) return;
    const sys = isVolume ? volumeSystem : "metric";
    const next = resolveMeasurementUnit(resolvedKind, unit, sys);
    if (unit !== next) {
      patch({ unit: next });
    }
  }, [unit, resolvedKind, patch, isCount, isVolume, volumeSystem]);

  React.useEffect(() => {
    if (isVolume) return;
    if (us !== "metric") {
      patch({ unit_system: "metric" });
    }
  }, [isVolume, us, patch]);

  /** While focused, keep a string draft so clearing the field does not immediately commit `0` (avoids "05" when typing after clear). */
  const [amountDraft, setAmountDraft] = React.useState<string | null>(null);
  const amountDraftRef = React.useRef("");

  const amountDisplay =
    amountDraft !== null
      ? amountDraft
      : String(Number.isFinite(amount) ? amount : 0);

  const commitAmountDraft = React.useCallback(() => {
    const raw = amountDraftRef.current;
    setAmountDraft(null);
    patch({ amount: parseAmountFromInput(raw) });
  }, [patch]);

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
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={amountDisplay}
          onFocus={() => {
            const a = Number.isFinite(amount) ? amount : 0;
            const s = a === 0 ? "" : String(a);
            amountDraftRef.current = s;
            setAmountDraft(s);
          }}
          onChange={(e) => {
            const raw = filterDecimalAmountInput(e.target.value);
            amountDraftRef.current = raw;
            setAmountDraft(raw);
          }}
          onBlur={() => {
            commitAmountDraft();
          }}
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
      {isVolume ? (
        <div className="space-y-1.5">
          <Label>Unit system</Label>
          <Select
            value={volumeSystem}
            onValueChange={(val) => {
              const nextSys = val === "us_customary" ? "us_customary" : "metric";
              patch({
                unit_system: nextSys,
                unit: resolveMeasurementUnit("volume", unit, nextSys),
              });
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UNIT_SYSTEMS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === "metric" ? "Metric (ml, cl, L)" : "US customary (tsp, tbsp, cup)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      <div className="space-y-1.5">
        <Label htmlFor={`${uid}-unit`}>Unit</Label>
        {isCount ? (
          ingredientCountUnits ? (
            <Select
              value={resolvedUnit}
              onValueChange={(val) =>
                patch({ unit: val, unit_system: "metric" })
              }
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
          ) : (
            <Input
              id={`${uid}-unit`}
              value={unit}
              onChange={(e) => patch({ unit: e.target.value })}
              placeholder="e.g. cookies, servings, each…"
              className="font-mono text-sm"
            />
          )
        ) : (
          <Select
            value={resolvedUnit}
            onValueChange={(val) => {
              if (isVolume) {
                const usNext =
                  val === "tsp" || val === "tbsp" || val === "cup"
                    ? "us_customary"
                    : "metric";
                patch({
                  unit: val,
                  unit_system: usNext,
                });
              } else {
                patch({ unit: val });
              }
            }}
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
