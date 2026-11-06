# Decisions

Each ADR follows context → decision → consequences. The licence audit is at the end.

## ADR-001: Concept and stack

**Context.** The portfolio has to show real software engineering, be readable without
JavaScript and by crawlers, and close known gaps in state management, React performance and
React testing. An earlier version returned an empty `<div id="root">`.

**Decision.** Build NacurenaOS, a desktop operating system in the browser where projects,
story, CV and contact are apps. Use Next.js (App Router, static export) with strict TypeScript,
React, Tailwind CSS 4, Zustand, GSAP, next-intl, a small WebGL shader for the wallpaper, Vitest,
React Testing Library and Playwright. The window manager is a pure TypeScript domain with
dependencies pointing inward. There is no backend.

**Consequences.** Every app needs a real server-rendered URL, so the window state has to work
with static HTML. A window manager costs more than a plain site, but it is the engineering work
the portfolio exists to show. Exact versions and peer dependencies are checked at install time.

## ADR-002: Solo trunk-based workflow on main

**Context.** This is a solo project. Feature branches and pull requests add ceremony with no
second reviewer, and Gitflow is already practised in the course.

**Decision.** All work happens on `main`. Jairo reviews and makes every commit and push; Claude
Code does not commit. CI is the safety net: every push runs all checks and deploys only if they
pass. Releases are tagged.

**Consequences.**
- A bad push reaches `main` directly, so the checks have to catch it before deployment.
- `docs/BRIEF.md` §4 and §9 still mention a `develop` preview, checks on PRs and `release/1.0`.
  This ADR takes precedence, and Slice 1 has to define previews without a `develop` branch.
- `.claude/settings.json` denies `git commit` and `git push` for the Bash and PowerShell tools.
  These rules stop the usual forms, not every form: `git -C . push` is not matched, so the deny
  rules back up the workflow rule and do not replace review.
- Attribution uses the object form, not `"attribution": false`. The `false` form needs Claude
  Code v2.1.281, and older versions skip the whole settings file, deny rules included.

## ADR-003: Dual licence

**Context.** The code is meant to be readable and reusable. The writing, photos, CVs and logo
are personal and should not be reusable under a code licence.

**Decision.** MIT for code (`LICENSE`). All rights reserved for writing, photos, CVs, logo and
design assets (`LICENSE-CONTENT.md`). Third-party skills keep their own licences
(`THIRD_PARTY_NOTICES.md`).

**Consequences.** `LICENSE` stays the unmodified MIT text so tools can detect it; its code-only
scope is stated in `LICENSE-CONTENT.md` and the README. Every new asset or dependency is checked
in the audit below before it is used.

## ADR-004: Cloudflare Pages

**Context.** The site is a static export and needs hosting with deployment from CI. The Software
Engineering course uses the same host.

**Decision.** Host on Cloudflare Pages, deployed through GitHub Actions. DNS for
`jaironacurena.com` moved to Cloudflare nameservers in Slice 1, and Namecheap stays the registrar.

**Consequences.** Security headers and redirects have to work on a static host. Build variables
such as the Web3Forms key are set in Cloudflare as well as `.env`, and `NEXT_PUBLIC_*` values
are public by definition (ADR-006 replaces the Cloudflare part). `J41r0Ps.github.io` served the
domain before the move and is retired.

## ADR-005: Static export and a single CI gate

**Context.** The site must be real HTML for crawlers and readers without JavaScript, and needs no
server at runtime. Work goes straight to `main` (ADR-002), so CI is the only check before a
deployment. A deployment needs one clear answer to "did everything pass?", and that answer must
stay reliable as checks are added.

**Decision.**
- Next.js builds with `output: 'export'`, `images.unoptimized` and `trailingSlash`, so the result
  is the plain files in `out/`. Pages stay Server Components, rendered at build time, unless they
  need state, effects, event handlers or browser APIs.
- Fonts use `next/font/google`, which downloads them at build time and serves them from our own
  origin. Visitors never contact Google.
- CI runs `lint`, `typecheck`, `unit` and `build` in parallel. `e2e` tests the artifact from
  `build`, so it covers the exact files a deployment will publish.
- A separate `ci-ok` job needs all the others, runs with `if: always()` and fails unless every
  result is `success`. Slice 1b depends on this job only.
- Actions are pinned to full commit SHAs with a version comment, because a tag can be moved and a
  commit SHA cannot. The token is `contents: read`.

