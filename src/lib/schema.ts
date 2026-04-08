import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import type { ErrorObject, ValidateFunction } from "ajv";

export type { ErrorObject };

export function compileValidator(schema: object): ValidateFunction {
  const ajv = new Ajv2020({
    allErrors: true,
    strict: false,
    validateFormats: true,
  });
  addFormats(ajv);
  return ajv.compile(schema);
}

export function formatAjvErrors(errors: ErrorObject[] | null | undefined): string[] {
  if (!errors?.length) return [];
  return errors.map((e) => {
    const path = e.instancePath || "(root)";
    const msg = e.message ?? "invalid";
    return `${path}: ${msg}`;
  });
}
