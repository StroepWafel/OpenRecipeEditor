/** Windows device names (case-insensitive) without extension. */
const WINDOWS_RESERVED = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;

const FILENAME_UNSAFE = new Set('<>:"/\\|?*');

function stripUnsafeFilenameChars(s: string): string {
  let out = "";
  for (const ch of s) {
    const code = ch.codePointAt(0)!;
    if (code < 32 || code === 127) continue;
    if (FILENAME_UNSAFE.has(ch)) continue;
    out += ch;
  }
  return out;
}

/**
 * Safe `.json` download name from Open Recipe `recipe_name`.
 * Falls back to `recipe.json` when the name is empty or only invalid characters.
 */
export function recipeFilenameFromRecipeName(recipeName: string): string {
  const raw = recipeName.trim();
  if (!raw) return "recipe.json";

  let base = stripUnsafeFilenameChars(raw)
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "")
    .replace(/\.+$/, "");

  if (!base) return "recipe.json";

  base = base
    .split(/\s+/)
    .filter(Boolean)
    .join("-");

  if (WINDOWS_RESERVED.test(base)) {
    base = `recipe-${base}`;
  }

  const max = 150;
  if (base.length > max) {
    base = base.slice(0, max).replace(/-+$/, "");
  }

  if (!base) return "recipe.json";

  return `${base}.json`;
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function saveRecipeJson(
  data: Record<string, unknown>,
  suggestedName = "recipe.json"
): Promise<void> {
  const text = JSON.stringify(data, null, 2);
  const w = window as Window &
    typeof globalThis & {
      showSaveFilePicker?: (options: {
        suggestedName?: string;
        types?: { description: string; accept: Record<string, string[]> }[];
      }) => Promise<FileSystemFileHandle>;
    };
  if (typeof w.showSaveFilePicker === "function") {
    try {
      const handle = await w.showSaveFilePicker({
        suggestedName,
        types: [
          {
            description: "JSON",
            accept: { "application/json": [".json"] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(text);
      await writable.close();
      return;
    } catch (e) {
      const err = e as { name?: string };
      if (err.name === "AbortError") return;
    }
  }
  downloadText(suggestedName, text);
}

export function readJsonFile(file: File): Promise<unknown> {
  return file.text().then((t) => JSON.parse(t) as unknown);
}
