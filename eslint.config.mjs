import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Plain ECMAScript, so the domain's no-DOM tsconfig cannot catch these. Randomness and
    // the clock are injected from outside, which keeps the domain deterministic.
    files: ["src/os/domain/**/*.ts"],
    ignores: ["src/os/domain/**/*.test.ts"],
    rules: {
      "no-restricted-properties": [
        "error",
        { object: "Math", property: "random", message: "Inject ids from outside the domain." },
        { object: "Date", property: "now", message: "Inject the time from outside the domain." },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "NewExpression[callee.name='Date']",
          message: "Inject the time from outside the domain.",
        },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
    // Third-party skills: not our code, and not ours to reformat.
    ".claude/**",
  ]),
]);

export default eslintConfig;