**Consequences.**
- A job whose `needs` failed is skipped, and a skipped required check counts as passing. That is
  why the gate needs `if: always()`, and why it also treats `skipped` as a failure.
- A new check changes only the `needs` list of `ci-ok`, not the deployment or the branch rules.
- Features that need a server are unavailable: Next.js headers, redirects, Server Actions, ISR and
  the image optimizer. Security headers will have to come from the host.
- The build needs network access to fetch the fonts.
- `next-env.d.ts` is gitignored, and `LayoutProps` only exists once route types are generated, so
  `pretypecheck` runs `next typegen`. Without it the CI `typecheck` job would fail.
- `next.config.ts` sets `agentRules: false`, because `next dev` otherwise creates `AGENTS.md` when
  it detects an AI agent. Agent rules live in `CLAUDE.md`.
- Latest versions are not all usable. Each cap below can be lifted once its cause goes away:

| Package | Held at | Latest | Cause |
|---|---|---|---|
| `typescript` | `~6.0.3` | 7.0.2 | `typescript-eslint`, inside `eslint-config-next`, requires `<6.1.0` |
| `eslint` | `^9.39.5` | 10.14.0 | `eslint-plugin-react`, `-import` and `-jsx-a11y` stop at ESLint 9. npm reports 9.39.5 as no longer supported, so revisit this when those plugins add ESLint 10 |
| `jsdom` | `^29.1.1` | 31.0.0 | jsdom 30 and later need Node `^24.15`; the development machine runs 24.8.0 |
| `@types/node` | `^24` | 26.x | Matches the Node major in `.nvmrc` |

## ADR-006: Direct upload from CI

**Context.** Cloudflare Pages can deploy in two ways. With Git integration, Cloudflare watches the
repository, then builds and publishes by itself. With direct upload, something else builds the
site and sends Cloudflare the finished files. ADR-005 makes `ci-ok` the only check before a
deployment, and has `e2e` test the exact files that a deployment will publish.

**Decision.** The Pages project `nacurena-os` uses direct upload. A `deploy` job in
`.github/workflows/ci.yml` runs only on a push to `main` after `ci-ok` succeeds. It downloads the
`site` artifact and publishes it with Wrangler through `cloudflare/wrangler-action`.

Git integration would break both guarantees. Cloudflare would build at the same time as CI, so a
failed check could not stop a deployment. It would also publish its own rebuild, not the files
`e2e` tested.

The job has no checkout, so no repository code runs beside the Cloudflare secrets. It has
`permissions: {}`, and it is the only job that references those secrets.

**Consequences.**
- Cloudflare's documentation says a direct upload project cannot switch to Git integration later.
  Moving would need a new project.
- Cloudflare does not build, so build variables set in Cloudflare have no effect. This replaces
  ADR-004 and `docs/BRIEF.md` §8 on that point: `NEXT_PUBLIC_*` values such as the Web3Forms key
  must be set on the `build` job, or the site ships without them.
- Branch previews are not automatic. ADR-002 left previews open and the OWASP ZAP scan needs a
  target, so a later slice still has to define them.
- A long-lived Cloudflare API token is stored in GitHub. It should only allow editing Cloudflare
  Pages. It and the account ID are secrets of the `production` environment, not repository secrets,
  and that environment is restricted to `main`, so a workflow on another branch cannot read them.
- Cancelling a workflow run stops all of its jobs, so the workflow-level `cancel-in-progress` is off
  for `main`. Runs on `main` queue and finish in order, which also stops an older commit from
  overwriting a newer deployment. A deploy that is waiting can be replaced by a newer one; a running
  deploy cannot be cancelled by a newer push.
- `wrangler-action` defaults to the floating range `4`, so `wranglerVersion` is pinned in `ci.yml`.
  Dependabot does not read that input, so it is updated by hand.
- `--branch=main` publishes to production only while the project's production branch is `main`.
  Otherwise Cloudflare creates a preview and the job still passes.
- `environment.url` is `https://jaironacurena.com`, the custom domain of the Pages project.
  `nacurena-os.pages.dev` serves the same deployment.
- Rollback is through the Cloudflare dashboard, or by re-running `deploy` on an older run while its
  artifact still exists (7 days).

## ADR-007: Window manager domain and architecture enforcement

