# NacurenaOS design direction

Rules for all UI work. Palette and fonts: `docs/BRIEF.md` §7. Product context: `docs/PRODUCT.md`.
The brief wins over this file, and this file wins over any skill. Why: ADR-009.

## 1. Design read

A working desktop for a recruiter in a hurry and an engineer who wants to look closer. The mood is
matte, calm and pine-dark: a well-made tool at night, not a themed website. The product is the proof,
so chrome stays quiet and correct, and personality comes from two moments only: the boot sequence
and the terrain wallpaper.

## 2. Dials

| Dial | Value | Why |
|---|---|---|
| Layout variance | 4 | Chrome must be predictable, because visitors already know how windows work. Projects posters may reach 6 |
| Motion intensity | 4 | Motion explains what happened to a window. It does not perform |
| Density | 5 | It is a tool, so chrome is compact (13 px). Reading surfaces stay at 16 px |

## 3. Window chrome

| Part | Decision |
|---|---|
| Title bar | **32 px**, fixed by `TITLE_BAR_HEIGHT`. 16 px app glyph, then the title in Geist 13/500, left-aligned, truncated. Drag moves, double-click toggles maximise |
| Corners | 6 px. Maximised: 0, with no border or shadow |
| Surfaces | Solid, never translucent. Title bar `--surface-raised`, body `--surface` |
| Border | 1 px, inside the bounds, so it never changes the size the domain stores |
| Controls | Right side: minimise, maximise, close. Cells 40 × 32 px, glyphs 14 px: `Minus`, `CornersOut` (`CornersIn` when maximised), `X`. They never start a drag |
| Control states | Hover `--surface-overlay`. Close hover inverts to `--text` fill with `--surface-sunken` glyph; the palette has no red and we do not add one |
| Resize | Invisible handles, 8 px on edges and 12 px on corners |

| State | Border | Shadow | Title and glyphs |
|---|---|---|---|
| Focused | `--border-strong` | `--shadow-focused` | `--text` |
| Unfocused | `--border` | `--shadow-unfocused` | `--text-muted` |

- INV-04 keeps a focused window whenever one is visible, so "unfocused" only ever means behind it.
- Unfocused content is never dimmed, so it keeps AA. Three cues change, so focus never relies on colour alone.
- Keyboard focus is a separate 2 px `--focus-ring` with 2 px offset, on every interactive element.
  Window controls and the window itself draw it inside (`-2 px`), because a window at the screen
  edge would otherwise clip it.

**Left limit:** `Viewport.fit` keeps the controls (120 px) plus the grab strip (64 px) on screen, so
`minX = 184 - width`, derived from named constants. A window pushed left can always be dragged back.
Slice 3 resolved this; ADR-010 records it.

## 4. Desktop

- **Wallpaper:** atmosphere, not content. Terrain shader in pine and sage (Slice 11). Until then, and
  as first paint always, flat `pine-950`. It fades in after load and is never the LCP. It pauses when
  the tab is hidden or a maximised window covers it.
- **Brightness cap:** no wallpaper pixel is brighter than `sage-700`, so `mist-50` labels keep at least
  7.46:1 with no text shadow. Light theme: none darker than `mist-300`, `mist-900` labels, 7.53:1.
- **Icons:** Phosphor duotone, 32 px, `--accent`. Label Geist 12/16, centred, two lines at most.
- **Grid:** 96 × 96 px cells, 16 px from the edge, filling top to bottom, then left to right. Projects
  and CV come first. Positions are fixed in v1. New windows open right of the first column
  (`CASCADE_ORIGIN_X`), so a window never hides the icons when it opens.
- **Behaviour:** an icon is a real link to the app's URL. One click or Enter opens it, because
  recruiters on a website expect a click, and a link keeps working without JavaScript. A modified
  click stays with the browser, so "open in new tab" works. The second click of a double-click is
  ignored.
- **Without JavaScript:** nothing is shown that could not work. Window controls, the start button and
  the open-apps buttons are hidden with `noscript:`, and Close becomes a link to the locale root.
