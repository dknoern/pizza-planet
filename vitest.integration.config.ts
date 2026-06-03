import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    include: ["tests/integration/**/*.test.ts"],
    exclude: ["tests/e2e/**", "node_modules/**", ".next/**"],
    environment: "node",
    pool: "forks",
    // Each test file gets its own fork (process) and its own in-memory MongoDB
    // started by the setup file below. We disable parallelism across files so
    // the binary download (first run only) and `prisma db push` don't race.
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 120_000,
    setupFiles: ["tests/integration/setup.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      "@/lib": fileURLToPath(new URL("./lib", import.meta.url)),
      "@/app": fileURLToPath(new URL("./app", import.meta.url)),
    },
  },
});