**Context.** The window manager has rules that must hold however the UI behaves, such as "a
minimised window is never focused" (`docs/DOMAIN.md`). The domain must stay pure TypeScript so it
can be tested on its own, and that has to be enforced, because a rule nobody checks erodes quietly.
Slice 3 puts the domain behind a Zustand store with persistence.

**Decision.**

*Style: immutable classes.* `WindowManager` is an aggregate root with a private constructor, and
every command returns a new instance. The alternative was plain readonly data with pure functions.
Plain data persists for free, but that advantage is small: localStorage is untrusted input, so
loading needs a validating step in either style. Zustand's default `persist` merge would otherwise
put saved data into state and skip every invariant. A class costs one extra `toSnapshot()`, and in
return the compiler enforces that the aggregate is the only way to change windows. Instances stay
immutable because Zustand and React detect change by comparing references.

*Errors: a `Result` type for expected failures, exceptions only for bugs.* A `Result` appears in
the signature, so the compiler forces the caller to handle it, and it cannot crash a React render.
`DomainError` has codes, not English text, so the UI can translate it. A command that cannot apply
as asked has three outcomes: a normal gesture is **clamped**, a repeat is a **no-op** that returns
the same instance, and only what the UI must never send is an **error**.

*IDs: a generator passed to `openApp`.* Aggregates hold state, not services, so the generator is a
parameter, called only when a window is really created. Tests pass a counter and Slice 3 passes a
real generator from infrastructure. A duplicate id is an error, which catches a counter that
restarts after saved windows are restored. `AppId` and `WindowId` are branded strings.

*Modelling.* A maximised window's size is derived from the viewport, not stored, so it cannot go
stale and restore cannot lose the previous bounds. Z-order is a per-window integer where the next
value is the highest plus one, so focusing changes one window object and not all of them.

*Enforcement: three layers, because each one misses something the next one catches.*
- dependency-cruiser checks imports (`npm run arch`). It was chosen over `eslint-plugin-boundaries`
  because it reads the real resolved import graph, and because an `// eslint-disable` comment cannot
  switch it off. `tsPreCompilationDeps` is essential: without it, `import type` passes unnoticed.
- `src/os/domain/tsconfig.json` has no DOM lib and `types: []`, so browser and Node globals fail to
  compile (also `npm run arch`). `types: []` is the important half, because `@types/node` would
  otherwise provide `process`, `console`, `crypto` and `fetch`.
- ESLint bans `Math.random`, `Date.now` and `new Date` in non-test domain files. They are plain
  ECMAScript, so the tsconfig cannot see them.

**Consequences.**
- `arch` is a new CI job and is in the `needs` of `ci-ok`, which extends ADR-005.
- Domain tests may import `vitest` and `fast-check` and nothing else from outside the domain. The
  domain tsconfig excludes them, because Vitest pulls `@types/node` back in, so the root `tsc`
  type-checks them instead.
- Vitest has two projects. Domain tests run in plain Node, so they also prove the domain needs no
  DOM at runtime.
- Slice 3 must load saved state through `WindowManager.fromSnapshot`, and call `resizeViewport`
  afterwards, because the saved viewport may not match the current one.
- The adapter must round drag values, because `Position` and `Size` accept whole pixels only. This
  keeps `equals` exact and the clamping free of float drift.
- INV-04 means there is always a focused window while one is visible. "Click the desktop to
  unfocus" would need that rule relaxed on purpose.
- `Window` shares its name with the DOM type, so outer layers may want to import it under an alias.
- The property test uses a random seed on each run, so a failure can appear on an unrelated push.
  That is a real bug, and fast-check prints the seed to replay it.

## ADR-008: npm overrides for audit findings

**Context.** `npm audit` reported 10 findings (8 moderate, 2 high), all in development-only packages
and none in `out/`. They came from two vulnerable packages; the other eight findings were packages
that depend on them:

| Package | Advisory | Severity | Why a normal update could not fix it |
|---|---|---|---|
| `compression` 1.8.1 | GHSA-vc2v-76pw-4v95, denial of service | High | `serve` 14.2.6 is the latest version and pins exactly 1.8.1 |
| `minimatch` 10.2.6 | GHSA-g3hv-75wg-m249, denial of service | Moderate | `@typescript-eslint/typescript-estree` 8.72.1 is the latest version and asks for `^10.2.2`. The fix starts at 11.0.1 and has no 10.x backport |

