import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts"],
    exclude: ["tests/e2e/**", "tests/integration/**", "node_modules/**", ".next/**"],
    environment: "node",
    pool: "forks",
    testTimeout: 30_000,
    hookTimeout: 60_000,
    coverage: {
      reporter: ["text", "html"],
      include: ["lib/**/*.ts"],
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      "@/lib": fileURLToPath(new URL("./lib", import.meta.url)),
      "@/app": fileURLToPath(new URL("./app", import.meta.url)),
    },
  },
});
