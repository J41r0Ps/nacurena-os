# NacurenaOS — Portfolio v3 Brief & Plan

> Single source of truth for building Jairo Nacurena's portfolio.
> Roles: **Jairo** decides, learns and reviews · **Claude Code** implements in the repo ·
> **Claude (chat)** is the planning manager: writes slice prompts, answers concept questions.
>
> Last updated: 6 November 2026 (v3.1 — restart after first Claude Code run) · Target: **v1.0.0 live by ~20 December 2026**

---

## 1. The concept

**NacurenaOS** — a desktop operating system that runs in the browser, built from scratch.
The visitor lands on a desktop; my projects, story, skills, CV and contact are **apps**.

- **Look:** Windows-inspired layout (taskbar, start menu, windows) in **my own brand**
  (pine/sage, my fonts, open-licensed icons). Not a copy of Windows 11, macOS or any distro:
  their visual design and icons belong to Microsoft/Apple.
- **Why this concept:** a window manager is real software engineering (state, invariants,
  z-order, drag/resize, keyboard). It closes the gaps listed in my student profile
  (**Zustand / state management, React performance, React testing**) and lets me apply my
  Software Engineering and Application Security courses for real.
- **Inspiration:** OS-style portfolios (e.g. the JavaScript Mastery macOS tutorial). Used to
  learn concepts only. **No tutorial code, no purchased code, no copied assets.** Every line
  must be something I can explain in an interview.

### Apps (v1 unless marked)

| App | What it does | Notes |
|---|---|---|
| **Boot sequence** | Short cinematic intro (GSAP), straight into the desktop — no start button | Skippable, shown on first visit only, off under reduced motion |
| **Desktop** | Wallpaper, icons, taskbar with clock + language + theme | Wallpaper: animated terrain shader in brand colours (signature) |
| **File Explorer** | Folders by skill (Backend, Frontend, Data & AI, DevOps…) → open a folder → tech files with **logos** → related projects | Derived from project data, never hand-maintained |
| **Projects** | Featured projects as large cards/"posters"; opening one launches the case study in its own window (no modal) | Each case study has its own URL |
| **Documents** | Case studies as readable documents; **CV viewer + download per language** | Build fails if a CV PDF is missing |
| **Terminal** | `help`, `ls projects`, `cat about.txt`, `open nexus`, `cv --lang nl`, `whoami` | Output rendered as text only — never as HTML (XSS) |
| **Map** | Plane flying Lima → Belgium along a great-circle route, chapters of my story | Replaces the globe idea |
| **About** | Story, how I work, languages, hobbies | Facts only (section 2) |
| **Experience** | Work + education timeline, certifications slot | Certifications empty-but-intentional until earned |
| **Mail** | Contact form (Web3Forms) + direct email + profiles | Honeypot, validation, success/error states |
| **Settings** | Light/dark theme · language EN/NL/ES (switch → full reload to `/nl/`, `/es/`) | |
| **Gaming** *(v1.1)* | A tiny playable mini-game (gaming is part of who I am) | Easter egg |
| **Security Lab** *(v1.1)* | Write-ups of my Application Security labs in professional report format | Authorised lab environments only |
| **Mobile mode** | Phone-style home screen; apps open full-screen | Same apps, same content, no window dragging |

---

## 2. About me (facts — never invent, ask if missing)

