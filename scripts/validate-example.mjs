/**
 * Validates example JSON files against the normative Open Recipe schema (draft 2020-12).
 * Run from repo root: node scripts/validate-example.mjs
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const schemaPath = join(root, "src", "schemas", "open-recipe.schema.json");

const schema = JSON.parse(readFileSync(schemaPath, "utf8"));

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

function check(label, data) {
  const ok = validate(data);
  if (!ok) {
    console.error(`${label} FAILED`);
    console.error(validate.errors);
    process.exitCode = 1;
    return;
  }
  console.log(`${label} OK`);
}

for (const name of ["minimal-recipe.json", "complete-recipe.json"]) {
  const path = join(root, "examples", name);
  const data = JSON.parse(readFileSync(path, "utf8"));
  check(`examples/${name}`, data);
}

check("US customary volume (ingredient line)", {
  recipe_name: "US volume check",
  base_yield: {
    amount: 1,
    "unit": "cup",
    quantity_kind: "volume",
    unit_system: "us_customary",
  },
  ingredients: [
    {
      name: "Sugar",
      amount: {
        amount: 2,
        unit: "tbsp",
        quantity_kind: "volume",
        unit_system: "us_customary",
      },
    },
  ],
  steps: [{ step: "Mix." }],
});

process.exit(process.exitCode ?? 0);
