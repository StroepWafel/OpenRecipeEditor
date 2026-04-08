const OWNER_REPO = "StroepWafel/OpenRecipeStandard";

/** Pin to v1.0.0; override with `VITE_ORS_GITHUB_REF` for forks or pre-release testing. */
export function githubRef(): string {
  return import.meta.env.VITE_ORS_GITHUB_REF ?? "v1.0.0";
}

function rawBase(ref: string): string {
  return `https://raw.githubusercontent.com/${OWNER_REPO}/${ref}`;
}

/** Candidate URLs for fetching the normative schema (e.g. CI or scripts). The app validates against `src/schemas/open-recipe.schema.json` unless `VITE_ORS_SCHEMA_URL` is set, so tag `v1.0.0` is never used for in-app validation. */
export function schemaUrlCandidates(): string[] {
  const override = import.meta.env.VITE_ORS_SCHEMA_URL;
  if (override) return [override];
  const ref = githubRef();
  return [
    `${rawBase(ref)}/schemas/open-recipe.schema.json`,
    `${rawBase("main")}/schemas/open-recipe.schema.json`,
  ];
}

export function minimalExampleUrlCandidates(): string[] {
  const override = import.meta.env.VITE_ORS_EXAMPLE_MINIMAL_URL;
  if (override) return [override];
  const ref = githubRef();
  return [
    `${rawBase(ref)}/examples/minimal-recipe.json`,
    `${rawBase("main")}/examples/minimal-recipe.json`,
  ];
}

export function completeExampleUrlCandidates(): string[] {
  const override = import.meta.env.VITE_ORS_EXAMPLE_COMPLETE_URL;
  if (override) return [override];
  const ref = githubRef();
  return [
    `${rawBase(ref)}/examples/complete-recipe.json`,
    `${rawBase("main")}/examples/complete-recipe.json`,
  ];
}

export async function fetchFirstOk(urls: string[]): Promise<{ url: string; text: string }> {
  let lastErr: unknown;
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const text = await res.text();
        return { url, text };
      }
      lastErr = new Error(`HTTP ${res.status} for ${url}`);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error("Failed to fetch from any candidate URL");
}
