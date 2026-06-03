export function isLuhnValid(rawNumber: string): boolean {
  if (typeof rawNumber !== "string") return false;
  const digits = rawNumber.replace(/\s|-/g, "");
  if (!/^\d{13,19}$/.test(digits)) return false;

  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = digits.charCodeAt(i) - 48;
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}
