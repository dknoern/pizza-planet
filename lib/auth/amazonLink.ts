import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../db";
import { ApiError } from "../http/errors";

export type LinkOrCreateInput = {
  amazonUserId: string;
  email: string;
  name: string;
};

export type LinkedCustomer = {
  id: string;
  email: string;
  name: string;
};

async function placeholderPasswordHash(): Promise<string> {
  // 32 random bytes hex-encoded → bcrypt. The customer never knows a password
  // that hashes to this; LWA is their only sign-in path until they set one.
  const seed = crypto.randomBytes(32).toString("hex");
  return bcrypt.hash(seed, 12);
}

export async function linkOrCreateAmazonCustomer(
  input: LinkOrCreateInput,
): Promise<LinkedCustomer> {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim() || email;

  // 1. Already linked: same Amazon user_id → return existing customer untouched.
  // Uses findFirst because amazonUserId carries an index but no DB-level uniqueness
  // (MongoDB's default unique index treats multiple nulls as a collision).
  const byAmazonId = await prisma.customer.findFirst({
    where: { amazonUserId: input.amazonUserId },
  });
  if (byAmazonId) {
    return { id: byAmazonId.id, email: byAmazonId.email, name: byAmazonId.name };
  }

  // 2. Auto-link: existing email with no Amazon link yet → attach.
  const byEmail = await prisma.customer.findUnique({ where: { email } });
  if (byEmail && !byEmail.amazonUserId) {
    try {
      const updated = await prisma.customer.update({
        where: { id: byEmail.id },
        data: { amazonUserId: input.amazonUserId },
      });
      return { id: updated.id, email: updated.email, name: updated.name };
    } catch (err) {
      throw mapDuplicateKey(err);
    }
  }

  // If the email matches but that customer is already linked to a different Amazon
  // account, do NOT touch it. Fall through to create — which will likely fail the
  // unique email constraint, and we surface a clear error.
  if (byEmail) {
    throw new ApiError(
      "AMAZON_ACCOUNT_ALREADY_LINKED",
      "An account with this email is already linked to a different Amazon account.",
      409,
    );
  }

  // 3. Create a fresh customer.
  try {
    const created = await prisma.customer.create({
      data: {
        email,
        name,
        amazonUserId: input.amazonUserId,
        passwordHash: await placeholderPasswordHash(),
      },
    });
    return { id: created.id, email: created.email, name: created.name };
  } catch (err) {
    throw mapDuplicateKey(err);
  }
}

function mapDuplicateKey(err: unknown): ApiError {
  // Prisma's MongoDB driver surfaces unique-index violations as P2002.
  const code = (err as { code?: string } | null)?.code;
  if (code === "P2002") {
    return new ApiError(
      "AMAZON_ACCOUNT_ALREADY_LINKED",
      "This Amazon account is already linked to another Pizza Planet customer.",
      409,
    );
  }
  // Re-throw unknown errors verbatim wrapped as INTERNAL so callers see them.
  return new ApiError("INTERNAL", (err as Error)?.message ?? "Unknown error", 500);
}
