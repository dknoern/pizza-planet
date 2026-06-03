export function maskPan(rawNumber: string): string {
  if (typeof rawNumber !== "string") return "**** **** **** ****";
  const digits = rawNumber.replace(/\s|-/g, "");
  const last4 = digits.slice(-4).padStart(4, "*");
  return `**** **** **** ${last4}`;
}

export function maskedFromLast4(last4: string): string {
  const safe = (last4 ?? "").toString().slice(-4).padStart(4, "*");
  return `**** **** **** ${safe}`;
}
