import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("password hashing", () => {
  it("hashes and verifies a correct password", async () => {
    const hash = await hashPassword("Pizza1234");
    expect(hash).not.toBe("Pizza1234");
    expect(hash.length).toBeGreaterThan(40);
    expect(await verifyPassword("Pizza1234", hash)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("Pizza1234");
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });

  it("safely handles empty hash", async () => {
    expect(await verifyPassword("anything", "")).toBe(false);
  });
});
