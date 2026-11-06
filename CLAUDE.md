# NacurenaOS — rules for Claude Code
Full brief: docs/BRIEF.md (read the relevant section when a task needs it).
Domain language: docs/DOMAIN.md. Design skills: docs/BRIEF.md §10b.

## Commands
- dev: npm run dev · build: npm run build · test: npm test · e2e: npm run test:e2e
- before every commit: npm run lint && npm run typecheck && npm test && npm run arch && npm run build

## Rules
- Work in one slice at a time. Plan first, wait for approval, then implement.
- Explain the why of every decision; I am learning Zustand, GSAP, Next.js, testing.
- src/os/domain is pure TypeScript: no React, no DOM, no Zustand imports.
- Never render user input as HTML. No dangerouslySetInnerHTML, no eval.
- Never invent facts about Jairo; content comes from /content or the brief.
- Work on main. Never run git add/commit/push or anything that rewrites history.
  Jairo reviews and commits every change. Suggest a Conventional Commits message.
- IMPORTANT: run the checks above and show their output before saying a task is done.
