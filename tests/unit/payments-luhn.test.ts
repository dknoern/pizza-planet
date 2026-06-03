import { describe, it, expect } from "vitest";
import { isLuhnValid } from "@/lib/payments/luhn";

describe("Luhn validation", () => {
  it("accepts the standard test card 4111 1111 1111 1111", () => {
    expect(isLuhnValid("4111 1111 1111 1111")).toBe(true);
    expect(isLuhnValid("4111111111111111")).toBe(true);
  });

  it("accepts the decline test card 4000 0000 0000 0002", () => {
    expect(isLuhnValid("4000 0000 0000 0002")).toBe(true);
  });

  it("rejects numbers that fail the checksum", () => {
    expect(isLuhnValid("4111 1111 1111 1112")).toBe(false);
  });

  it("rejects too-short / too-long inputs", () => {
    expect(isLuhnValid("4")).toBe(false);
    expect(isLuhnValid("1".repeat(20))).toBe(false);
  });

  it("rejects non-digit input", () => {
    expect(isLuhnValid("hello")).toBe(false);
    expect(isLuhnValid("")).toBe(false);
  });
});
