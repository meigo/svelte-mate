# svelte-mate v0.2 — Version Refresh + Hardening Parity + SEO/Fonts Baseline

**Date:** 2026-06-01
**Status:** Approved design, pending spec review

## Problem

`svelte-mate` scaffolds SvelteKit + Tailwind v4 sites for a Claude Code agent to
flesh out. It is currently at the equivalent of astro-mate's **pre-v0.2** state.
Three gaps:

1. **Stale versions.** The locked stack pins SvelteKit-ecosystem packages,
   Biome `^1.9.4`, and TypeScript `^5.7.0` one or more majors behind current
   releases (notably `@sveltejs/vite-plugin-svelte` `^5` → `7`, `adapter-auto`
   `^3` → `7`, `prettier-plugin-svelte` `^3` → `4`). Deploy CLIs (wrangler `^3`,
   vercel `^37`, netlify-cli `^24`) are also behind.
2. **Headless-agent fragility.** astro-mate's live end-to-end run exposed two
   bugs that apply identically here: the inner `claude -p` agent is hijacked by
   the user's global brainstorming/superpowers hook (writes zero code), and the
   verify loop reports false success on a pristine scaffold (all four checks pass
   on an untouched project). svelte-mate has neither fix.
3. **No SEO / fonts baseline.** Generated sites have no canonical/OG/Twitter/
   JSON-LD head metadata, no sitemap, no `robots.txt`, no production URL, and no
   self-hosted font. Every generated site starts SEO-blind.

This change mirrors astro-mate v0.2: refresh all pinned versions, port the two
headless-robustness fixes plus dynamic model aliases and an a11y prompt
requirement, and bake a SvelteKit-appropriate SEO + fonts baseline — while
preserving the project's "explicit, locked, no guesswork" ethos.

## Goals

- Bump every pinned dependency (scaffolded **and** the tool's own) to current
  latest, including the Biome 1→2 and TypeScript 5→6 majors and the SvelteKit
  ecosystem majors.
- Port the two headless-agent robustness fixes, dynamic model aliases, and the
  WCAG-AA a11y prompt requirement from astro-mate.
- Bake an SEO baseline: a `Seo.svelte` head component, JSON-LD, `static/robots.txt`,
  and a prerendered `sitemap.xml` endpoint.
- Self-host a default web font (`@fontsource-variable/inter`) wired to Tailwind.
- Capture an optional production URL (`--site` + prompt), persisted.

## Non-Goals

- `llms.txt` / `llms-full.txt`. As of 2026 the major AI crawlers (GPTBot,
  ClaudeBot, PerplexityBot, OAI-SearchBot, Google-Extended) skip the file and
  read HTML directly; baking it in would be speculative cruft. (Same decision as
  astro-mate.)
- Generating a real Open Graph raster image — the scaffold cannot honestly
  produce one; `og:image` stays an optional prop documented for the agent.
- A **global** `prerender = true` baseline. SvelteKit's dynamic features (server
  `load`, form actions, endpoints) are the reason to choose it over Astro;
  forcing the whole app static would undercut that. Only the sitemap route
  prerenders.
- Adding a unit-test framework. The project deliberately has none; verification
  is the real gate (`npm run build`, `npm run check`, and an agent-free
  scaffold-then-build smoke test).

## Decisions (from brainstorming)

| Decision | Choice |
|---|---|
| Feature scope | Version refresh + 4 hardening fixes + SEO baseline + sitemap + `--site` + fonts (all approved) |
| Site-URL threading | Baked constant `src/lib/site.ts` (`export const SITE_URL`), **not** `$env/static/public` — build-safe, survives commit, no `.env` plumbing |
| Sitemap | `src/routes/sitemap.xml/+server.ts`, `prerender = true`, enumerates static pages via `import.meta.glob`, skips dynamic/group routes |
| Prerender scope | Sitemap route only; app stays SSR-flexible (adapter-auto) by default |
| Fonts | `@fontsource-variable/inter`, self-hosted, `@import`-ed in `app.css`, wired to Tailwind `--font-sans`; agent may swap to fit the site |
| Biome | Bump to 2.x, keep Prettier for `.svelte` (Biome does not cover `.svelte`) |
| Model menu | Tier aliases (`opus`/`sonnet`/`haiku`), labels show current versions |
| Tool's own deps | Bump too (Part D) |

