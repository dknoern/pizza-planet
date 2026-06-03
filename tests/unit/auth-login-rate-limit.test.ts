import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/db", () => {
  return {
    prisma: {
      customer: {
        findUnique: vi.fn(async () => null),
      },
    },
  };
});

import { login, _resetRateLimitForTests } from "@/lib/auth/login";

describe("login rate-limit", () => {
  beforeEach(() => {
    _resetRateLimitForTests();
  });

  it("returns INVALID_CREDENTIALS for unknown email until the threshold, then RATE_LIMITED", async () => {
    const email = "ratelimit@example.com";
    for (let i = 0; i < 10; i++) {
      await expect(login({ email, password: "anything" })).rejects.toMatchObject({
        code: "INVALID_CREDENTIALS",
        status: 401,
      });
    }
    await expect(login({ email, password: "anything" })).rejects.toMatchObject({
      code: "RATE_LIMITED",
      status: 429,
    });
  });

  it("never tells the caller whether the email exists", async () => {
    await expect(login({ email: "nobody@example.com", password: "x" })).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
    });
  });
});
