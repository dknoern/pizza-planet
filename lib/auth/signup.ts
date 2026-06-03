import { z } from "zod";
import { prisma } from "../db";
import { ApiError } from "../http/errors";
import { hashPassword } from "./password";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const signupSchema = z
  .object({
    email: z.string().min(3).max(254).regex(EMAIL_REGEX, "Invalid email format."),
    password: z.string().min(1),
    name: z.string().min(1).max(120),
  })
  .strict();

export type SignupInput = z.infer<typeof signupSchema>;

export type PublicCustomer = {
  id: string;
  email: string;
  name: string;
};

export function isStrongPassword(pw: string): boolean {
  return pw.length >= 8 && /[A-Za-z]/.test(pw) && /\d/.test(pw);
}

export async function signup(input: SignupInput): Promise<PublicCustomer> {
  if (!isStrongPassword(input.password)) {
    throw new ApiError(
      "WEAK_PASSWORD",
      "Password must be at least 8 characters and contain a letter and a digit.",
      400,
    );
  }

  const email = input.email.trim().toLowerCase();

  const existing = await prisma.customer.findUnique({ where: { email } });
  if (existing) {
    throw new ApiError("EMAIL_TAKEN", "An account with that email already exists.", 409);
  }

  const passwordHash = await hashPassword(input.password);
  const created = await prisma.customer.create({
    data: { email, passwordHash, name: input.name.trim() },
  });

  return { id: created.id, email: created.email, name: created.name };
}
