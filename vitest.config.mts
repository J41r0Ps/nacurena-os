import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        // Plain Node with no jsdom, so these tests also prove the domain needs no DOM to run.
        test: {
          name: "domain",
          environment: "node",
          include: ["src/os/domain/**/*.test.ts"],
        },
      },
      {
        plugins: [react()],
        test: {
          name: "ui",
          environment: "jsdom",
          // Only src/, so Vitest never picks up the Playwright specs in tests/e2e.
          include: ["src/**/*.test.{ts,tsx}"],
          exclude: ["src/os/domain/**"],
          setupFiles: ["./vitest.setup.ts"],
        },
      },
    ],
  },
});