- **Taskbar:** 48 px, full width, solid `--surface-sunken`, 1 px `--border` on top. Not part of the viewport.
  - Left: start button ("Jn" logo), pinned Projects, then open apps, left-aligned.
  - Right: **Download CV** with a text label, language, theme, clock (Geist Mono, tabular figures).
    The clock renders after mount, because a static export cannot know the visitor's time.
  - App button: 44 to 160 px wide, glyph plus truncated title. Focused: `--surface-overlay` fill and a
    16 px `--accent` bar. Open or minimised: no fill, 6 px `--text-muted` bar. Not colour alone.
- **Start menu:** bottom-left, above the taskbar, solid `--surface-overlay`, with the window's border
  and shadow. An app list with 20 px duotone glyphs and 40 px rows. The start button shows the Jn mark
  through a CSS mask, so it takes the text colour and its paths stay out of the JavaScript. The mark's
  small inner J is a cut-out, because one colour would otherwise paint it over.
- **Phone mode (Slice 12):** none of this chrome. Home screen and full-screen apps, same tokens.

## 5. Tokens

Extends `src/app/globals.css`. Components use semantic tokens only, so no `dark:` for colour.
Contrast is the worst case on any surface in that theme.

| Semantic token | Dark | Light | Contrast (dark / light) |
|---|---|---|---|
| `--surface`, `-sunken`, `-raised`, `-overlay` | `pine-900`, `950`, `850`, `800` | `mist-50`, `100`, `100`, `50` | |
| `--text` | `mist-50` | `mist-900` | 15.91 / 12.33 |
| `--text-muted` | `mist-300` | `mist-600` | 8.66 / 4.66 |
| `--accent` | `sage-200` | `sage-700` | 9.27 / 6.65 |
| `--on-accent` | `pine-950` | `mist-50` | 10.70 / 7.46 on `--accent` |
| `--border` | `mist-900` | `mist-300` | Decorative |
| `--border-strong` | `sage-500` | `sage-500` | 3.52 / 4.03 |
| `--focus-ring` | `sage-200` | `sage-700` | 4.34 / 4.06, wallpaper included |

Never as text: `mist-600` or `sage-500` on dark (3.05 to 4.07:1), or `sage-500` on light (brief §7).
Errors use an icon and text, no new hue. If Mail needs more, that is a new ADR.

```css
/* Size / line height. Space Grotesk from title up, Geist below, Geist Mono for label */
--text-label: 0.6875rem / 1rem;      /* 11/16 terminal meta, clock */
--text-caption: 0.75rem / 1rem;      /* 12/16 icon labels */
--text-ui: 0.8125rem / 1.25rem;      /* 13/20 chrome, menus, taskbar */
--text-small: 0.875rem / 1.25rem;    /* 14/20 dense lists */
--text-body: 1rem / 1.5rem;          /* 16/24 reading, max 65ch */
--text-lead: 1.125rem / 1.75rem;     /* 18/28 */
--text-title: 1.375rem / 1.75rem;    /* 22/28 weight 500 */
--text-heading: 1.75rem / 2.25rem;   /* 28/36 weight 500 */
--text-display: 2.5rem / 2.75rem;    /* 40/44 weight 600, -0.02em */
--text-poster: 3.5rem / 3.75rem;     /* 56/60 weight 600, -0.02em, Projects only */
/* Space: Tailwind's 4 px base, allowed steps 1 2 3 4 6 8 12 16 (4 to 64 px) */
--radius-control: 4px;   /* buttons, inputs, icon cells, taskbar buttons */
--radius-window: 6px;    /* windows, menus. Nothing larger, no pills */
--titlebar-h: 32px;      /* must equal TITLE_BAR_HEIGHT */
--control-w: 40px;       /* must equal WINDOW_CONTROL_WIDTH */
--taskbar-h: 48px;
--icon-cell: 96px;
/* Dark. Light uses rgb(29 42 39) at .10/.16 and .08 */
--shadow-focused: 0 2px 6px rgb(8 11 12 / .4), 0 16px 40px rgb(8 11 12 / .55);
--shadow-unfocused: 0 4px 12px rgb(8 11 12 / .35);
```

