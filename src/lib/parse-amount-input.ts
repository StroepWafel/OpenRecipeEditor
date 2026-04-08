/**
 * Allows only non-negative decimal text: digits and at most one `.`.
 * Strips `-`, letters, and other symbols (including pasted content).
 */
export function filterDecimalAmountInput(raw: string): string {
  let s = raw.replace(/[^\d.]/g, "");
  const firstDot = s.indexOf(".");
  if (firstDot === -1) return s;
  const intPart = s.slice(0, firstDot);
  const fracPart = s.slice(firstDot + 1).replace(/\./g, "");
  return `${intPart}.${fracPart}`;
}

/**
 * Parses a number from a loose numeric field string and strips redundant leading zeros
 * (e.g. "05" → 5) so controlled inputs do not keep a leading 0 when the user types a new digit.
 */
export function parseAmountFromInput(raw: string): number {
  const t = raw.trim();
  if (t === "" || t === ".") {
    return 0;
  }
  const withoutLeadingZeros = t.replace(/^0+(?=[1-9])/, "");
  const n = parseFloat(withoutLeadingZeros);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}
