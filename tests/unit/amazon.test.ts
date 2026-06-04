import { describe, it, expect, vi, afterEach } from "vitest";
import crypto from "node:crypto";
import {
  generatePkce,
  generateState,
  buildAuthorizeUrl,
  isSafeNextPath,
  exchangeCode,
  fetchProfile,
} from "@/lib/auth/amazon";
import { ApiError } from "@/lib/http/errors";

function base64urlSha256(input: string): string {
  return crypto
    .createHash("sha256")
    .update(input)
    .digest("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

describe("generatePkce", () => {
  it("produces a verifier whose SHA-256 base64url-equals the challenge", () => {
    const { verifier, challenge } = generatePkce();
    expect(challenge).toBe(base64urlSha256(verifier));
  });

  it("produces RFC 7636-compliant verifier length (43–128 chars)", () => {
    const { verifier } = generatePkce();
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(verifier.length).toBeLessThanOrEqual(128);
  });
});

describe("generateState", () => {
  it("returns ≥128 bits of entropy as base64url (no padding, no +/)", () => {
    const s = generateState();
    expect(s.length).toBeGreaterThanOrEqual(22); // 128 bits → 22 base64url chars
    expect(s).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe("buildAuthorizeUrl", () => {
  it("includes all required OAuth params and points at amazon.com/ap/oa", () => {
    const url = buildAuthorizeUrl({
      clientId: "amzn1.application-oa2-client.abc",
      redirectUri: "https://example.com/api/auth/amazon/callback",
      state: "state-xyz",
      challenge: "challenge-abc",
    });
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe("https://www.amazon.com/ap/oa");
    expect(parsed.searchParams.get("client_id")).toBe("amzn1.application-oa2-client.abc");
    expect(parsed.searchParams.get("redirect_uri")).toBe("https://example.com/api/auth/amazon/callback");
    expect(parsed.searchParams.get("response_type")).toBe("code");
    expect(parsed.searchParams.get("scope")).toBe("profile");
    expect(parsed.searchParams.get("state")).toBe("state-xyz");
    expect(parsed.searchParams.get("code_challenge")).toBe("challenge-abc");
    expect(parsed.searchParams.get("code_challenge_method")).toBe("S256");
  });

  it("allows a custom scope", () => {
    const url = buildAuthorizeUrl({
      clientId: "cid",
      redirectUri: "https://example.com/cb",
      state: "s",
      challenge: "c",
      scope: "profile postal_code",
    });
    expect(new URL(url).searchParams.get("scope")).toBe("profile postal_code");
  });
});

describe("isSafeNextPath", () => {
  it.each([
    ["/", true],
    ["/cart", true],
    ["/orders/abc-123", true],
    ["/checkout?step=2", true],
  ])("accepts %s", (p, expected) => {
    expect(isSafeNextPath(p)).toBe(expected);
  });

  it.each([
    ["//evil.com", false],
    ["/\\evil.com", false],
    ["http://evil.com", false],
    ["https://evil.com", false],
    ["javascript:alert(1)", false],
    ["", false],
    [null, false],
    [undefined, false],
    ["no-leading-slash", false],
  ])("rejects %p", (p, expected) => {
    expect(isSafeNextPath(p as string | null | undefined)).toBe(expected);
  });
});

describe("exchangeCode (mocked fetch)", () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
    vi.restoreAllMocks();
  });

  it("throws LWA_EXCHANGE_FAILED when the token endpoint returns non-2xx", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 }),
    ) as typeof fetch;

    await expect(
      exchangeCode({
        code: "c",
        codeVerifier: "v",
        clientId: "cid",
        clientSecret: "secret",
        redirectUri: "https://example.com/cb",
      }),
    ).rejects.toMatchObject({ code: "LWA_EXCHANGE_FAILED" } as ApiError);
  });

  it("returns the access token on 200", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ access_token: "at_123", expires_in: 3600 }), { status: 200 }),
    ) as typeof fetch;

    const out = await exchangeCode({
      code: "c",
      codeVerifier: "v",
      clientId: "cid",
      clientSecret: "secret",
      redirectUri: "https://example.com/cb",
    });
    expect(out.accessToken).toBe("at_123");
    expect(out.expiresIn).toBe(3600);
  });
});

describe("fetchProfile (mocked fetch)", () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
    vi.restoreAllMocks();
  });

  it("returns userId/email/name on 200", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ user_id: "amzn1.account.X", email: "a@b.com", name: "Alice" }),
        { status: 200 },
      ),
    ) as typeof fetch;

    const p = await fetchProfile("at_123");
    expect(p).toEqual({ userId: "amzn1.account.X", email: "a@b.com", name: "Alice" });
  });

  it("throws LWA_PROFILE_UNAVAILABLE on non-2xx", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("nope", { status: 500 })) as typeof fetch;
    await expect(fetchProfile("at_123")).rejects.toMatchObject({
      code: "LWA_PROFILE_UNAVAILABLE",
    } as ApiError);
  });

  it("throws LWA_PROFILE_UNAVAILABLE when user_id is missing", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ email: "a@b.com" }), { status: 200 }),
    ) as typeof fetch;
    await expect(fetchProfile("at_123")).rejects.toMatchObject({
      code: "LWA_PROFILE_UNAVAILABLE",
    } as ApiError);
  });
});
