import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/global-setup.ts"],
    // Fail a hung request instead of waiting for the default 5 s per test.
    testTimeout: 10_000,
    reporters: [
      "default",
      ["junit", { outputFile: "reports/junit.xml" }],
      // Annotations + job summary; only meaningful on GitHub Actions.
      ...(process.env.GITHUB_ACTIONS === "true" ? (["github-actions"] as const) : []),
    ],
  },
});