## Version Targets

Verified against the npm registry on 2026-06-01. Caret ranges kept; floors raised.

### Scaffolded stack (`src/stack.ts`)

| dep | from | to | note |
|---|---|---|---|
| svelte | `^5.0.0` | `^5.56.0` | floor bump |
| sveltekit (`@sveltejs/kit`) | `^2.0.0` | `^2.61.1` | floor bump |
| vitePluginSvelte (`@sveltejs/vite-plugin-svelte`) | `^5.0.0` | `^7.1.2` | **major ×2**; peer requires vite `^8` |
| adapterAuto (`@sveltejs/adapter-auto`) | `^3.0.0` | `^7.0.1` | **major ×4** |
| adapterCloudflare | `^5.0.0` | `^7.2.8` | major |
| adapterVercel | `^5.0.0` | `^6.3.3` | major |
| adapterNetlify | `^5.0.0` | `^6.0.4` | major |
| svelteCheck | `^4.0.0` | `^4.5.0` | |
| vite | `^6.0.0` | `^8.0.0` | **major ×2**; required by vite-plugin-svelte 7, allowed by SvelteKit 2.61 |
| tailwind (`tailwindcss` + `@tailwindcss/vite`) | `^4.0.0` | `^4.3.0` | |
| biome (`@biomejs/biome`) | `^1.9.4` | `^2.4.16` | **major** — biome.json v2 schema |
| prettier | `^3.3.0` | `^3.8.3` | |
| prettierPluginSvelte (`prettier-plugin-svelte`) | `^3.3.0` | `^4.1.0` | **major** |
| typescript | `^5.7.0` | `^6.0.3` | **major** |
| **fontsourceInter** (`@fontsource-variable/inter`) | — | `^5.2.8` | **new dependency** |

**Peer-compat note (verified 2026-06-01):** `@sveltejs/vite-plugin-svelte@7.1.2`
peers are `svelte ^5.46.4`, `vite ^8.0.0`. `@sveltejs/kit@2.61.1` allows
`@sveltejs/vite-plugin-svelte ^7`, `vite ^8`, `typescript ^5.3.3 || ^6`. So the
chosen pins are mutually consistent. This is the **opposite of astro-mate**,
where vite 8 was incompatible and had to be pinned to 7 — here vite 8 is the
required floor. Still confirmed empirically by the smoke test.

### Deploy CLIs (`src/deploy.ts`)

| dep | from | to |
|---|---|---|
| wrangler | `^3.90.0` | `^4.95.0` |
| vercel | `^37.0.0` | `^54.6.1` |
| netlify-cli | `^24.0.0` | `^26.0.2` |

Cloudflare `compatibility_date` in the generated `wrangler.toml` bumped
`2024-11-01` → `2026-05-01`. The Vercel adapter `runtime` (`nodejs22.x`) is left
as-is (still valid; not part of this refresh).

### The tool's own deps (`package.json`) — Part D

| dep | from | to |
|---|---|---|
| @biomejs/biome | `^1.9.4` | `^2.4.16` |
| typescript | `^5.7.0` | `^6.0.0` |
| @types/node | `^22.0.0` | `^24.0.0` (LTS-aligned with the `engines: node >=20` floor) |
| tsx | `^4.19.0` | `^4.22.3` |

The root `biome.json` migrates to the v2 schema (only the `$schema` URL changes;
the root config has no `files.ignore` to convert).

## Biome 2 Migration

Both the scaffold's generated `biome.json` and (Part D) the root `biome.json`
move to the v2 schema. Exact v2 key names confirmed via Biome docs / `biome
migrate` during implementation rather than guessed. Known v2 changes:

- `$schema` → `https://biomejs.dev/schemas/2.4.16/schema.json`
- generated config's `files.ignore` (v1) → v2 `files.includes` with `!`-negation
  globs, e.g. `['**', '!**/build', '!**/.svelte-kit', '!**/node_modules',
  '!**/dist', '!**/*.svelte']`
- Keep `*.svelte` excluded — Prettier + prettier-plugin-svelte still owns `.svelte`
- Keep the `vcs` block and `recommended` lint rules