`serve` runs only for `npm run preview` and the e2e tests, on a local port. The findings were
therefore a low practical risk, but a noisy audit hides the next finding that matters.

**Decision.**
- `package.json` overrides `compression` to `1.8.2` under `serve`, and `minimatch` to `^11.0.5` under
  `@typescript-eslint/typescript-estree`.
- Each override is scoped to its parent. A global `minimatch` override would also move `eslint`,
  `eslint-plugin-react` and others off 3.1.5, which the advisory does not affect.
- `npm audit fix --force` was rejected. It would downgrade `serve` to 10.0.2 and
  `eslint-config-next` to 15.5.29, which no longer matches `next` 16.
- The ADR-005 caps are unchanged: TypeScript stays on `~6.0.3` and ESLint on 9.

**Consequences.**
- `minimatch` 11 is outside the range `typescript-estree` declares. That package calls it in one
  place, for `allowDefaultProject`, which neither `eslint.config.mjs` nor `eslint-config-next`
  enables. `npm run lint` therefore does not exercise the call, so a future `allowDefaultProject`
  setting should be tested against this override.
- `minimatch` 11 needs Node 20 or 22 and later. `.nvmrc` is on 24.
- Two development-only packages arrive with these versions: `@isaacs/nonrecursive-glob-match`
  (BlueOak-1.0.0, the same licence as `minimatch`) and `destroy` (MIT).
- An override silently keeps applying after its reason has gone, and nothing here flags that:
  Dependabot watches only GitHub Actions and CI does not run `npm audit`. Check these when updating
  `serve` or `eslint-config-next`.
- Remove the `compression` override when `serve` depends on 1.8.2 or later. Remove the `minimatch`
  override when `typescript-estree` accepts a fixed version.

## Asset and dependency licence audit

Audited 6 November 2026. "Commit" is the upstream revision the installed files were compared
against.

### Design skills (in the repository)

| Item | Licence | Upstream | Commit | Verified |
|---|---|---|---|---|
| Emil Kowalski skills (7): `emil-design-eng`, `animate`, `review-animations`, `animation-performance`, `find-animation-opportunities`, `mobile-native`, `break-ui` | MIT | `emilkowalski/skills` | `c8a79627b59d72d764d6ab6f2c87c09a48169833` | All 10 files identical to this commit |
| Taste, `design-taste-frontend` | MIT (Leonxlnx), in a repository that is Apache-2.0 | `nexu-io/open-design`, `skills/taste-skill/` | `20c49e75c9164bb592cfc299d366884ed79f9914` | `SKILL.md` identical to this commit |
| Impeccable skill v4.8.0 and 4 agents | Apache-2.0, with NOTICE | `pbakaus/impeccable`, tag `skill-v4.8.0` | `414603bf14c7a344edb466bb1f85690c77ce8b7d` | All 58 skill files and 4 agents identical, except that `scripts/impeccable.cmd` has CRLF line endings |

### Bundled inside Impeccable

| Item | Licence | Upstream | Notes |
|---|---|---|---|
| `modern-screenshot.umd.js` | MIT | `qq15725/modern-screenshot` | Minified with no licence header. The bundled version is not recorded in the file |
| `reference/ios.md`, `reference/android.md` | MIT | `ehmo/platform-design-skills`, HEAD `dc2be825d8b439caea78e9eaa8fb3ac23b0ff3e9` | Distilled from this work, per Impeccable's NOTICE |
| `scripts/data/font-index.json` | Not stated | Built by Impeccable from the Google Fonts catalog | Family names and numeric fingerprints only, no font files |
| `scripts/bin/` engine v0.1.18 (Windows `.exe`) | Not checked | `pbakaus/impeccable` | Gitignored; the launcher re-downloads a checksum-verified copy |

### Fonts (shipped in `out/`)

| Item | Licence | Notes |
|---|---|---|
| Space Grotesk | SIL OFL 1.1 | Self-hosted through `next/font/google` |
| Geist | SIL OFL 1.1 | Self-hosted through `next/font/google` |
| Geist Mono | SIL OFL 1.1 | Self-hosted through `next/font/google` |

### npm dependencies: runtime

Versions are the ones installed from `package-lock.json`.

| Package | Version | Licence |
|---|---|---|
| `next` | 16.4.5 | MIT |
| `react` | 19.3.1 | MIT |
| `react-dom` | 19.3.1 | MIT |

