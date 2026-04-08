import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  asIngredientArray,
  asStepArray,
  asStringArray,
  defaultBaseYield,
  defaultIngredient,
  defaultStep,
  isJsonObject,
  YIELD_QUANTITY_KINDS,
} from "@/lib/recipe-document";
import { MotionConfig, Reorder } from "motion/react";
import { ChevronsDown, ChevronsUp, Plus } from "lucide-react";
import * as React from "react";
import { DraggableStepRow } from "./form/DraggableStepRow";
import { IngredientLineEditor } from "./form/IngredientLineEditor";
import { MeasurementFieldset } from "./form/MeasurementFieldset";
import { RecipeExtrasPanel } from "./form/RecipeExtrasPanel";
import type { StepRow } from "./form/step-row";

type Props = {
  recipe: Record<string, unknown>;
  extras: Record<string, unknown> | null;
  onEssentialsChange: (patch: Record<string, unknown>) => void;
  onExtrasChange: (patch: Record<string, unknown>) => void;
  onExtrasReplace: (next: Record<string, unknown> | null) => void;
  editorSyncKey: number;
};

function rowsFromSteps(recipe: Record<string, unknown>): StepRow[] {
  return asStepArray(recipe.steps).map((data) => ({
    id: crypto.randomUUID(),
    data,
  }));
}

