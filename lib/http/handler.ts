import { NextResponse } from "next/server";
import { ApiError, toErrorEnvelope, toResponse } from "./errors";

type AnyHandler = (...args: never[]) => Promise<Response | NextResponse>;

export function withApi<H extends AnyHandler>(handler: H): H {
  return (async (...args: Parameters<H>) => {
    try {
      return await handler(...args);
    } catch (err) {
      if (err instanceof ApiError) {
        return toResponse(err);
      }
      console.error("[api] unhandled error", err);
      const wrapped = new ApiError("INTERNAL", "Internal server error.", 500);
      return NextResponse.json(toErrorEnvelope(wrapped), { status: 500 });
    }
  }) as H;
}

export function methodNotAllowed(allowed: readonly string[]): NextResponse {
  return NextResponse.json(
    toErrorEnvelope(
      new ApiError("METHOD_NOT_ALLOWED", "HTTP method not allowed.", 405, {
        allow: [...allowed],
      }),
    ),
    {
      status: 405,
      headers: { Allow: allowed.join(", ") },
    },
  );
}
