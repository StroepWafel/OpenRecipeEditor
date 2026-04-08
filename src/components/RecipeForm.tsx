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
} from "@/lib/recipe-document";
import { MotionConfig, Reorder } from "motion/react";
import { Plus } from "lucide-react";
import * as React from "react";
import { DraggableStepRow } from "./form/DraggableStepRow";
import { IngredientLineEditor } from "./form/IngredientLineEditor";
import { MeasurementFieldset } from "./form/MeasurementFieldset";
import type { StepRow } from "./form/step-row";

type Props = {
  recipe: Record<string, unknown>;
  onEssentialsChange: (patch: Record<string, unknown>) => void;
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
  onEssentialsChange,
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

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 pb-24">
      <Card>
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

      <Card>
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
            className="min-h-[100px] font-mono text-sm"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recipe output (base yield)</CardTitle>
          <CardDescription>
            Ingredient amounts below are written for this batch size. To scale,
            multiply every ingredient amount by{" "}
            <code className="rounded bg-stone-100 px-1 font-mono text-xs">
              target ÷ base_yield.amount
            </code>{" "}
            when using the same unit and quantity kind (see schema examples).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MeasurementFieldset
            value={baseYield}
            onChange={(m) => set({ base_yield: m })}
            label="What this recipe produces"
          />
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
          <div>
            <h2 className="text-lg font-semibold">Ingredients</h2>
            <p className="text-sm text-[var(--color-muted)]">
              Click a row to expand or minimize it. The name shows in the header
              when collapsed.
            </p>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={addIngredient}>
            <Plus className="size-4" />
            Add ingredient
          </Button>
        </div>
        {ingredients.map((ing, i) => (
          <IngredientLineEditor
            key={i}
            title={`Ingredient ${i + 1}`}
            allowSubstitutions
            value={ing}
            onChange={(next) => {
              const copy = [...ingredients];
              copy[i] = next;
              setIngredients(copy);
            }}
            onRemove={() => setIngredients(ingredients.filter((_, j) => j !== i))}
          />
        ))}
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Steps</h2>
        <p className="text-sm text-[var(--color-muted)]">
          Drag the handle to reorder. Other rows shift with a spring animation.
        </p>
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
  );
}