export function RecipeForm({
  recipe,
  extras,
  onEssentialsChange,
  onExtrasChange,
  onExtrasReplace,
  editorSyncKey,
}: Props) {
  const recipeName =
    typeof recipe.recipe_name === "string" ? recipe.recipe_name : "";
  const notes = asStringArray(recipe.notes);
  const ingredients = asIngredientArray(recipe.ingredients);
  const baseYield = isJsonObject(recipe.base_yield)
    ? recipe.base_yield
    : defaultBaseYield();

  const recipeRef = React.useRef(recipe);
  recipeRef.current = recipe;

  const [stepRows, setStepRows] = React.useState<StepRow[]>(() =>
    rowsFromSteps(recipe)
  );

  const skipHydrateRef = React.useRef(true);
  React.useEffect(() => {
    if (skipHydrateRef.current) {
      skipHydrateRef.current = false;
      return;
    }
    setStepRows(rowsFromSteps(recipeRef.current));
  }, [editorSyncKey]);

  const pushStepsToParent = React.useCallback(
    (rows: StepRow[]) => {
      onEssentialsChange({ steps: rows.map((r) => r.data) });
    },
    [onEssentialsChange]
  );

  const set = (partial: Record<string, unknown>) => {
    onEssentialsChange(partial);
  };

  const setIngredients = (next: Record<string, unknown>[]) => {
    if (next.length > 0 && !isJsonObject(recipe.base_yield)) {
      onEssentialsChange({ ingredients: next, base_yield: defaultBaseYield() });
    } else {
      onEssentialsChange({ ingredients: next });
    }
  };

  const addIngredient = () => {
    setIngredients([...ingredients, defaultIngredient()]);
  };

  const handleReorder = (newOrder: StepRow[]) => {
    setStepRows(newOrder);
    pushStepsToParent(newOrder);
  };

  const updateStepData = (id: string, next: Record<string, unknown>) => {
    setStepRows((prev) => {
      const mapped = prev.map((r) =>
        r.id === id ? { ...r, data: next } : r
      );
      pushStepsToParent(mapped);
      return mapped;
    });
  };

  const removeStep = (id: string) => {
    setStepRows((prev) => {
      const filtered = prev.filter((r) => r.id !== id);
      pushStepsToParent(filtered);
      return filtered;
    });
  };

  const addStep = () => {
    setStepRows((prev) => {
      const next = [...prev, { id: crypto.randomUUID(), data: defaultStep() }];
      pushStepsToParent(next);
      return next;
    });
  };

  const [ingredientCollapseAll, setIngredientCollapseAll] = React.useState(0);
  const [ingredientExpandAll, setIngredientExpandAll] = React.useState(0);
  const [stepCollapseAll, setStepCollapseAll] = React.useState(0);
  const [stepExpandAll, setStepExpandAll] = React.useState(0);

  return (
    <div className="flex w-full min-w-0 flex-col gap-8 pb-24">
      <div className="grid gap-8 lg:grid-cols-2 lg:items-start lg:gap-10">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Recipe</CardTitle>
            <CardDescription>
              Edit the name, notes, ingredients, and steps. Identifiers and schema
              metadata are filled in automatically when you save.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="recipe_name">Name</Label>
              <Input
                id="recipe_name"
                value={recipeName}
                onChange={(e) => set({ recipe_name: e.target.value })}
                required
              />
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Notes</CardTitle>
            <CardDescription>Optional; one line per note.</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={notes.join("\n")}
              onChange={(e) =>
                set({
                  notes: e.target.value
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              placeholder="One note per line"
              className="min-h-[120px] w-full font-mono text-sm lg:min-h-[140px]"
            />
          </CardContent>
        </Card>
      </div>

      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Recipe output (base yield)</CardTitle>
          <CardDescription>
            Ingredient lines are written for this batch. Mass and volume use fixed metric
            (SI) unit codes; count uses any non-empty label for what you count (e.g.
            cookies). Output must use quantity kind count, mass, or volume only (how many
            items, total mass, or total volume)—not temperature or duration; use the oven
            fields for those. To scale, multiply each ingredient amount by{" "}
            <code className="rounded bg-stone-100 px-1 font-mono text-xs">
              target ÷ base_yield.amount
            </code>{" "}
            when the unit and quantity kind match.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MeasurementFieldset
            value={baseYield}
            onChange={(m) => set({ base_yield: m })}
            label="What this recipe produces"
            quantityKindOptions={YIELD_QUANTITY_KINDS}
          />
        </CardContent>
      </Card>

      <div className="min-w-0">
        <RecipeExtrasPanel
          recipe={recipe}
          extras={extras}
          onExtrasChange={onExtrasChange}
          onExtrasReplace={onExtrasReplace}
          editorSyncKey={editorSyncKey}
        />
      </div>

      <div className="grid gap-8 xl:grid-cols-2 xl:items-start xl:gap-10">
        <div className="min-w-0 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Ingredients</h2>
            <p className="text-sm text-[var(--color-muted)]">
              Click a row to expand or minimize it. The name shows in the header
              when collapsed.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={ingredients.length === 0}
              onClick={() => setIngredientCollapseAll((n) => n + 1)}
            >
              <ChevronsUp className="size-4" />
              Collapse all
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={ingredients.length === 0}
              onClick={() => setIngredientExpandAll((n) => n + 1)}
            >
              <ChevronsDown className="size-4" />
              Expand all
            </Button>
          </div>
        </div>
        {ingredients.map((ing, i) => (
          <IngredientLineEditor
            key={i}
            title={`Ingredient ${i + 1}`}
            allowSubstitutions
            collapseAllSignal={ingredientCollapseAll}
            expandAllSignal={ingredientExpandAll}
            value={ing}
            onChange={(next) => {
              const copy = [...ingredients];
              copy[i] = next;
              setIngredients(copy);
            }}
            onRemove={() => setIngredients(ingredients.filter((_, j) => j !== i))}
          />
        ))}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="w-full sm:w-auto"
          onClick={addIngredient}
        >
          <Plus className="size-4" />
          Add ingredient
        </Button>
        </div>

        <div className="min-w-0 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Steps</h2>
            <p className="text-sm text-[var(--color-muted)]">
              Drag the handle to reorder. Click the row header to collapse or
              expand.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={stepRows.length === 0}
              onClick={() => setStepCollapseAll((n) => n + 1)}
            >
              <ChevronsUp className="size-4" />
              Collapse all
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={stepRows.length === 0}
              onClick={() => setStepExpandAll((n) => n + 1)}
            >
              <ChevronsDown className="size-4" />
              Expand all
            </Button>
          </div>
        </div>
        <MotionConfig reducedMotion="user">
          <Reorder.Group
            axis="y"
            values={stepRows}
            onReorder={handleReorder}
            className="flex flex-col"
          >
            {stepRows.map((row, i) => (
              <DraggableStepRow
                key={row.id}
                row={row}
                index={i}
                onStepChange={updateStepData}
                onRemove={removeStep}
                collapseAllSignal={stepCollapseAll}
                expandAllSignal={stepExpandAll}
              />
            ))}
          </Reorder.Group>
        </MotionConfig>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="w-full sm:w-auto"
          onClick={addStep}
        >
          <Plus className="size-4" />
          Add step
        </Button>
        </div>
      </div>
    </div>
  );
}
