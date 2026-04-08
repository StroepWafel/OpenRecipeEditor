# Open Recipe Editor

A browser-based graphical editor for recipes that follow the [Open Recipe Standard](https://github.com/StroepWafel/OpenRecipeStandard). The public site is planned at [food-for-eating.com](https://food-for-eating.com). On load it fetches the JSON Schema and the minimal example from GitHub (tag `v1.0.0` by default, with a fallback to `main` if the tag is not available yet).

## Run locally

```bash
npm install
npm run dev
```

Open the URL printed in the terminal (usually `http://localhost:5173`).

## Build

```bash
npm run build
npm run preview
```

## Configuration (optional)

Environment variables (Vite: prefix with `VITE_`):

| Variable | Purpose |
|----------|---------|
| `VITE_ORS_GITHUB_REF` | Git ref for raw GitHub URLs (default: `v1.0.0`). |
| `VITE_ORS_SCHEMA_URL` | Override schema URL entirely. |
| `VITE_ORS_EXAMPLE_MINIMAL_URL` | Override minimal example URL. |
| `VITE_ORS_EXAMPLE_COMPLETE_URL` | Override complete example URL. |

Example `.env.local`:

```env
VITE_ORS_GITHUB_REF=main
```

## Features

- Loads `schemas/open-recipe.schema.json` and `examples/minimal-recipe.json` from the published repository.
- **Simplified editing:** the form is limited to **name**, **notes**, **ingredients** (including substitutions), and **steps**. Other keys from a loaded file (yields, oven, source, extensions, etc.) are kept in the background and round-trip on save; you are not asked to edit them.
- **Auto on save:** if `recipe_uuid` is missing, one is generated; `$schema` is set from the schema’s `$id` when available; empty `notes` arrays are omitted.
- Validates the merged document with JSON Schema (draft 2020-12) via Ajv.
- Save JSON (native save dialog when supported, otherwise download) and load from disk.
- Optional samples: minimal and complete recipes from the same Git ref / fallbacks.

## UI

The layout uses a restrained palette, [IBM Plex Sans](https://github.com/IBM/plex), and a subtle grid background with light motion—aligned with a calm editorial tool rather than a generic “AI product” look. [Chamaac-style](https://www.chamaac.com/) components are represented by the same stack (Tailwind, motion, shadcn-style primitives) and a minimal grid treatment instead of heavy shader chrome.
