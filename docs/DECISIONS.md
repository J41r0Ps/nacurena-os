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
`jaironacurena.com` moves to Cloudflare in Slice 1.

**Consequences.** Security headers and redirects have to work on a static host. Build variables
such as the Web3Forms key are set in Cloudflare as well as `.env`, and `NEXT_PUBLIC_*` values
are public by definition.

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

### Planned (not in the repository yet)

| Item | Licence | Status |
|---|---|---|
| Space Grotesk | SIL OFL 1.1 | Planned, self-hosted |
| Geist | SIL OFL 1.1 | Planned, self-hosted |
| Geist Mono | SIL OFL 1.1 | Planned, self-hosted |
| GSAP | GSAP Standard License (free, not open source) | Planned, verify at install |
| Phosphor or Lucide icons | Open licence | Planned, verify at install |
| Simple Icons | Open licence; logos are trademarks used only to name the technology | Planned, verify at install |
