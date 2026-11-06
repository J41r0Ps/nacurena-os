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
    {
      name: "outer-layers-use-the-domain-public-api",
      comment:
        "index.ts exports Window as a type only, so code outside the domain can read windows but " +
        "never build one. Reaching past it would undo that.",
      severity: "error",
      from: { path: "^src/", pathNot: "^src/os/domain/" },
      to: { path: "^src/os/domain/", pathNot: "^src/os/domain/index\\.ts$" },
    },
    {
      name: "store-does-not-know-the-ui",
      comment:
        "The store is an adapter over the domain. React and the page depend on it, not the reverse.",
      severity: "error",
      from: { path: "^src/os/store/" },
      to: { path: "^(src/(app|apps|ui)/|node_modules/(react|react-dom|next|gsap)/)" },
    },
    {
      name: "routing-rules-stay-pure",
      comment:
        "The rules that connect a URL to the desktop are plain functions, tested without a browser. " +
        "They may read the domain and nothing further out.",
      severity: "error",
      from: { path: "^src/os/routing/" },
      to: { pathNot: "^(src/os/(routing|domain)/|node_modules/vitest/)" },
    },
    {
      name: "client-island-has-no-translation-runtime",
      comment:
        "ADR-011: the server resolves every string and the browser receives plain text. An import " +
        "here would ship the next-intl message runtime in First Load JS.",
      severity: "error",
      from: { path: "^src/ui/", pathNot: "\\.test\\.tsx?$" },
      to: { path: "^(src/i18n/|node_modules/(next-intl|use-intl)/)" },
    },
    {
      name: "registry-stays-readable-on-the-server",
      comment:
        "The routes read the registry in a Server Component, where client icons crash, because " +
        "they call createContext.",
      severity: "error",
      from: { path: "^src/apps/registry\\.ts$" },
      to: { path: "^(src/ui/|node_modules/(react|@phosphor-icons)/)" },
    },
    {
      name: "only-the-store-and-its-hooks-use-zustand",
      comment: "Keeps the state library behind one adapter, so components cannot grow a second store.",
      severity: "error",
      from: { path: "^src/", pathNot: "^src/(os/store/|ui/desktop/desktopContext\\.ts$)" },
      to: { path: "^node_modules/zustand/" },
    },
    {
      name: "only-window-motion-imports-gsap",
      comment: "One file, reached by dynamic import, keeps GSAP out of First Load JS.",
      severity: "error",
      from: { path: "^src/", pathNot: "^src/ui/motion/windowMotion\\.ts$" },
      to: { path: "^node_modules/gsap/" },
    },
    {
      name: "window-motion-loads-lazily",
      comment: "A static import of this file would pull GSAP back into First Load JS.",
      severity: "error",
      from: { path: "^src/" },
      to: { path: "^src/ui/motion/windowMotion\\.ts$", dynamic: false },
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
