# Campus Connect — the standard

Campus Connect is the noticeboard for students across Indian colleges:
events, clubs, Buzz (club posts), a team finder, colleges, messages and
leaderboards. Live at https://campusconnect2026.netlify.app.

The bar is high and it is the same everywhere: a page nobody visits often
gets the same care as the home page. Work is not done until it meets every
section below.

## Stack

- Next.js 16 (App Router, Turbopack), React 19, TypeScript.
- Prisma 5 on Supabase Postgres (ap-south-1, Mumbai), through pgbouncer.
- Netlify (functions in us-east-2), Pusher (private channels), Stripe,
  Supabase Storage for uploads.
- Styling is CSS Modules plus the tokens in `src/app/globals.css`. No
  Tailwind utility classes in new code.
- Motion: GSAP (`gsap`, `@gsap/react`) for anything scroll-driven or
  sequenced; CSS for simple entrances. Lenis smooth scroll is global.

## Design system

Use the tokens. A raw colour, radius or shadow in a component is a defect
unless it is a one-off with a comment saying why.

- **Colour**: `--color-canvas` (the board), `--color-paper` (cards),
  `--color-obsidian` (ink), `--color-accent` #2f3bff (campus blue, primary
  actions and the accent word), `--color-marker` #ffe45c (highlighter: one
  thing per page). Text greys: `--color-inkstone`, `--color-felt`,
  `--color-ash`. Category marks are the `--press-*` colours, always shown
  as a small square next to the category name, never colour alone.
- **Type**: `--font-display` (Bricolage Grotesque) for headings, set tight
  (negative letter-spacing, line-height about 1). `--font-accent`
  (Instrument Serif italic) for the one spoken phrase in a heading, via
  the global `.accent` class or an `<em>` styled the same way: one per
  heading, never a whole line. `--font-mono` (Geist Mono) for labels,
  dates and counts, uppercase with a little tracking. Body is Inter.
  Numbers that change use `font-variant-numeric: tabular-nums`.
- **Shape**: `--radius-card` (16px) for cards, 20–24px for large sheets,
  `--radius-pill` for chips and buttons. Hairline borders
  (`--border-hairline`) rather than shadows; `--shadow-soft` /
  `--shadow-float` only for things that genuinely float.
- **Layout**: grids use `minmax(0, 1fr)` and `minmax(min(Npx, 100%), 1fr)`
  so nothing overflows. Full-bleed sections step out of `.container` with
  `width: 100vw; margin-left: calc(50% - 50vw)`. Empty states are a dashed
  box on the dot grid with a title, one line of text and a next step.
- **Imagery**: real photos only, never placeholder-looking stock. College
  photos live in `public/images/colleges` with credits in
  `src/lib/college-images.ts` (shown on the college page and
  `/legal/credits`); photos supplied by the owner carry no credit. Resize
  and compress before committing (≤ 1600px long edge, mozjpeg ~80).
  Every `<Image>` gets accurate `sizes`.

## Motion

- Nothing waits on JavaScript to be visible. Content that animates in must
  render visibly without the script; if a hero must start hidden for its
  entrance, gate it on a class set before it is parsed and add a CSS
  failsafe (see `html.gsap-on` in `src/app/home.module.css`).
- GSAP in React goes through `useGSAP` with a `scope`, always inside
  `gsap.matchMedia()`, with a `(prefers-reduced-motion: reduce)` branch
  that shows the final state. Note that a conditions object only runs when
  at least one condition matches: include an always-true pair.
- Animate `transform` and `opacity` only. `gsap.quickTo` for pointer
  followers. Create ScrollTriggers top to bottom; pinned sections need a
  block (not flex) parent or explicit `pinSpacing`.
- Never leave a `transform` animation filling on an ancestor of pinned or
  fixed content (`animation-fill-mode: both` broke every pin once).
- Load GSAP lazily on pages that only use it for small touches.

## Writing

Plain, specific, sentence case. No exclamation marks, no "Oops", no
filler words (elevate, seamless, unleash, next-gen). Errors say what went
wrong and what to do. Dates are written for Indian readers: always
`formatIST` from `src/lib/format.ts`, never a bare `toLocaleString`.

## Code

- Server components by default; a client component only for what needs
  the browser. Pages that do not depend on the visitor are static with
  `revalidate`, and per-person bits are fetched by the browser, because
  the functions and the database are on different continents.
- Every Prisma read selects its fields explicitly. Never return a whole
  User row to the client.
- Independent reads run together (`Promise.all`), never one after another.
- `getSession()` is request-cached; call it freely, but never inside
  `unstable_cache`.
- Every server action checks the session and ownership itself. Sanitise
  user text with `src/lib/sanitize.ts`. No secrets in code, logs, URLs or
  chat; `.env` values are typed in by the owner.
- No new `any`, no `@ts-ignore`. Comments explain why, not what.
- Remove what you replace: no dead components, styles or packages.

## Definition of done

1. `npm run check` passes: typecheck, lint, tests and the production
   build. Lint has zero errors and the ratchet (`lint-baseline.json`, now
   empty) keeps it there: one new error fails the gate. Unused code is an
   error; prefix a name with `_` only when it is unused on purpose. The few
   remaining warnings are deliberate (a preview `<img>` of a URL the user
   typed, documented full-page navigations); do not add more.
2. Looked at in the browser on desktop (1440×900) and phone (375×812):
   no horizontal scroll, nothing overlapping, text readable on every
   background, hover, focus and empty states present.
3. Checked with reduced motion and with a slow first load: nothing blank,
   nothing jumping.
4. No new console errors or warnings in the dev overlay.

## Git

- Commit as the owner: Veereaswaran K.V <veereashkv@gmail.com> (set in the
  local git config; remote `kvveereash/Campus-Connect-Website`).
- Conventional prefixes (`feat`, `fix`, `perf`, `design`, `chore`,
  `security`), a subject that says what changed for a user, and a body
  that says why.
- Never push, deploy or touch the shared database without the owner
  asking. Before pushing, merge `origin/main` and run `npm run check`
  on the merge.
