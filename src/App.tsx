import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RecipeForm } from "@/components/RecipeForm";
import { SubtleGridBackground } from "@/components/SubtleGridBackground";
import { UnsavedChangesDialog } from "@/components/UnsavedChangesDialog";
import {
  completeExampleUrlCandidates,
  fetchFirstOk,
  minimalExampleUrlCandidates,
} from "@/lib/github-assets";
import bundledOpenRecipeSchema from "@/schemas/open-recipe.schema.json";
import {
  finalizeRecipeForExport,
  mergeRecipeForModel,
  splitRecipeForEditor,
} from "@/lib/recipe-export";
import { readJsonFile, saveRecipeJson } from "@/lib/recipe-files";
import {
  asObject,
  emptyRecipe,
  mergeExtrasPatch,
  missingBaseYieldWarnings,
} from "@/lib/recipe-document";
import { compileValidator, formatAjvErrors } from "@/lib/schema";
import type { ValidateFunction } from "ajv";
import {
  AlertCircle,
  FileDown,
  FileText,
  FileUp,
  Loader2,
  RefreshCw,
} from "lucide-react";
import * as React from "react";

export default function App() {
  const [schemaText, setSchemaText] = React.useState<string | null>(null);
  const [schemaUrlUsed, setSchemaUrlUsed] = React.useState<string | null>(null);
  const [schemaId, setSchemaId] = React.useState<string | null>(null);
  const [validator, setValidator] = React.useState<ValidateFunction | null>(
    null
  );
  const [essentials, setEssentials] = React.useState<Record<
    string,
    unknown
  > | null>(null);
  const [extras, setExtras] = React.useState<Record<string, unknown> | null>(
    null
  );
  const [bootstrapError, setBootstrapError] = React.useState<string | null>(
    null
  );
  const [loading, setLoading] = React.useState(true);
  const [ajvErrors, setAjvErrors] = React.useState<string[]>([]);
  const [baseYieldHints, setBaseYieldHints] = React.useState<string[]>([]);
  const [editorSyncKey, setEditorSyncKey] = React.useState(0);
  const [baselineFingerprint, setBaselineFingerprint] = React.useState<
    string | null
  >(null);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = React.useState(false);
  const pendingNavigationRef = React.useRef<(() => void | Promise<void>) | null>(
    null
  );
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const recipe = React.useMemo(() => {
    if (!essentials) return null;
    return mergeRecipeForModel(extras, essentials);
  }, [extras, essentials]);

  const fingerprint = recipe ? JSON.stringify(recipe) : null;
  const isDirty = Boolean(
    fingerprint && baselineFingerprint && fingerprint !== baselineFingerprint
  );

  React.useEffect(() => {
    if (!loading && recipe && baselineFingerprint === null) {
      setBaselineFingerprint(JSON.stringify(recipe));
    }
  }, [loading, recipe, baselineFingerprint]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setBootstrapError(null);
      const errors: string[] = [];

      try {
        /** Normative schema for `base_yield` + `amount` (matches this editor). GitHub tag v1.0.0 still ships the legacy yields/amounts; do not fetch that for validation. */
        const overrideUrl = import.meta.env.VITE_ORS_SCHEMA_URL as
          | string
          | undefined;
        let schemaJson: Record<string, unknown>;
        let schemaSource: string;

        if (overrideUrl) {
          const res = await fetch(overrideUrl, { cache: "no-store" });
          if (!res.ok) {
            throw new Error(`HTTP ${res.status} for ${overrideUrl}`);
          }
          schemaJson = (await res.json()) as Record<string, unknown>;
          schemaSource = overrideUrl;
        } else {
          schemaJson = bundledOpenRecipeSchema as Record<string, unknown>;
          schemaSource =
            typeof bundledOpenRecipeSchema.$id === "string"
              ? bundledOpenRecipeSchema.$id
              : "bundled open-recipe.schema.json";
        }

        if (cancelled) return;
        const v = compileValidator(schemaJson);
        setSchemaText(JSON.stringify(schemaJson));
        setSchemaUrlUsed(schemaSource);
        setValidator(() => v);
        setSchemaId(
          typeof schemaJson.$id === "string" ? schemaJson.$id : null
        );
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "Failed to load schema.";
        errors.push(`Schema: ${msg}`);
        setValidator(null);
        setSchemaId(null);
      }

      try {
        const ex = await fetchFirstOk(minimalExampleUrlCandidates());
        if (cancelled) return;
        const data = JSON.parse(ex.text) as unknown;
        const obj = asObject(data);
        const { essentials: e, extras: x } = splitRecipeForEditor(obj);
        setEssentials(e);
        setExtras(Object.keys(x).length ? x : null);
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "Failed to load default example.";
        errors.push(`Example: ${msg}`);
        setEssentials(emptyRecipe());
        setExtras(null);
      }

      if (!cancelled && errors.length) {
        setBootstrapError(errors.join(" "));
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const runValidate = React.useCallback(
    (doc: Record<string, unknown>) => {
      setBaseYieldHints(missingBaseYieldWarnings(doc));
      if (!validator) {
        setAjvErrors(["Validator not ready."]);
        return;
      }
      const ok = validator(doc);
      if (ok) setAjvErrors([]);
      else setAjvErrors(formatAjvErrors(validator.errors));
    },
    [validator]
  );

  React.useEffect(() => {
    if (!recipe || !validator) return;
    runValidate(recipe);
  }, [recipe, validator, runValidate]);

  const applyLoadedRecipe = React.useCallback((obj: Record<string, unknown>) => {
    const { essentials: e, extras: x } = splitRecipeForEditor(obj);
    const merged = mergeRecipeForModel(
      Object.keys(x).length ? x : null,
      e
    );
    setBaselineFingerprint(JSON.stringify(merged));
    setEssentials(e);
    setExtras(Object.keys(x).length ? x : null);
    setEditorSyncKey((k) => k + 1);
  }, []);

  const resetToNewRecipe = React.useCallback(() => {
    const e = emptyRecipe();
    const merged = mergeRecipeForModel(null, e);
    setBaselineFingerprint(JSON.stringify(merged));
    setEssentials(e);
    setExtras(null);
    setBootstrapError(null);
    setEditorSyncKey((k) => k + 1);
  }, []);

  const runWhenClear = React.useCallback(
    (action: () => void | Promise<void>) => {
      if (!isDirty) {
        void action();
        return;
      }
      pendingNavigationRef.current = action;
      setConfirmDiscardOpen(true);
    },
    [isDirty]
  );

  const loadSample = React.useCallback(
    async (urls: string[]) => {
      setBootstrapError(null);
      try {
        const ex = await fetchFirstOk(urls);
        const data = JSON.parse(ex.text) as unknown;
        applyLoadedRecipe(asObject(data));
      } catch (e) {
        setBootstrapError(
          e instanceof Error ? e.message : "Failed to load sample recipe."
        );
      }
    },
    [applyLoadedRecipe]
  );

  const onPickFile: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const data = await readJsonFile(file);
      applyLoadedRecipe(asObject(data));
      setBootstrapError(null);
    } catch (err) {
      setBootstrapError(
        err instanceof Error ? err.message : "Could not read JSON file."
      );
    }
  };

  const onSave = React.useCallback(async (): Promise<boolean> => {
    if (!recipe || !validator) return false;
    const out = finalizeRecipeForExport(recipe, { schemaId });
    runValidate(out);
    if (!validator(out)) return false;
    await saveRecipeJson(out, "recipe.json");
    setBaselineFingerprint(JSON.stringify(recipe));
    return true;
  }, [recipe, validator, runValidate, schemaId]);

  const handleDiscardContinue = React.useCallback(async () => {
    const fn = pendingNavigationRef.current;
    pendingNavigationRef.current = null;
    setConfirmDiscardOpen(false);
    if (fn) await fn();
  }, []);

  const handleDiscardGoBack = React.useCallback(() => {
    pendingNavigationRef.current = null;
    setConfirmDiscardOpen(false);
  }, []);

  const handleDiscardSaveNow = React.useCallback(async () => {
    const ok = await onSave();
    if (!ok) return;
    const fn = pendingNavigationRef.current;
    pendingNavigationRef.current = null;
    setConfirmDiscardOpen(false);
    if (fn) await fn();
  }, [onSave]);

  return (
    <div className="relative min-h-screen">
      <UnsavedChangesDialog
        open={confirmDiscardOpen}
        onGoBack={handleDiscardGoBack}
        onContinue={handleDiscardContinue}
        onSaveNow={handleDiscardSaveNow}
      />
      <SubtleGridBackground />
      <header className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-[var(--color-canvas)]/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-3 px-4 py-4 sm:px-6 lg:px-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-[var(--color-ink)]">
              Open Recipe Editor
            </h1>
            <p className="text-sm text-[var(--color-muted)]">
              {schemaUrlUsed ? (
                <>
                  Schema:{" "}
                  <a
                    href={schemaUrlUsed}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all text-[var(--color-accent)] underline-offset-2 hover:underline"
                  >
                    {schemaUrlUsed}
                  </a>
                </>
              ) : (
                "Loading schema…"
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={loading}
              onClick={() => runWhenClear(resetToNewRecipe)}
            >
              New
            </Button>
            <div className="flex max-w-full flex-wrap items-center gap-2 rounded-md border border-sky-200/90 bg-sky-50/95 px-2 py-1.5">
              <div className="flex items-center gap-2 text-xs font-medium text-sky-950">
                <FileText
                  className="size-4 shrink-0 text-sky-700"
                  aria-hidden
                />
                <span>Sample recipes</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={loading}
                  onClick={() =>
                    runWhenClear(() =>
                      loadSample(minimalExampleUrlCandidates())
                    )
                  }
                >
                  Minimal example
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={loading}
                  onClick={() =>
                    runWhenClear(() =>
                      loadSample(completeExampleUrlCandidates())
                    )
                  }
                >
                  Complete example
                </Button>
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                runWhenClear(() => fileInputRef.current?.click())
              }
            >
              <FileUp className="size-4" />
              Load file
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={onPickFile}
            />
            <Button
              type="button"
              size="sm"
              onClick={onSave}
              disabled={!recipe}
            >
              <FileDown className="size-4" />
              Save
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => recipe && runValidate(recipe)}
              disabled={!recipe}
            >
              Validate
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex items-center gap-2 text-[var(--color-muted)]">
            <Loader2 className="size-5 animate-spin" />
            Loading schema and default example…
          </div>
        ) : null}

        {bootstrapError ? (
          <Card className="mb-6 border-amber-200 bg-amber-50/90">
            <CardContent className="flex flex-col gap-3 py-4 text-sm text-amber-950">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{bootstrapError}</span>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-fit"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="size-4" />
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {ajvErrors.length > 0 ? (
          <Card className="mb-6 border-red-200 bg-red-50/90">
            <CardContent className="py-4">
              <div className="mb-2 text-sm font-medium text-red-900">
                Validation errors
              </div>
              <ScrollArea className="h-[min(24rem,50vh)] w-full pr-3">
                <ul className="list-inside list-disc space-y-1.5 py-1 text-sm text-red-900">
                  {ajvErrors.map((err, i) => (
                    <li key={i} className="break-words font-mono text-xs">
                      {err}
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </CardContent>
          </Card>
        ) : null}

        {baseYieldHints.length > 0 ? (
          <Card className="mb-6 border-amber-200 bg-amber-50/80">
            <CardContent className="py-4 text-sm text-amber-950">
              <div className="mb-2 font-medium">Base yield</div>
              <ul className="list-inside list-disc text-xs">
                {baseYieldHints.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        {recipe && essentials ? (
          <RecipeForm
            recipe={recipe}
            extras={extras}
            editorSyncKey={editorSyncKey}
            onEssentialsChange={(patch) =>
              setEssentials((e) => ({ ...(e ?? emptyRecipe()), ...patch }))
            }
            onExtrasChange={(patch) =>
              setExtras((prev) => mergeExtrasPatch(prev, patch))
            }
            onExtrasReplace={(next) => setExtras(next)}
          />
        ) : null}
      </main>

      <footer className="relative z-10 border-t border-[var(--color-border)] px-4 py-6 text-center text-xs text-[var(--color-muted)] sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-screen-2xl">
          {schemaText ? (
            <span>Schema loaded ({schemaText.length.toLocaleString()} chars).</span>
          ) : (
            <span>Schema not loaded.</span>
          )}{" "}
          Open Recipe Standard — graphical editor.{" "}
          <a
            href="https://food-for-eating.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-accent)] underline-offset-2 hover:underline"
          >
            food-for-eating.com
          </a>
        </div>
      </footer>
    </div>
  );
}