## Hardening Parity (ported from astro-mate)

### 1. Non-interactive agent directive (`src/runner.ts`)

svelte-mate spawns `claude -p`, which inherits the user's global config —
including a superpowers SessionStart hook whose brainstorming skill hard-gates
code-writing behind user approval. In non-interactive `-p` mode the agent stalls,
writing zero code. `--bare` would disable the hook but strips authentication.

**Fix:** add a `NON_INTERACTIVE_DIRECTIVE` constant (Svelte-worded) and pass it
via `--append-system-prompt` alongside `-p` and `--dangerously-skip-permissions`.
It states this is an automated, non-interactive build with no human to approve a
design, so approval-gated workflows do not apply — implement directly and run the
verification loop until green.

### 2. False-success guard (`src/git-state.ts` + `src/index.ts`)

A pristine scaffold passes all four checks (`svelte-check` / `biome` / `prettier`
/ `vite build`), so "green" alone cannot distinguish a real build from an agent
that wrote nothing.

**Fix:** new `src/git-state.ts` (ported verbatim from astro-mate):
`gitHead(cwd)`, `gitDirty(cwd)`, `projectChangedSince(cwd, baselineHead)` (true
if HEAD moved or tree dirty; true when git is unavailable, so it never wrongly
blocks). In `runLoop`: snapshot `gitHead(cwd)` before the loop; after a green
verification, require `projectChangedSince(cwd, baseline)` before `printSuccess`.
If nothing changed, treat it as a failure — feed a clear corrective message back
to the agent and retry.

### 3. Dynamic model aliases (`src/stack.ts`)

`MODEL_OPTIONS` values become tier aliases; labels carry the current concrete
version as a hint. `runner.ts` is unchanged — it already passes `--model <value>`
verbatim and `claude --model` resolves `opus`/`sonnet`/`haiku` to the newest
model in each tier. A full ID still works.

```ts
export const MODEL_OPTIONS: { value: string; label: string; hint?: string }[] = [
  { value: 'sonnet', label: 'Claude Sonnet (latest)', hint: 'balanced, fast — currently 4.6' },
  { value: 'opus', label: 'Claude Opus (latest)', hint: 'smartest, costliest — currently 4.8' },
  { value: 'haiku', label: 'Claude Haiku (latest)', hint: 'cheap, small edits — currently 4.5' },
];
```

Default stays Sonnet (index 0). `.svelte-mate.json` stores the alias; `fix` reuses it.

### 4. Accessibility (prompt-guidance approach)

None of the four static checks can catch contrast — it is only defined against
computed styles in a rendered DOM, and adding a headless-Chrome/Lighthouse gate
was rejected (heavy, flaky, needs the site served). Address it at the **prompt**
layer: a Required-outcome item mandates WCAG 2.1 AA contrast (≥4.5:1 normal text,
≥3:1 large text), warns about muted Tailwind shade pairings that fail
(`text-*-400/500` on light backgrounds), and requires landmarks, a single
`<h1>`, `alt` text, accessible names, and visible focus.

## SEO Baseline (generated files)

### Site-URL constant — `src/lib/site.ts` (new)

SvelteKit has no `Astro.site`. The scaffold bakes the resolved production URL into
a constant module so `Seo.svelte` and the sitemap can build absolute URLs without
`.env` plumbing:

```ts
// Production origin used for canonical URLs and the sitemap.
// TODO: set your production URL  ← emitted only when the placeholder is used
export const SITE_URL = 'https://example.com';
```

Blank `--site`/prompt → `https://example.com` placeholder with the `// TODO`
comment. A non-empty value omits the TODO. No trailing slash (normalized at
scaffold time).

### `src/lib/components/Seo.svelte` (new — single purpose)

Props:

```ts
interface Props {
  title: string;              // required
  description: string;        // required
  image?: string;             // OG image URL (absolute-ized against SITE_URL); omitted if absent
  canonical?: string;         // default: SITE_URL + page.url.pathname
  type?: 'website' | 'article'; // default 'website'
  noindex?: boolean;          // default false
  jsonLd?: Record<string, unknown> | Record<string, unknown>[]; // application/ld+json
}
```

