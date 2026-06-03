import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../db";
import { ApiError } from "../http/errors";
import { verifyPassword } from "./password";

// Pre-computed once at module load. Compared against the submitted password
// when no customer is found, so a "wrong email" branch takes the same time as
// a "wrong password" branch and we don't leak account existence via timing.
const DUMMY_HASH = bcrypt.hashSync(
  "this-string-is-only-used-to-equalize-timing-and-will-never-match-any-real-password",
  12,
);

export const loginSchema = z
  .object({
    email: z.string().min(1),
    password: z.string().min(1),
  })
  .strict();

export type LoginInput = z.infer<typeof loginSchema>;

export type PublicCustomer = {
  id: string;
  email: string;
  name: string;
};

// Sliding-window login throttle. In-memory only — fine for single-process v1.
// A real deploy with multiple instances would back this with Redis.

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 10;

type Bucket = { failures: number[]; blockedUntil?: number };

const buckets = new Map<string, Bucket>();

export function _resetRateLimitForTests(): void {
  buckets.clear();
}

function getBucket(key: string): Bucket {
  let b = buckets.get(key);
  if (!b) {
    b = { failures: [] };
    buckets.set(key, b);
  }
  return b;
}

function pruneBucket(b: Bucket, now: number): void {
  b.failures = b.failures.filter((t) => now - t < WINDOW_MS);
}

function isBlocked(b: Bucket, now: number): boolean {
  pruneBucket(b, now);
  return b.failures.length >= MAX_FAILURES;
}

function recordFailure(b: Bucket, now: number): void {
  pruneBucket(b, now);
  b.failures.push(now);
}

function clearFailures(b: Bucket): void {
  b.failures = [];
}

export async function login(input: LoginInput): Promise<PublicCustomer> {
  const email = input.email.trim().toLowerCase();
  const now = Date.now();
  const bucket = getBucket(email);

  if (isBlocked(bucket, now)) {
    throw new ApiError(
      "RATE_LIMITED",
      "Too many failed login attempts. Please try again later.",
      429,
    );
  }

  const customer = await prisma.customer.findUnique({ where: { email } });

  // To avoid leaking whether the email exists, run a constant-time verify even
  // when there is no matching account.
  const ok = customer
    ? await verifyPassword(input.password, customer.passwordHash)
    : await verifyPassword(input.password, DUMMY_HASH);

  if (!customer || !ok) {
    recordFailure(bucket, now);
    throw new ApiError("INVALID_CREDENTIALS", "Email or password is incorrect.", 401);
  }

  clearFailures(bucket);
  return { id: customer.id, email: customer.email, name: customer.name };
}
