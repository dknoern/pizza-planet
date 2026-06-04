import { NextResponse } from "next/server";

export type ErrorCode =
  | "VALIDATION_FAILED"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "EMAIL_TAKEN"
  | "WEAK_PASSWORD"
  | "INVALID_CREDENTIALS"
  | "RATE_LIMITED"
  | "MENU_ITEM_NOT_FOUND"
  | "ORDER_NOT_FOUND"
  | "ITEM_UNAVAILABLE"
  | "PAYMENT_DECLINED"
  | "METHOD_NOT_ALLOWED"
  | "LWA_NOT_CONFIGURED"
  | "INVALID_STATE"
  | "LWA_EXCHANGE_FAILED"
  | "LWA_PROFILE_UNAVAILABLE"
  | "AMAZON_ACCOUNT_ALREADY_LINKED"
  | "INTERNAL";

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    status: number,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export type ErrorEnvelope = {
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
};

export function toErrorEnvelope(err: ApiError): ErrorEnvelope {
  return {
    error: {
      code: err.code,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    },
  };
}

export function toResponse(err: ApiError, extraHeaders?: HeadersInit): NextResponse {
  return NextResponse.json(toErrorEnvelope(err), {
    status: err.status,
    headers: extraHeaders,
  });
}