| | |
|---|---|
| Name | Jairo Nacurena (full: Jairo Alessandro Nacurena) |
| Origin | Grew up in **Peru**, moved to **Belgium at 17**, ~5 years in Belgium |
| Dutch | Usable level in under 6 months → 2 years secondary → bachelor taught in Dutch |
| Study | Bachelor **Applied Computer Science**, Thomas More Geel, **Application Development & AI**, **3rd year**, graduation expected **June 2027** |
| Secondary | Campos Turnhout, TSO **IT Management**, Sep 2022 – Jul 2024 |
| Work | **De Ark / Woonboog** (Woonboog is a division of De Ark), Turnhout, **Jun – Jul 2024**: VBA Developer & IT Support. Internship → hired as student worker to finish and deploy an Excel VBA rent-vs-sell profitability tool with red/green dashboards; helpdesk support |
| Languages | Spanish (native) · English (professional working) · Dutch (professional — degree in Dutch) |
| Hobbies | Football, gym/fitness, travelling, gaming |
| Goal | Full-stack or backend internship; long term lead AI/backend engineer |
| Public framing | **"Open to new challenges."** Use only this framing publicly |
| Certifications | None yet; planned: Cambridge English, Microsoft, TryHackMe |
| Links | GitHub [J41r0Ps](https://github.com/J41r0Ps) · [LinkedIn](https://www.linkedin.com/in/jairo-nacurena/) · jaironacurenaturnhout01@gmail.com |

**How I work** (About app): I want the *why* before the how · I validate outputs against
externally known facts (both data projects caught real bugs this way) · I review large
codebases in slices: backend → questions → frontend usage → notes → next.

---

## 3. Projects (content)

Full trilingual case studies exist in the archived repo `portfolio-astro-v2` under
`src/content/project-copy/{en,nl,es}/` (facts in `src/content/projects/*.yaml`). **Reuse them.**
Structure: problem → what I built → bug worth remembering → what I learned.

| Project | Context | Core facts |
|---|---|---|
| **NEXUS Esports** *(flagship)* | Solo, live | React 19 + Vite + Tailwind · .NET 10 API (API/Contracts/Domain/Infrastructure, repository pattern, AutoMapper) · Azure SQL · Auth0 · SignalR · Cloudinary · real data from RAWG/PandaScore/RestCountries (500+ players, 90+ teams, 15 games) · Docker → Azure · 2 GitHub Actions pipelines |
| **Feest op Tafel** | **Team of 5**, live client project ([krea.feestoptafel.be](https://krea.feestoptafel.be/)) | Laravel/Livewire/Blade/Alpine/Tailwind/MySQL/Stripe/Chart.js, Scrum + Jira. **My parts only:** catering requests end to end, ingredient CRUD + allergens, admin price analytics (Chart.js), login, folder/naming refactor. Always presented as team work |
| **Grand Tours Analysis** | Solo, open data | Tour/Giro/Vuelta, 333 editions, 161 riders · scraping + Wikidata SPARQL (96.9%) · Pandas · 28 pytest tests · CC BY-SA data / MIT code |
| **ShelfScope** | Solo | 1,000-book dataset from scratch · proved the source data synthetic · 22% non-genre labels |
| **CampusFix** | **Team of 2**, AI.NET Challenge 1 | .NET MAUI (MVVM Toolkit) photo → repair ticket · two own-trained Azure Custom Vision models (classification + object detection with box overlay) · Azure Speech (speech to text, 5 languages incl. nl-BE) + Translator · .NET 10 layered API (multipart upload, 409 business rule) · ngrok. Present as team work. Hand-in 8 Nov, defense 15 Dec 2026 |
| **Coming** | | Java/Spring Boot · SMD (UML/GRASP) · Qlik Cloud dashboard · AI (ML, CNN, NLP) · Web Dev upgrade · Software Engineering (ITF Pulse, Angular + .NET) · App Security labs |

Adding a project must be **one data entry** (+ optional icon), never a code change.

---

## 4. Applying my courses (what fits, what doesn't)

### Software Engineering (ITF) — applied selectively

| Course topic | Applied in NacurenaOS? | How |
|---|---|---|
| **Domain discovery / ubiquitous language** | ✅ | Event-storming-lite of the OS domain: App, Window, Desktop, Taskbar, Focus, Workspace. Glossary in `docs/DOMAIN.md` |
| **Entities, value objects, aggregates, invariants** | ✅ | `WindowManager` is the aggregate root. Value objects: `Position`, `Size`, `Bounds` (immutable, validated). Invariants: exactly one focused window or none · z-order values unique · a minimised window is never focused · a window always stays reachable inside the viewport · one instance per single-instance app |
| **Clean Architecture (dependencies point inward)** | ✅ | `src/os/domain` = pure TypeScript, no React, no browser APIs · `src/os/store` = Zustand store adapter, localStorage (ADR-010) · `src/ui` = React components. **Architecture tests** enforce the direction |
| **Vertical slices / use cases** | ✅ | Each build slice delivers one working behaviour end to end (domain → use case → store → UI → test) |
| **Branching** | ⚪ simplified | **Solo trunk-based: all work on `main`.** No feature branches, no PRs. Gitflow is practised in the course itself; here the safety net is CI: every push runs all checks and deploys only if they pass. Releases are tagged (`v1.0.0`) |
| **GitHub Actions CI/CD + quality gates** | ✅ | Parallel checks (lint, typecheck, unit + component tests, build, Semgrep) → one **merge gate** required by branch protection → deploy. `develop` → preview environment, `main` → production. **Cloudflare Pages**, same host as the course |
| **Testing strategy (pyramid)** | ✅ | Domain unit tests (Vitest) · use-case tests · component tests (React Testing Library) · E2E smoke + accessibility (Playwright + axe). Completion rule from the course: *a broken invariant, broken route or missing CV must fail a test before deployment* |
| Domain events | ⚪ optional | `WindowOpened`/`WindowClosed` events could feed terminal history or sounds |
| .NET API, EF Core, PostgreSQL, message queues, Docker deploy | ❌ | A portfolio needs no backend. Adding one only to tick course boxes is over-engineering a reviewer will notice. NEXUS already proves the .NET backend side |
| Angular + signals | ❌ (React here) | The course already shows Angular on my CV; the portfolio shows React. Signals ↔ Zustand selectors are the same idea (state ownership, derived values) |

### Application Security — applied for real

The portfolio is static, so SQLi / command injection / file upload don't apply to it.
What does apply:

| Topic | Applied |
|---|---|
| SDLC & testing methodology | Security checks in CI on every PR (shift left), threat model in `docs/SECURITY.md` |
| XSS | **Terminal input** and any user text rendered as text only; no `dangerouslySetInnerHTML`, no `eval`; Content Security Policy |
| Information disclosure | No source maps in production, no secrets in the client bundle (`NEXT_PUBLIC_*` is public by definition), security headers, `/cv/` not indexed |
| Access control / authentication | Not applicable (no accounts) — documented as out of scope in the threat model |
| Reporting vulnerabilities | `/.well-known/security.txt` (RFC 9116) + `SECURITY.md` responsible-disclosure policy |
| Testing my own site | **SAST:** Semgrep in CI · **secrets:** gitleaks · **dependencies:** Dependabot + `npm audit` · **DAST:** OWASP ZAP baseline scan against the preview deployment · targets: Mozilla Observatory **A+**, securityheaders.com **A** |
| Security Lab app *(v1.1)* | My course lab write-ups: summary, severity, high-level reproduction, impact, remediation. Only labs from authorised environments (course setup, PortSwigger Academy, TryHackMe) |

---

## 5. Requirements (non-negotiable)

- **Readable without JavaScript and by crawlers:** every app has a real URL with server-rendered
  HTML (e.g. `/en/projects/nexus-esports` opens that window). The v1 portfolio returned an
  empty `<div id="root">`; never again.
- **Recruiter path in < 30 s:** CV download visible on the desktop from the first second;
  "skip intro"; Projects app pinned.
- **Three languages:** `/en/`, `/nl/`, `/es/`, typed translations (a missing key fails the build),
  `hreflang`, switching reloads into the same app in the new language.
- **CV per language:** `/cv/jairo-nacurena-cv-{en,nl,es}.pdf`.
- **Mobile:** phone mode, no dragging, same content.
- **Accessibility:** full keyboard control (Tab, Enter, Esc closes, Alt+Tab-like switcher),
  visible focus, AA contrast, windows announced with `role="dialog"`-style semantics, reduced motion respected.
- **Performance:** first content < 2.5 s on a mid-range phone; Lighthouse mobile ≥ 90;
  wallpaper shader paused when hidden; JS for heavy apps loaded only when opened.
- **SEO:** titles/descriptions per page and language, canonical, sitemap, robots.txt, llms.txt,
  `Person`/`CreativeWork`/`BreadcrumbList` JSON-LD, social cards per language.

---

## 6. Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js (App Router), static export**, TypeScript strict | Most requested React framework; static HTML per page and language |
| UI | **React** + **Tailwind CSS 4** | Known; design tokens for the brand |
| State | **Zustand** | Closes a profile gap; thin adapter over the pure domain |
| Animation | **GSAP** | Boot sequence, window transitions. Dragging uses plain pointer events (ADR-010). Free for commercial use under GSAP's Standard License (not open source — recorded in the licence audit) |
| i18n | **next-intl** | Locale routing + typed messages |
| Wallpaper | Small WebGL fragment-shader canvas (no Three.js) | Signature visual without the R3F/React version pin from v2 |
| Icons | Phosphor or Lucide (UI) · **Simple Icons** (tech logos) | Open licences; logos used only to name the technology |
| Tests | **Vitest**, React Testing Library, **Playwright** + axe | The course's pyramid |
| Architecture test | dependency-cruiser (or eslint boundaries) | Enforces "domain imports nothing outward" |
| Quality/security | ESLint, Semgrep, gitleaks, Dependabot, OWASP ZAP baseline | Section 4 |
| Contact | Web3Forms | No backend |
| Hosting / CI | **Cloudflare Pages** + **GitHub Actions** | Same as the course; previews per branch |

Exact versions are checked at install time (peer-dependency conflicts are verified before any code is written).

### Folder structure (target)

```
nacurena-os/
├── CLAUDE.md                 # short rules for Claude Code (template in §10)
├── docs/
│   ├── BRIEF.md              # this file
│   ├── private/              # gitignored: STUDENT_PROFILE.md
│   ├── DOMAIN.md             # ubiquitous language, invariants, event-storming notes
│   ├── DECISIONS.md          # ADRs + asset licence audit
│   └── SECURITY.md           # threat model + disclosure policy
├── content/                  # projects, experience, copy per locale (data, not code)
├── messages/                 # UI strings en/nl/es
├── public/cv/  public/og/  public/.well-known/security.txt
├── src/
│   ├── os/
│   │   ├── domain/           # pure TS: WindowManager, value objects, invariants
│   │   └── store/            # Zustand adapter, persistence
│   ├── apps/                 # one folder per app (explorer, terminal, map, mail…)
│   ├── ui/                   # window chrome, taskbar, start menu, primitives
│   └── app/[locale]/         # Next.js routes
└── tests/e2e/                # Playwright
```

---

## 7. Brand

- **Palette:** pine `#080b0c` `#0c1113` `#101619` `#151d20` · sage `#3a564e` `#52796f` `#9ec8b5` ·
  mist `#f6f7f5` `#e7ebe6` `#aebcb2` `#5c6b64` `#1d2a27`. Two-layer tokens (primitives →
  semantic `--surface`, `--text`, `--accent`), so no component needs `dark:` for colour.
  `#52796f` text on light surfaces fails AA — use `#3a564e` there.
- **Type:** Space Grotesk (display), Geist (body), Geist Mono (terminal/labels). SIL OFL 1.1, self-hosted.
- **Logo:** "Jn" SVG — fix before reuse: add `viewBox`, merge `#51786E` into `#52796F`,
  make fills `currentColor` (the `#C9D1C4` part disappears on light backgrounds).

---

## 8. Infrastructure that already exists

- **Domain** `jaironacurena.com` (Namecheap stays the registrar, auto-renew ON, WHOIS privacy ON).
  Nameservers are on Cloudflare, and it is the custom domain of the Pages project. `.me` lapses.
- **Cloudflare Pages** project `nacurena-os` (direct upload, ADR-006). `CLOUDFLARE_API_TOKEN` and
  `CLOUDFLARE_ACCOUNT_ID` live in the GitHub `production` environment, restricted to `main`.
- **GitHub** `J41r0Ps`, email privacy ON, commits as `186018368+J41r0Ps@users.noreply.github.com`.
- **Old repos:** `skil2-professional-portfolio` (archived) · `portfolio-astro-v2` (formerly
  `portfolio`, archived and private; **don't delete**: trilingual case studies + authorship history).
- **`J41r0Ps.github.io`** — retired. Namecheap's "free GitHub Pages" option created it, and it
  served the domain until Slice 1 moved DNS to Cloudflare. The repository no longer exists.
- **Web3Forms** key (goes in `.env` and on the CI `build` job; Cloudflare does not build, ADR-006).
- **CV PDFs** EN/NL/ES, linking to `https://jaironacurena.com` (`/nl/`, `/es/`).

---

## 9. Plan & schedule (~110 h)

Available: holiday week ~21 h (3 h/day) · then ~15 h/week (1 h weekdays, 5 h weekend days).
January has exams → v1.0.0 aims for **~20 December**; v1.1 after exams.

### Holiday week (≈ 21 h) — learn, then lay foundations

| Day | Hours | What | Done when |
|---|---|---|---|
| 1 | 3 | **Claude Code** (tutorial + §10 of this brief, practice in a throwaway repo) · rename/archive v2 repo | Can run plan mode → review → commit in a toy repo |
| 2 | 3 | **GSAP core + Draggable**, **Zustand** basics (toy: a draggable box whose position lives in a store) | Can explain timelines, tweens, store selectors |
| 3 | 3 | **Next.js App Router + static export + next-intl** (toy: 2 pages × 3 languages) | `/en/` `/nl/` `/es/` build to static HTML |
| 4 | 3 | **Vitest + Testing Library + Playwright** (toy tests) · reread SE course DDD/Clean Architecture pages | One unit, one component, one E2E test green |
| 5 | 3 | **Slice 0 — repo & governance:** new repo `nacurena-os`, LICENSE + LICENSE-CONTENT + THIRD_PARTY_NOTICES, `.gitattributes`, `.editorconfig`, `.nvmrc`, `.gitignore`, `docs/` with this brief, `CLAUDE.md`, `.claude/settings.json`, design skills; Jairo commits and pushes; ruleset on `main` | Repo public, one commit authored only by Jairo, `main` protected against deletion and force-push |
| 6 | 3 | **Slice 1 — CI/CD:** GitHub Actions checks + merge gate, Cloudflare Pages (`develop` preview, `main` production), domain DNS moved, minimal page (name, one line, CV, contact) | `jaironacurena.com` live via the pipeline |
| 7 | 3 | **Slice 2 — domain model:** `docs/DOMAIN.md` (language, invariants), WindowManager aggregate + value objects in pure TS, unit tests | Invariants proven by tests, no React involved |

### November – December (≈ 90 h)

| Slice | Hours | What | Done when |
|---|---|---|---|
| 3 · Window manager | 12 | Use cases, Zustand adapter, window chrome (drag, resize, focus, minimise, maximise, close), z-order, keyboard, architecture test | Windows behave like an OS; domain imports nothing outward |
| 4 · Shell | 8 | Desktop, taskbar (clock, open apps), start menu, icons, routing: each app URL opens its window server-rendered | `/en/projects` is real HTML with the window open |
| 5 · Content model | 6 | Port case studies, experience, skills taxonomy from v2; typed, validated data; i18n messages | All content available in 3 languages |
| 6 · Projects + Documents | 10 | Project posters, case-study windows, CV viewer + download per language (build fails if missing) | Recruiter path works |
| 7 · File Explorer | 8 | Skill folders → tech files with logos → related projects (derived) | New project appears in folders automatically |
| 8 · Mail + Settings | 6 | Contact form (Web3Forms, honeypot, states), theme, language reload | Messages arrive from all 3 languages |
| 9 · Terminal | 6 | Command parser (pure TS, unit-tested), history, text-only rendering | `open nexus` opens the window |
| 10 · Map + About + Experience | 10 | Lima → Belgium route animation, story, timeline, certifications slot | Story told without walls of text |
| 11 · Boot + wallpaper + motion | 8 | GSAP boot sequence, terrain shader wallpaper, window open/close transitions, reduced-motion paths | Feels alive; motion off when requested |
| 12 · Mobile mode | 8 | Phone home screen, full-screen apps, touch | Usable at 375 px |
| 13 · Security & SEO | 6 | CSP + headers, security.txt, SECURITY.md, Semgrep/gitleaks/ZAP in CI, JSON-LD, sitemap, OG images | Observatory A+, rich results validate |
| 14 · Release | 2 | `release/1.0` → `main`, tag `v1.0.0`, README with the v1→v3 story | Live, tagged, documented |

**v1.1 (after exams):** Gaming app · Security Lab write-ups · day/night wallpaper · new course projects.

**Scope rule:** a new idea goes into `docs/IDEAS.md`, not into the current slice.

---

## 10. Working with Claude Code

### Connect your folder

1. Install Claude Code ([quickstart](https://code.claude.com/docs/en/quickstart.md)) and sign in.
2. **Easiest for reviewing:** the **VS Code extension** — open `C:\Projects\nacurena-os` in VS Code,
   open Claude Code from the sidebar. Diffs appear inline. ([docs](https://code.claude.com/docs/en/vs-code.md))
3. **Or the terminal:** `cd C:\Projects\nacurena-os` then `claude`. Claude Code works in the folder you start it in.
4. **Or the Claude desktop app → Code tab**, choosing the same folder: same Claude Code,
   same commands. This is the default for this project.
5. Run `/init` once only if you have no `CLAUDE.md`; otherwise use the template below.

### `CLAUDE.md` template (keep it short — it loads every session)

```markdown
# NacurenaOS — rules for Claude Code
Full brief: docs/BRIEF.md (read the relevant section when a task needs it).
Domain language: docs/DOMAIN.md. Design skills: docs/BRIEF.md §10b.

## Commands
- dev: npm run dev · build: npm run build · test: npm test · e2e: npm run test:e2e
- before every commit: npm run lint && npm run typecheck && npm test && npm run build

## Rules
- Work in one slice at a time. Plan first, wait for approval, then implement.
- Explain the why of every decision; I am learning Zustand, GSAP, Next.js, testing.
- src/os/domain is pure TypeScript: no React, no DOM, no Zustand imports.
- Never render user input as HTML. No dangerouslySetInnerHTML, no eval.
- Never invent facts about Jairo; content comes from /content or the brief.
- Work on main. Never run git add/commit/push or anything that rewrites history.
  Jairo reviews and commits every change. Suggest a Conventional Commits message.
- IMPORTANT: run the checks above and show their output before saying a task is done.
```

Don't `@import` the whole brief into `CLAUDE.md`: imported files load into context on every
session start. Reference the path instead so Claude reads only what a task needs.

### The loop for every slice

1. `/clear` — fresh context for the new slice.
2. Make sure `main` is clean and up to date (`git status`, `git pull`).
3. **Plan mode:** `Shift+Tab` until it shows *plan mode*, or `/plan`. Paste the slice prompt
   (Claude chat writes it). Press `Ctrl+G` to edit the plan yourself before approving.
4. Approve → Claude implements and runs the checks.
5. Review: `/diff`, read the code, ask "why" questions. `/code-review` for bugs,
   `/security-review` for vulnerabilities.
6. **Jairo** commits and pushes (`git add -A`, `git commit -m "..."`, `git push`).
   CI runs on the push and deploys only if every check passes.

### Settings that make this enforced, not just requested

`.claude/settings.json` (committed): commit/PR **attribution disabled** (current schema;
`includeCoAuthoredBy` is deprecated) and **deny rules for `git commit` and `git push`**.
Rules in `CLAUDE.md` are advice; permission rules are enforced.

### Private files (never committed)

- `docs/private/` (gitignored): `STUDENT_PROFILE.md` — contains known gaps and outdated
  lines not meant for recruiters.
- `CLAUDE.local.md` (gitignored): points Claude to the private profile and holds private rules.

### Most useful commands & keys

| | |
|---|---|
| `Shift+Tab` / `/plan` | Switch permission mode / plan mode (read and plan, no edits) |
| `Esc` | Stop Claude mid-action (context kept) |
| `Esc Esc` / `/rewind` | Rewind conversation and/or code to a checkpoint |
| `/clear` | New conversation, empty context (between unrelated tasks) |
| `/compact <focus>` | Summarise the conversation to free space, e.g. `/compact keep the window manager decisions` |
| `/context` | See what is filling the context window |
| `/btw <question>` | Side question that doesn't enter the conversation history |
| `/memory` | Edit CLAUDE.md, view/toggle auto memory |
| `/rename`, `claude --resume`, `claude --continue` | Name sessions and pick them up on another day |
| `/usage` | Session cost and plan limits |
| `/diff`, `/code-review`, `/security-review` | Review before shipping |
| `@path/to/file` | Point Claude at a file instead of pasting it |

### Saving tokens (context is the scarce resource)

- `/clear` between slices; after **two failed corrections**, `/clear` and write a better prompt.
- Reference files with `@` instead of pasting code; scope investigations narrowly
  ("look only in `src/os/domain`"), or say *"use a subagent to investigate…"*.
- Keep `CLAUDE.md` short; long knowledge lives in `docs/` and is read on demand.
- `/btw` for quick questions, `/compact` with a focus when a long slice gets heavy.
- Give Claude a check (tests, build) so it verifies itself instead of you re-asking.

### Prompt templates

**Slice prompt** (Claude chat prepares these):
```
Slice <n> — <name>. Read docs/BRIEF.md §<x> and docs/DOMAIN.md.
Goal: <one behaviour>. Scope: <files/folders>. Out of scope: <…>.
Acceptance: <tests that must exist and pass>, <what I can see in the browser>.
Plan first. Explain each design decision and the alternatives you rejected.
```

**Understanding prompt:**
```
Explain @src/os/infrastructure/windowStore.ts as if I know React and C# but am new to
Zustand. Why is the domain separate from the store? What breaks if I merge them?
```

**Review prompt:**
```
Review the diff on this branch against docs/BRIEF.md §<x> and the acceptance criteria.
Report only gaps that affect correctness, accessibility, security or the requirements.
```

---

## 10b. Design skills & tools

Installed **per project** (in `.claude/skills/`, committed) so every session and every machine
uses the same versions. Each has one job; invoke them explicitly so they don't compete.

| Tool | Job in this project | When |
|---|---|---|
| **Impeccable** (Paul Bakaus, [impeccable.style](https://impeccable.style/)) | Design vocabulary + AI-slop detector. `/impeccable init` once with the brand and concept from this brief; `/impeccable critique` / `audit` / `polish` on each UI slice | Every UI slice, before the PR |
| **Emil Kowalski skills** ([emilkowalski/skills](https://github.com/emilkowalski/skills), MIT) | Motion judgement: easing, duration, when *not* to animate. Install only: `emil-design-eng`, `animate`, `review-animations`, `animation-performance`, `find-animation-opportunities`, `mobile-native`, `break-ui` | Slices 3, 11, 12 and motion reviews. His examples are CSS/React-motion based; the principles apply to GSAP |
| **Taste** (`nexu-io/open-design`, skill name **`design-taste-frontend`**, MIT) | Art direction: design read + dials (layout variance, motion, density) | **Once**, in the design-direction session before Slice 3. Brand, fonts and concept are fixed inputs, not up for change. No placeholder stock photos: real project screenshots and my own photo only |
| **Playwright** | E2E + accessibility tests (CI) and letting Claude check the real page in a browser | From Slice 1 |
| **Figma MCP** | Optional. Only if I design something in Figma first (icon set, window chrome, wallpaper explorations) | Not required for v1 |

Install commands verified in the first run (pinned, non-interactive, `--copy` for Windows):

```
npx -y skills@1.7.6 add emilkowalski/skills --skill emil-design-eng animate review-animations animation-performance find-animation-opportunities mobile-native break-ui --agent claude-code --copy --yes
npx -y skills@1.7.6 add nexu-io/open-design --skill design-taste-frontend --agent claude-code --copy --yes
npx -y impeccable@4.8.0 install --yes --providers=claude --scope=project --no-hooks
```

Known facts from that run: Impeccable is Apache-2.0 (with a NOTICE) and also adds 4 agents in
`.claude/agents/` (kept; they run only when invoked); it ships a 20 MB Windows `.exe` →
gitignore `.claude/skills/impeccable/scripts/bin/` (the launcher re-downloads a
checksum-verified copy). Emil's and Impeccable's copies arrive without licence files →
`THIRD_PARTY_NOTICES.md` carries the full texts. Installer writes `skills-lock.json` (commit it).
A personal `~/.claude/skills/design-taste-frontend` may override the project copy: remove it
before the design-direction session. Impeccable telemetry: decide at `/impeccable init`.

Rules:
- The brief wins over any skill. If a skill's advice contradicts §5 (requirements) or §7 (brand), the brief applies.
- Record each skill and its licence in the licence audit (`docs/DECISIONS.md`).
- Skills cost context only when used; don't invoke all three on one task.

### Studying while building

Learning follows the slice order, so each topic is studied right before it's needed:

| Before slice | Study |
|---|---|
| 0–1 | GitHub Actions, Cloudflare Pages (course CI/CD chapter) |
| 2 | Vitest + TypeScript classes/immutability; course pages on entities, value objects, aggregates |
| 3 | Zustand; React performance (memo, selectors); GSAP Draggable |
| 4–5 | Next.js App Router, static export, next-intl |
| 6–8 | React Testing Library; forms; CSP basics |
| 11 | GSAP timelines + `useGSAP`; Book of Shaders ch. 1–7 |
| 12–13 | Playwright + axe; security headers, security.txt |

---

## 11. IP & licensing

- MIT for code (`LICENSE`); all rights reserved for writing, photos, CVs, logo (`LICENSE-CONTENT.md`).
- **Asset & dependency licence audit** in `docs/DECISIONS.md` before anything is used
  (fonts, icons, GSAP, sounds, images). Tech logos (Simple Icons) are trademarks used only to name the technology.
- No OS vendor icons/wallpapers, no game footage, no tutorial code.
- Decisions as ADRs: context → decision → consequences.

---

## 12. Lessons learned from v2

- Measure on the production build, incognito, cache off, extensions off.
- Never write a literal `<script` inside a comment in template files.
- Windows: `.gitattributes` (`* text=auto eol=lf`) on day one; `EPERM` on delete = a process holds the file.
- Check peer dependencies before installing (R3F pinned React to 19.2 in v2).
- Server-rendering a client-only component caused "Invalid hook call" — keep browser-only code in client components.
- `PUBLIC_`/`NEXT_PUBLIC_` env vars are inlined at build: set them in the CI/host too.
- Facts about me are claims: verify dates, employers and team contributions.

### From the first Claude Code run (Slice 0, attempt 1)
- Claude Code adds a `Co-Authored-By` trailer by default → disable attribution in
  `.claude/settings.json` and let Jairo make every commit.
- A public repo publishes everything in `docs/` → private material lives in gitignored
  `docs/private/`, checked with `git status` before the first commit.
- Approving a plan "with decisions" is not enough: verify each decision in the result
  (the profile was committed anyway). Ask Claude to prove each one.
- Sandbox-testing installs before touching the repo caught a wrong skill name, an `.exe`
  and missing licence files. Keep that habit for every third-party install.

---

## 13. Open items

1. Internship availability date (v2 assumed "from February 2027").
2. Location to show (Turnhout? Geel? "Belgium"?).
3. Update `Student_profile.md`: Dutch still says "learning"; Software Engineering and
   Application Security sections are placeholders.
5. Schedule: CampusFix hand-in 8 Nov and defense 15 Dec take priority over portfolio slices.
4. Name check: "NacurenaOS" as the product name (personal name → no trademark conflict expected).
