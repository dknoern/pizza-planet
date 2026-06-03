import type { NextRequest } from "next/server";
import { prisma } from "../db";
import { ApiError } from "../http/errors";
import { getSession } from "./session";
import { resolveApiKey } from "./apiKey";

export type AuthSource = "session" | "apiKey";

export type AuthenticatedCustomer = {
  id: string;
  email: string;
  name: string;
};

export type AuthResult = {
  customer: AuthenticatedCustomer;
  authSource: AuthSource;
};

function publicCustomer(c: {
  id: string;
  email: string;
  name: string;
}): AuthenticatedCustomer {
  return { id: c.id, email: c.email, name: c.name };
}

export async function resolveCustomer(req?: NextRequest | Request): Promise<AuthResult | null> {
  // 1. Bearer token first when the request includes one — this is the integrator path.
  const authHeader = req?.headers.get("authorization") ?? null;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice("Bearer ".length).trim();
    const customerId = await resolveApiKey(token);
    if (customerId) {
      const c = await prisma.customer.findUnique({ where: { id: customerId } });
      if (c) return { customer: publicCustomer(c), authSource: "apiKey" };
    }
  }

  // 2. Fall back to the session cookie (UI / server-component path).
  const session = await getSession();
  if (session.customerId) {
    const c = await prisma.customer.findUnique({ where: { id: session.customerId } });
    if (c) return { customer: publicCustomer(c), authSource: "session" };
  }

  return null;
}

export async function requireCustomer(req?: NextRequest | Request): Promise<AuthResult> {
  const result = await resolveCustomer(req);
  if (!result) {
    throw new ApiError("UNAUTHENTICATED", "Authentication required.", 401);
  }
  return result;
}