Uses `import { page } from '$app/state'` for the pathname (SvelteKit 2.12+ rune-
based store; svelte-check-clean under Svelte 5). Renders into `<svelte:head>`:
`<title>`, `<meta name="description">`, canonical `<link>`, Open Graph tags
(`og:title`/`description`/`type`/`url`, `og:image` only when `image` is set),
Twitter Card tags, `<meta name="robots" content="noindex, nofollow">` when
`noindex`, and a JSON-LD `<script type="application/ld+json">` when `jsonLd` is
provided (serialized with `{@html JSON.stringify(jsonLd)}`).

### `src/routes/+layout.svelte` (unchanged)

`<Seo>` is rendered **per page**, not in the layout — a layout cannot read a
page's SEO props without introducing a `load`-data SEO channel, which is more
machinery than the baseline warrants. So `+layout.svelte` keeps exactly its
current form (imports `app.css`, renders `{@render children()}`); the global
`<html lang>` / body chrome stays in `app.html`. The prompt instructs the agent
to render `<Seo>` (or at minimum a `<title>` + `<meta description>`) on every
page it creates.

### `src/routes/+page.svelte` (changed)

Renders `<Seo title="…" description="…" jsonLd={…WebSite…} />` (the default
`WebSite` JSON-LD lives here, on the home page) plus the existing hero markup.

### `static/robots.txt` (new)

```
User-agent: *
Allow: /

# AI crawlers explicitly welcomed
User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: Google-Extended
Allow: /

Sitemap: <SITE_URL>/sitemap.xml
```

Files in `static/` are served verbatim at the site root by SvelteKit. The
`Sitemap:` host is the resolved `SITE_URL`.

## Sitemap — `src/routes/sitemap.xml/+server.ts` (new)

A prerendered endpoint that emits `sitemap.xml` at the site root:

```ts
import { SITE_URL } from '$lib/site';

export const prerender = true;

// Enumerate static pages; skip dynamic ([param]) and group ((group)) routes —
// the agent adds dynamic routes manually (see prompt guidance).
const pages = Object.keys(import.meta.glob('/src/routes/**/+page.svelte'))
  .map((p) =>
    p
      .replace('/src/routes', '')
      .replace(/\/\+page\.svelte$/, '')
      .replace(/\/\([^)]+\)/g, ''), // strip route groups
  )
  .filter((p) => !p.includes('['))   // skip dynamic params
  .map((p) => (p === '' ? '/' : p));

export function GET() {
  const urls = [...new Set(pages)]
    .map((p) => `  <url><loc>${SITE_URL}${p}</loc></url>`)
    .join('\n');
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemap.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
}
```

`prerender = true` makes `vite build` emit a static `sitemap.xml` even under
adapter-auto. The endpoint is the **only** prerendered route; the rest of the app
keeps SvelteKit's default dynamic behavior. (Exact `import.meta.glob` path
semantics and the XML namespace URL confirmed during implementation; the smoke
test asserts `sitemap.xml` is emitted and contains `<loc>`.)

## Fonts — `@fontsource-variable/inter`

Self-hosted variable font (no runtime Google request, no layout shift). Pinned in
`stack.ts`, added to generated `dependencies`, imported in `app.css`, and wired to
Tailwind's `--font-sans`:

```css
@import "tailwindcss";
@import "@fontsource-variable/inter";

@theme {
  --font-sans: "Inter Variable", ui-sans-serif, system-ui, sans-serif;
}
```

`<body>` (in `app.html`) gets the `font-sans` class. (The exact `@fontsource`
CSS family name — `"Inter Variable"` — and import specifier are confirmed against
the installed package during implementation; the smoke test asserts a font file
is emitted under the build output.)

**Auto-selection by the agent.** Inter ships by default (always a green build).
The prompt instructs the agent to swap to a Google/Fontsource font (or a
heading/body pairing) fitting the site's tone — install the matching
`@fontsource[-variable]/<name>` package, update the `@import` and `--font-sans`
(and add `--font-heading` + a base `h1–h6` rule if pairing). Leaving Inter is
always valid.

## Site-URL Capture

