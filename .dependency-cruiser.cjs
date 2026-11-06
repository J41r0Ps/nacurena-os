/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "domain-imports-only-domain",
      comment:
        "Clean Architecture: dependencies point inward. The domain must not know about React, " +
        "Next.js, Zustand, the UI or any package, so it may import only from itself.",
      severity: "error",
      from: { path: "^src/os/domain/", pathNot: "\\.test\\.ts$" },
      to: { pathNot: "^src/os/domain/" },
    },
    {
      name: "domain-not-to-test-files",
      comment: "Production domain code must never depend on test code.",
      severity: "error",
      from: { path: "^src/os/domain/", pathNot: "(\\.test|testSupport)\\.ts$" },
      to: { path: "^src/os/domain/.*(\\.test|testSupport)\\.ts$" },
    },
    {
      name: "domain-tests-import-only-domain-and-test-tools",
      comment: "Domain tests get their test tools and nothing else from outside the domain.",
      severity: "error",
      from: { path: "^src/os/domain/.*\\.test\\.ts$" },
      to: { pathNot: "^(src/os/domain/|node_modules/(vitest|fast-check)/)" },
    },
  ],
  options: {
    // Essential: without this, `import type` is erased before the check and slips through.
    tsPreCompilationDeps: true,
    // Lets the check resolve the "@/" alias, so an alias cannot hide an outward import.
    tsConfig: { fileName: "tsconfig.json" },
    doNotFollow: { path: "node_modules" },
  },
};
