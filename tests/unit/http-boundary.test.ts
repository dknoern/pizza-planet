import { describe, it, expect } from "vitest";
import { z } from "zod";
import { ApiError, toErrorEnvelope, toResponse } from "@/lib/http/errors";
import { parseBody, parseQuery, strictObject } from "@/lib/http/validate";
import { withApi, methodNotAllowed } from "@/lib/http/handler";

function jsonRequest(body: unknown, url = "https://test.local/x"): Request {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("error envelope shape", () => {
  it("toErrorEnvelope wraps an ApiError into { error: { code, message } }", () => {
    const env = toErrorEnvelope(new ApiError("INTERNAL", "boom", 500));
    expect(env).toEqual({ error: { code: "INTERNAL", message: "boom" } });
  });

  it("includes details when present", () => {
    const env = toErrorEnvelope(
      new ApiError("VALIDATION_FAILED", "bad", 400, { fields: { email: ["REQUIRED"] } }),
    );
    expect(env.error.details).toEqual({ fields: { email: ["REQUIRED"] } });
  });

  it("toResponse returns JSON with the right status", async () => {
    const res = toResponse(new ApiError("UNAUTHENTICATED", "no", 401));
    expect(res.status).toBe(401);
    expect(res.headers.get("content-type")).toMatch(/application\/json/);
    expect(await res.json()).toEqual({ error: { code: "UNAUTHENTICATED", message: "no" } });
  });
});

describe("strict schemas reject unknown fields", () => {
  const schema = strictObject({ email: z.string() });

  it("parseBody returns VALIDATION_FAILED on unknown field", async () => {
    await expect(parseBody(jsonRequest({ email: "a@b.c", surprise: 1 }), schema)).rejects.toMatchObject(
      { code: "VALIDATION_FAILED", status: 400 },
    );
  });

  it("parseBody accepts valid input", async () => {
    const out = await parseBody(jsonRequest({ email: "a@b.c" }), schema);
    expect(out).toEqual({ email: "a@b.c" });
  });

  it("parseBody returns VALIDATION_FAILED on non-JSON body", async () => {
    const req = new Request("https://test.local", {
      method: "POST",
      body: "this is not json",
      headers: { "Content-Type": "application/json" },
    });
    await expect(parseBody(req, schema)).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
    });
  });

  it("parseQuery returns VALIDATION_FAILED on missing required field", () => {
    const req = new Request("https://test.local/x?other=1", { method: "GET" });
    expect(() => parseQuery(req, schema)).toThrowError(/Query string/);
  });
});

describe("withApi catches errors and returns the envelope", () => {
  it("forwards ApiError to a JSON envelope response", async () => {
    const handler = withApi(async (_req: Request) => {
      throw new ApiError("MENU_ITEM_NOT_FOUND", "nope", 404);
    });
    const res = (await handler(new Request("https://t/"))) as Response;
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      error: { code: "MENU_ITEM_NOT_FOUND", message: "nope" },
    });
  });

  it("wraps unknown errors as INTERNAL/500", async () => {
    const handler = withApi(async (_req: Request) => {
      throw new Error("kaboom");
    });
    const res = (await handler(new Request("https://t/"))) as Response;
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("INTERNAL");
  });
});

describe("methodNotAllowed returns 405 with Allow header", () => {
  it("returns 405 and lists allowed methods", async () => {
    const res = methodNotAllowed(["GET", "POST"]);
    expect(res.status).toBe(405);
    expect(res.headers.get("allow")).toBe("GET, POST");
    const body = (await res.json()) as {
      error: { code: string; details?: { allow: string[] } };
    };
    expect(body.error.code).toBe("METHOD_NOT_ALLOWED");
    expect(body.error.details?.allow).toEqual(["GET", "POST"]);
  });
});