- `src/dialog.ts`: add `askText(label, hint?)` — a single-line readline prompt
  returning a trimmed string (`''` if skipped).
- `src/index.ts` `cmdNew`: after the deploy-target select, prompt
  **"Production URL (canonical + sitemap; optional, Enter to skip)"**. A
  `--site <url>` flag overrides/skips the prompt. Add `--site` to `USAGE`.
- `src/project-config.ts`: add `site?: string` to `ProjectConfig`; persist in
  `.svelte-mate.json`; `fix` reuses it (no re-prompt).
- `src/scaffold.ts`: add `site?` to `ScaffoldOptions`; thread the resolved `site`
  into `src/lib/site.ts`, `static/robots.txt`, and the sitemap. Blank →
  `https://example.com` placeholder + `// TODO` comment in `site.ts`.

## Prose Updates

- `src/prompt.ts`: tell the agent about `src/lib/site.ts` (`SITE_URL`),
  `Seo.svelte`, `static/robots.txt`, and the `sitemap.xml` endpoint; require a
  meaningful `title`/`description` (+ page-appropriate JSON-LD) per page via
  `<Seo>`; the font baseline + auto-selection guidance; the a11y/WCAG-AA item.
  Note that the sitemap auto-lists static routes and the agent must add dynamic
  routes manually. Keep the Tailwind-v4 wiring and Biome-vs-Prettier territory
  rules (update the Biome version reference).
- `README.md`: new versions, `--site` flag + Production URL prompt, the SEO /
  fonts / sitemap section, dynamic model aliases. Update the model-flag examples.

## Definition of Done — Verification

Cheap, agent-free verification that exercises every risky change:

1. `npm run build` of svelte-mate itself succeeds (tsc) under TS 6 + Biome 2.
2. `npm run check` (biome) of svelte-mate's own `src/` passes under Biome 2.
3. Scaffold into a temp dir **without invoking Claude**, then in that dir run the
   generated project's own checks: `npm install && npm run check && npm run
   build`. All four generated-project checks — `svelte-check`, `biome check`,
   `prettier --check`, `vite build` — must exit 0. Then assert the emitted build
   output contains: `sitemap.xml` (with a `<loc>` entry), a canonical `<link>`
   and `og:` tags in the prerendered/SSR HTML for `/`, `robots.txt` carrying the
   site host, and a self-hosted Inter font file. This validates the Biome 2
   schema, TS 6, the SvelteKit 7/vite 8 stack, `Seo.svelte`, the sitemap
   endpoint, the `SITE_URL` constant, and the font wiring.

## Risks / To Verify During Implementation

- **vite 8 × SvelteKit 2.61 × vite-plugin-svelte 7** — peer ranges confirmed
  consistent (above); the smoke test proves the build. If `vite build` breaks on
  8, fall back to the highest vite the stack accepts.
- **TS 6 × SvelteKit generated `tsconfig`** — confirm `.svelte-kit/tsconfig.json`
  (produced by `svelte-kit sync`) is TS-6-compatible under strict mode.
- **Exact Biome 2 `files.includes` globs** — confirm via Biome docs / `biome migrate`.
- **prettier-plugin-svelte 4 × prettier 3.8.3** compatibility, and that it still
  formats `.svelte` clean on the scaffold.
- **`$app/state` `page`** — available in SvelteKit 2.12+; confirm the pinned
  `^2.61.1` exposes it and `svelte-check` is clean (vs. the deprecated
  `$app/stores`).
- **`@fontsource-variable/inter` family name + import path** — confirm against the
  installed package (`"Inter Variable"`).
- **`import.meta.glob` in a prerendered endpoint** — confirm it resolves at build
  and the sitemap lists `/`.

## Files Touched

Modified: `package.json`, root `biome.json`, `src/stack.ts`, `src/deploy.ts`,
`src/scaffold.ts`, `src/dialog.ts`, `src/project-config.ts`, `src/index.ts`,
`src/runner.ts`, `src/prompt.ts`, `README.md`.
New (in this repo): `src/git-state.ts`.
New files emitted by the scaffold (not committed to this repo): `src/lib/site.ts`,
`src/lib/components/Seo.svelte`, `src/routes/sitemap.xml/+server.ts`,
`static/robots.txt`.
