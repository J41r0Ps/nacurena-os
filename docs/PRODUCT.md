# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: a recruiter scanning quickly, who needs the CV and the strongest projects within 30
seconds, often with no time to learn an interface.

Secondary: an engineer or tech lead reviewing the work, who opens case studies, tries the windows
and terminal, and may read the repository.

## Product Purpose

NacurenaOS is Jairo Nacurena's portfolio: a desktop operating system that runs in the browser. His
projects, story, skills, CV and contact details are apps on that desktop.

Success means a visitor opens a project or the CV and gets in touch. The window manager is itself
the evidence that he builds real software, and the case studies back it up.

## Positioning

The portfolio is a working piece of engineering, not a page describing engineering. It has a real
domain model, enforced invariants and tests, and every app also has a server-rendered URL.

Public framing of future plans: "Open to new challenges."

## Operating Context

Visitors arrive on a desktop or a phone, from a CV link, a profile or search. Most stay briefly. Some
arrive on a deep link such as `/en/projects/nexus-esports`, which opens that window directly. Crawlers
and readers without JavaScript get the same content as HTML.

## Capabilities and Constraints

- Apps: Desktop, File Explorer, Projects, Documents, Terminal, Map, About, Experience, Mail, Settings
  and a short boot sequence. Gaming and Security Lab follow in v1.1 (`docs/BRIEF.md` §1).
- Three languages (`/en/`, `/nl/`, `/es/`), a CV per language, and a phone mode with no dragging.
- Static export with no backend and no accounts. Contact goes through Web3Forms.
- Terms come from `docs/DOMAIN.md` and are used exactly: App, Window, Focus, Minimised, Viewport.
- Undecided: the location to show publicly (`docs/BRIEF.md` §13).

## Brand Commitments

- The name is NacurenaOS. The layout is Windows-inspired in Jairo's own brand, not a copy of Windows
  or macOS, and uses no vendor icons or wallpapers.
- Palette and fonts are fixed in `docs/BRIEF.md` §7. Dark is the default theme.
- Only real project screenshots and Jairo's own photo are used. No stock or placeholder photos.

## Evidence on Hand

- Trilingual case studies in the archived `portfolio-astro-v2` repository.
- CV PDFs in English, Dutch and Spanish.
- Live projects: NEXUS Esports and Feest op Tafel (team work, always presented as such).
- This repository: the domain model, its tests and the CI pipeline.
- Absent, and not to be invented: testimonials, certifications (none yet) and usage figures.

## Product Principles

1. The fastest path wins. Nothing stands between a recruiter and the CV.
2. The product is the proof. Behaviour has to be correct before it is decorated.
3. One source of content. Facts come from `/content` or the brief, and new projects are data entries.
4. The concept never costs access. Keyboard, phone, crawler and no-JavaScript visitors get everything.

## Accessibility & Inclusion

WCAG AA contrast, full keyboard control, visible focus, windows announced to assistive technology,
and reduced motion respected (`docs/BRIEF.md` §5).
