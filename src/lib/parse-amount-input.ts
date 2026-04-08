/**
 * Parses a number from a loose numeric field string and strips redundant leading zeros
 * (e.g. "05" → 5) so controlled inputs do not keep a leading 0 when the user types a new digit.
 */
export function parseAmountFromInput(raw: string): number {
  const t = raw.trim();
  if (t === "" || t === "-" || t === "+" || t === "." || t === "-." || t === "+.") {
    return 0;
  }
  const withoutLeadingZeros = t.replace(/^(-?)0+(?=[1-9])/, "$1");
  const n = parseFloat(withoutLeadingZeros);
  return Number.isFinite(n) ? n : 0;
}
