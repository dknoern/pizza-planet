// Issue a Pizza Planet API key for an existing customer.
//
// Usage:
//   pnpm tsx scripts/issue-api-key.ts <email> [label]
//
// Example:
//   pnpm tsx scripts/issue-api-key.ts alice@example.com swagger-ui
//
// The plaintext token is printed ONCE. Only its sha256 hash is stored in
// Mongo, so there is no way to recover it later — copy it now.

import { prisma } from "@/lib/db";
import { issueApiKey } from "@/lib/auth/apiKey";

async function main() {
  const [email, label = "default"] = process.argv.slice(2);

  if (!email) {
    console.error("Usage: pnpm tsx scripts/issue-api-key.ts <email> [label]");
    process.exitCode = 2;
    return;
  }

  const customer = await prisma.customer.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
  if (!customer) {
    console.error(`No customer found with email "${email}". Sign up first at /account/signup.`);
    process.exitCode = 1;
    return;
  }

  const issued = await issueApiKey(customer.id, label);

  console.log("");
  console.log("API key issued.");
  console.log("---------------------------------------------------------------");
  console.log(`  customer:  ${customer.email}  (id ${customer.id})`);
  console.log(`  label:     ${issued.label}`);
  console.log(`  key id:    ${issued.id}`);
  console.log("");
  console.log("  TOKEN (copy now — will not be shown again):");
  console.log("");
  console.log(`     ${issued.token}`);
  console.log("");
  console.log("Use it as:  Authorization: Bearer " + issued.token);
  console.log("---------------------------------------------------------------");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
