import type { NextRequest } from "next/server";
import { z, type ZodError, type ZodTypeAny } from "zod";
import { ApiError } from "./errors";

function flattenZodError(err: ZodError): Record<string, unknown> {
  const details: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const path = issue.path.length === 0 ? "_" : issue.path.join(".");
    if (!details[path]) details[path] = [];
    details[path].push(issue.message);
  }
  return details;
}

// Use z.infer<S> so we get the OUTPUT type (post-parse). Without this the
// generic resolves to the input type, which leaves `.default([])` fields
// optional and breaks downstream callers that expect the parsed shape.
export async function parseBody<S extends ZodTypeAny>(
  req: NextRequest | Request,
  schema: S,
): Promise<z.infer<S>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ApiError("VALIDATION_FAILED", "Request body must be valid JSON.", 400, {
      _: ["INVALID_JSON"],
    });
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new ApiError("VALIDATION_FAILED", "Request body failed validation.", 400, {
      fields: flattenZodError(result.error),
    });
  }
  return result.data;
}

export function parseQuery<S extends ZodTypeAny>(
  req: NextRequest | Request,
  schema: S,
): z.infer<S> {
  const url = new URL(req.url);
  const obj: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    obj[key] = value;
  });
  const result = schema.safeParse(obj);
  if (!result.success) {
    throw new ApiError("VALIDATION_FAILED", "Query string failed validation.", 400, {
      fields: flattenZodError(result.error),
    });
  }
  return result.data;
}

// Convenience: strict-object factory so callers always get unknown-field rejection.
export function strictObject<T extends z.ZodRawShape>(shape: T) {
  return z.object(shape).strict();
}
