import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import type { ErrorObject, ValidateFunction } from "ajv";

import { formatInterpretedAjvErrors } from "./ajv-error-interpreter";

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

/** Plain-language validation lines for UI or logs. */
export function formatAjvErrors(errors: ErrorObject[] | null | undefined): string[] {
  return formatInterpretedAjvErrors(errors);
}
