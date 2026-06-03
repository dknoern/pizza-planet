// Vitest setupFile for integration tests.
//
// Boots an in-memory MongoDB before the test file's imports run, so that when
// `@/lib/db` imports PrismaClient it sees a valid DATABASE_URL. Each test file
// runs in its own fork (pool=forks) so each gets its own ephemeral Mongo.
//
// First-run downloads the MongoDB binary (~200MB cached in
// ~/.cache/mongodb-binaries). Subsequent runs reuse it.

import { execSync } from "node:child_process";
import path from "node:path";
import { afterAll } from "vitest";
import { MongoMemoryReplSet } from "mongodb-memory-server";

// Provide harmless defaults so lib/db, lib/auth/session, lib/ordering/guestToken
// don't blow up when imported.
process.env.SESSION_SECRET ??= "x".repeat(48);
process.env.GUEST_TOKEN_SECRET ??= "y".repeat(48);
process.env.PAYMENT_SIM_MODE ??= "simulator";
// process.env.NODE_ENV is typed readonly by @types/node — bypass via cast.
(process.env as Record<string, string | undefined>).NODE_ENV ??= "test";

// Prisma's MongoDB connector requires a replica set, even for a single node,
// because it uses change-streams / transactions internally.
const mongo = await MongoMemoryReplSet.create({
  replSet: { count: 1 },
});

const uri = mongo.getUri("pizza-planet-test");
process.env.DATABASE_URL = uri;

// Apply the schema so unique indexes (Customer.email, Order.orderNumber,
// ApiKey.tokenHash) are created. `db push` is the supported way for the
// MongoDB connector.
const root = path.resolve(__dirname, "..", "..");
try {
  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    cwd: root,
    stdio: "ignore",
    env: { ...process.env, DATABASE_URL: uri },
  });
} catch (err) {
  console.error("[integration:setup] prisma db push failed", err);
  throw err;
}

afterAll(async () => {
  await mongo.stop();
});