Size tokens use Tailwind's `--text-*` namespace, so colour variables reach it as `--color-muted`.
Layers: wallpaper, icons, windows, taskbar, menus, switcher. The windows layer sets `isolation:
isolate`, so a growing z-order integer can never rise above the taskbar.

## 6. Motion

A visitor opens a few windows but changes focus constantly, so opening may animate and focus may
not. Motion is presentation only: the domain commits first, and an animation never gates state.

| Action | Motion | Duration | Easing | Reduced motion |
|---|---|---|---|---|
| Open | Scale 0.96 to 1, opacity 0 to 1, from window centre | 200 ms | `--ease-out` | Opacity, 120 ms |
| Close | Scale to 0.98, opacity to 0 | 140 ms | `--ease-out` | Opacity, 120 ms |
| Minimise, restore | Translate and scale to or from its taskbar button | 200 ms | `--ease-move` | Instant |
| Maximise, un-maximise | Transform from old to new display bounds | 180 ms | `--ease-move` | Instant |
| Start menu | Scale 0.98 to 1 and opacity, from bottom-left. Close: opacity | 160 / 120 ms | `--ease-out` | Opacity, 120 ms |
| Hover | Colour only, behind `(hover: hover) and (pointer: fine)` | 120 ms | `ease` | Same |
| Press | Scale 0.97 | 100 ms | `--ease-out` | None |
| Boot | One GSAP timeline, 2 s at most, skippable, first visit only | | | Off |

`--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` for enter, exit and feedback.
`--ease-move: cubic-bezier(0.77, 0, 0.175, 1)` for movement across the screen. Never `ease-in`.

**Never animates:** focus change and z-order · drag and resize (1:1 with the pointer, no inertia) ·
Esc and the window switcher · a window opened from a URL (it is already in the HTML) · content inside
a window · `box-shadow`, `width`, `height`, `top`, `left` · stagger or scroll reveals. The wallpaper
is the only loop, and under reduced motion it is one still frame.

- CSS transitions for hover, press and the start menu. The menu must not wait for a lazily loaded
  GSAP, and nothing in it is measured at runtime. GSAP for windows and boot, because targets are
  measured at runtime and tweens must retarget. `CustomEase` carries the same curves; `gsap.matchMedia()` holds
  the reduced-motion branch. Drag and resize use plain pointer events, not Draggable (ADR-010).
- GSAP loads by dynamic import after mount, so it stays out of First Load JS. If it is late, a
  window simply appears, which motion rules allow because an animation never gates state.
- GSAP animates an inner wrapper. React owns the outer element's transform, and the two would fight.
- Interruptible: `overwrite: "auto"`, starting from the current value, never a fixed one.
- On close, the domain removes the window and focus moves at once. The exit plays on a leftover
  element marked `inert`, which is then deleted.

## 7. Icon set

**Phosphor** (`@phosphor-icons/react`, MIT). Its weights map to our two roles: regular for chrome,
duotone for app icons. Lucide (ISC, equally open) has one weight, so app icons would need a second
family. `@phosphor-icons/react/ssr` works in Server Components, which suits server-rendered windows.
Import per icon. Simple Icons stays for tech logos only. Never use `WindowsLogo` or `AppleLogo`.

## 8. Do not

- Glass, `backdrop-filter` or translucent chrome: it is the Windows 11 and macOS look, and blurring
  over a live shader is slow on a mid-range phone.
- Glows, gradient text, purple, neon, or any hue outside the brief's palette.
- Traffic-light controls, a centred taskbar, a magnifying dock, or vendor icons and wallpapers.
- Decorative status dots, eyebrow labels, numbered sections, version stamps, or locale and weather strips.
- Three equal cards. Project posters get real screenshots and varied sizes.
- Fake previews built from divs, stock or placeholder photos, Picsum, or generated portraits.
- Invented numbers, testimonials or skill-percentage bars.
- Filler copy ("seamless", "elevate", "passionate"), or em dashes in UI text.
- Custom cursors, scroll-jacking, or typewriter effects outside boot and Terminal.
- Shadows or borders on content inside a window, or radii other than the two tokens.
