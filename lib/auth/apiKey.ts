import crypto from "node:crypto";
import { prisma } from "../db";

const PREFIX = "pp_live_";

function generateToken(): string {
  return PREFIX + crypto.randomBytes(24).toString("hex");
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export type IssuedApiKey = {
  id: string;
  token: string;
  label: string;
};

export async function issueApiKey(customerId: string, label = "default"): Promise<IssuedApiKey> {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const record = await prisma.apiKey.create({
    data: { customerId, tokenHash, label },
  });
  return { id: record.id, token, label };
}

export async function resolveApiKey(token: string): Promise<string | null> {
  if (!token || !token.startsWith(PREFIX)) return null;
  const tokenHash = hashToken(token);
  const key = await prisma.apiKey.findUnique({ where: { tokenHash } });
  if (!key || key.revokedAt) return null;
  return key.customerId;
}