### npm dependencies: development only (never shipped in `out/`)

| Package | Version | Licence |
|---|---|---|
| `@axe-core/playwright` | 4.14.0 | MPL-2.0 |
| `@playwright/test` | 1.65.0 | Apache-2.0 |
| `@tailwindcss/postcss` | 4.3.4 | MIT |
| `@testing-library/dom` | 10.4.2 | MIT |
| `@testing-library/jest-dom` | 7.0.1 | MIT |
| `@testing-library/react` | 16.3.3 | MIT |
| `@types/node` | 24.19.2 | MIT |
| `@types/react` | 19.3.0 | MIT |
| `@types/react-dom` | 19.3.0 | MIT |
| `@vitejs/plugin-react` | 6.2.1 | MIT |
| `dependency-cruiser` | 18.7.2 | MIT |
| `eslint` | 9.39.5 | MIT |
| `eslint-config-next` | 16.4.5 | MIT |
| `fast-check` | 4.10.2 | MIT |
| `jsdom` | 29.1.1 | MIT |
| `serve` | 14.2.6 | MIT |
| `tailwindcss` | 4.3.4 | MIT |
| `typescript` | 6.0.3 | Apache-2.0 |
| `vite` | 8.3.6 | MIT |
| `vitest` | 5.1.0 | MIT |

### Transitive npm packages

540 packages were installed on Windows and checked from `package-lock.json`. Almost all are MIT,
Apache-2.0, ISC or BSD. Other platforms install their own native binaries, which were not checked
individually. `dependency-cruiser` and `fast-check` added 26 of these in Slice 2 (24 MIT, 2 ISC),
none with an install script. These need a note:

| Package | Licence | Why it is acceptable |
|---|---|---|
| `axe-core`, `@axe-core/playwright` | MPL-2.0 | Development only, and used unmodified |
| `lightningcss`, `lightningcss-win32-x64-msvc` | MPL-2.0 | Build tool, used unmodified; its output is our CSS |
| `@img/sharp-win32-x64` | Apache-2.0 AND LGPL-3.0-or-later | Optional dependency of `next`. Static export does not use the image optimizer, and nothing from it is in `out/` |
| `caniuse-lite` | CC-BY-4.0 | Browser data used at build time; not in `out/` |
| `@csstools/color-helpers`, `@csstools/css-syntax-patches-for-csstree` | MIT-0 | Development only; permissive |
| `language-subtag-registry`, `mdn-data` | CC0-1.0 | Development only; public-domain dedication |

### GitHub Actions and CI tools (run in CI, never shipped in `out/`)

| Item | Version | Licence | Notes |
|---|---|---|---|
| `actions/checkout` | v7.0.1 | MIT | Pinned to a commit SHA |
| `actions/setup-node` | v7.1.0 | MIT | Pinned to a commit SHA |
| `actions/upload-artifact` | v7.0.2 | MIT | Pinned to a commit SHA |
| `actions/download-artifact` | v8.0.2 | MIT | Pinned to a commit SHA |
| `cloudflare/wrangler-action` | v4.1.3 | Apache-2.0 | Pinned to `953926a2e2182532811c01a25e53647d93bf07c0` |
| `wrangler` | 4.158.0 | MIT OR Apache-2.0 | Installed by the action during `deploy`, so it is not in `package-lock.json` |

Wrangler's lockfile lists 91 packages across all platforms, checked from a sandbox install. Almost
all are MIT, Apache-2.0, ISC, 0BSD or CC0-1.0. These need a note:

| Package | Licence | Why it is acceptable |
|---|---|---|
| `@img/sharp-libvips-*` (10 packages) | LGPL-3.0-or-later | Platform binaries pulled in by Wrangler. They run in CI only, are used unmodified and are not in `out/` |
| `@img/sharp-win32-*`, `@img/sharp-wasm32` | Apache-2.0 AND LGPL-3.0-or-later (`wasm32` also MIT) | Same reason |

### Planned (not in the repository yet)

| Item | Licence | Status |
|---|---|---|
| GSAP | GSAP Standard License (free, not open source) | Planned, verify at install |
| Phosphor or Lucide icons | Open licence | Planned, verify at install |
| Simple Icons | Open licence; logos are trademarks used only to name the technology | Planned, verify at install |
