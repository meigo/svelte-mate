# svelte-mate v0.2 — Version Refresh + Hardening + SEO/Fonts Baseline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh every pinned dependency to current latest (incl. Biome 1→2, TypeScript 5→6, and the SvelteKit-ecosystem majors), port astro-mate's two headless-agent robustness fixes + dynamic model aliases + an a11y prompt requirement, and bake a SvelteKit-appropriate SEO + fonts baseline into the scaffolded output.

**Architecture:** `svelte-mate` is a TypeScript CLI (`src/*.ts`, built with `tsc` to `dist/`) that writes a fixed set of files into an empty directory, runs `npm install` + `svelte-kit sync`, then drives Claude Code headlessly and verifies with `svelte-check` / `biome` / `prettier` / `vite build`. Changes concentrate in the version table (`stack.ts`), the file-emitting scaffold (`scaffold.ts`), deploy config (`deploy.ts`), the interactive flow (`dialog.ts` / `index.ts` / `project-config.ts`), the agent runner (`runner.ts`), and a new `git-state.ts`. New scaffold-emitted files: `src/lib/site.ts`, `src/lib/components/Seo.svelte`, `src/routes/sitemap.xml/+server.ts`, `static/robots.txt`.

**Tech Stack:** Node 20+, TypeScript 6, Biome 2 (the tool's own `.ts`); in generated projects — SvelteKit 2.61 / Svelte 5.56 / vite-plugin-svelte 7 / vite 8, Tailwind 4.3, `@fontsource-variable/inter`, Prettier 3.8 + prettier-plugin-svelte 4 for `.svelte`.

**Testing note:** This repo has no unit-test framework and deliberately avoids one. Verification for every task is the project's real gate: `npm run build` (tsc), `npm run check` (Biome), and a final **agent-free scaffold-then-build smoke test** (Task 11). Do not add a test framework.

**Spec:** `docs/superpowers/specs/2026-06-01-version-refresh-seo-design.md`

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `package.json` | modify | Tool's own deps (Part D): Biome 2, TS 6, @types/node 24, tsx |
| `biome.json` (root) | modify | Bump `$schema` to v2 |
| `src/stack.ts` | modify | Version table, fontsource pin, stack summary, model aliases |
| `src/deploy.ts` | modify | Deploy CLI versions + Cloudflare compat date |
| `src/runner.ts` | modify | Non-interactive agent directive |
| `src/git-state.ts` | **create** | git HEAD/dirty helpers + `projectChangedSince` |
| `src/index.ts` | modify | False-success guard + site-URL prompt/flag wiring |
| `src/scaffold.ts` | modify | Refreshed configs + SEO/fonts/sitemap files; thread `site` |
| `src/dialog.ts` | modify | Add `askText()` single-line prompt |
| `src/project-config.ts` | modify | Persist `site` |
| `src/prompt.ts` | modify | Agent guidance: SEO, fonts, a11y, sitemap |
| `README.md` | modify | Document versions, `--site`, SEO/fonts, model aliases |

New files emitted by the scaffold into generated projects (not committed to this repo): `src/lib/site.ts`, `src/lib/components/Seo.svelte`, `src/routes/sitemap.xml/+server.ts`, `static/robots.txt`.

---

## Task 1: Part D — bump the tool's own dependencies

**Files:**
- Modify: `package.json` (devDependencies)
- Modify: `biome.json` (root, `$schema`)

- [ ] **Step 1: Bump devDependencies in `package.json`**

Replace the `devDependencies` block with:

```json
  "devDependencies": {
    "@biomejs/biome": "^2.4.16",
    "@types/node": "^24.0.0",
    "tsx": "^4.22.3",
    "typescript": "^6.0.0"
  },
```

- [ ] **Step 2: Bump the root `biome.json` schema to v2**

The root config has no `files.ignore` to migrate — only the schema URL changes. Replace line 2:

```json
  "$schema": "https://biomejs.dev/schemas/2.4.16/schema.json",
```

- [ ] **Step 3: Reinstall and rebuild under the new majors**

Run: `npm install && npm run build`
Expected: install succeeds; `tsc` exits 0 (TS 6 compiles the existing `src/` — `tsconfig.json` uses ES2022/bundler which TS 6 supports).

- [ ] **Step 4: Verify Biome 2 lints the tool's own source clean**

Run: `npm run check`
Expected: `biome check src/` exits 0. If Biome 2 reports a config-schema error, run `npx biome migrate --write` and re-run. If it reports new lint findings, fix them minimally (do not disable rules wholesale).

- [ ] **Step 5: Commit**

```bash
git add package.json biome.json package-lock.json
git commit -m "Bump tool deps to Biome 2 + TypeScript 6"
```

---

## Task 2: Refresh the scaffolded version table, pin fonts, switch model menu (`stack.ts`)

**Files:**
- Modify: `src/stack.ts:1-37`

- [ ] **Step 1: Replace the `STACK` constant** (lines 1-16)

```ts
export const STACK = {
  svelte: '^5.56.0',
  sveltekit: '^2.61.1',
  vitePluginSvelte: '^7.1.2',
  adapterAuto: '^7.0.1',
  adapterCloudflare: '^7.2.8',
  adapterVercel: '^6.3.3',
  adapterNetlify: '^6.0.4',
  svelteCheck: '^4.5.0',
  vite: '^8.0.0',
  tailwind: '^4.3.0',
  biome: '^2.4.16',
  prettier: '^3.8.3',
  prettierPluginSvelte: '^4.1.0',
  typescript: '^6.0.0',
  fontsourceInter: '^5.2.8',
} as const;
```

- [ ] **Step 2: Add the font line to `STACK_SUMMARY`** (lines 22-31)

Replace the array so the agent knows the font is pre-wired:

```ts
export const STACK_SUMMARY = [
  `SvelteKit ${STACK.sveltekit}`,
  `Svelte ${STACK.svelte} (runes mode)`,
  `Tailwind CSS ${STACK.tailwind} (via @tailwindcss/vite plugin)`,
  `Vite ${STACK.vite}`,
  `svelte-check ${STACK.svelteCheck}`,
  `Biome ${STACK.biome} (lint + format for .ts/.js/.json)`,
  `Prettier ${STACK.prettier} + prettier-plugin-svelte ${STACK.prettierPluginSvelte} (format for .svelte)`,
  `@fontsource-variable/inter ${STACK.fontsourceInter} (self-hosted Inter, wired to Tailwind --font-sans)`,
  `TypeScript ${STACK.typescript} (strict)`,
].join(', ');
```

- [ ] **Step 3: Replace `MODEL_OPTIONS` with dynamic tier aliases** (lines 33-37)

```ts
export const MODEL_OPTIONS: { value: string; label: string; hint?: string }[] = [
  { value: 'sonnet', label: 'Claude Sonnet (latest)', hint: 'balanced, fast — currently 4.6' },
  { value: 'opus', label: 'Claude Opus (latest)', hint: 'smartest, costliest — currently 4.8' },
  { value: 'haiku', label: 'Claude Haiku (latest)', hint: 'cheap, small edits — currently 4.5' },
];
```

Leave `SKILL_REPO`, `SKILL_SUBDIR_IN_REPO`, and `SKILL_NAMES` unchanged.

- [ ] **Step 4: Build + check**

Run: `npm run build && npm run check`
Expected: both exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/stack.ts
git commit -m "Refresh scaffold version table; pin @fontsource-variable/inter; dynamic model aliases"
```

---

## Task 3: Refresh deploy CLI versions (`deploy.ts`)

**Files:**
- Modify: `src/deploy.ts:32` (wrangler), `:38` (compat date), `:47` (vercel), `:66` (netlify-cli)

- [ ] **Step 1: Bump wrangler + Cloudflare compat date**

In the `cloudflare` config, replace the `cliDeps` (line 32):

```ts
    cliDeps: { wrangler: '^4.95.0' },
```

and in the `wrangler.toml` contents, change the compatibility date line (line 38):

```
compatibility_date = "2026-05-01"
```

- [ ] **Step 2: Bump vercel** (line 47)

```ts
    cliDeps: { vercel: '^54.6.1' },
```

- [ ] **Step 3: Bump netlify-cli** (line 66)

```ts
    cliDeps: { 'netlify-cli': '^26.0.2' },
```

- [ ] **Step 4: Build + check**

Run: `npm run build && npm run check`
Expected: both exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/deploy.ts
git commit -m "Bump deploy CLI versions (wrangler 4, vercel 54, netlify-cli 26)"
```

---

## Task 4: Make the inner agent immune to approval-gated workflows (`runner.ts`)

**Files:**
- Modify: `src/runner.ts:22-31` (add directive constant + args)

- [ ] **Step 1: Add the `NON_INTERACTIVE_DIRECTIVE` constant**

After the `const TAIL_BYTES = 12_000;` line (line 22), insert:

```ts
// svelte-mate drives the agent headlessly. If the surrounding environment installs
// a workflow that gates code-writing behind user approval (e.g. a global
// "brainstorm and get sign-off first" hook), a non-interactive `-p` run stalls
// without ever implementing anything — yet the scaffold still passes verification.
// This system-prompt directive overrides such gates: there is no human to ask.
const NON_INTERACTIVE_DIRECTIVE =
  'This is an automated, non-interactive SvelteKit site build invoked by a CLI. There is no human available to answer questions or approve a design. Do NOT brainstorm, do NOT present a plan for approval, do NOT offer a visual/browser companion, do NOT pause for confirmation. Any workflow or skill that requires user approval before writing code does not apply here — implement the requested site directly and run the verification loop until it is green.';
```

- [ ] **Step 2: Pass it via `--append-system-prompt`**

Replace the args construction (currently lines 30-31):

```ts
  const args = [
    '-p',
    promptFile,
    '--dangerously-skip-permissions',
    '--append-system-prompt',
    NON_INTERACTIVE_DIRECTIVE,
  ];
  if (model) args.push('--model', model);
```

- [ ] **Step 3: Build + check**

Run: `npm run build && npm run check`
Expected: both exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/runner.ts
git commit -m "Harden headless agent run against approval-gated workflows"
```

---

## Task 5: Close the false-success blind spot (`git-state.ts` + `index.ts`)

**Files:**
- Create: `src/git-state.ts`
- Modify: `src/index.ts:1-14` (import), `:203-257` (`runLoop`)

- [ ] **Step 1: Create `src/git-state.ts`** (ported verbatim from astro-mate)

```ts
import { spawnSync } from 'node:child_process';

/**
 * Returns the current git HEAD sha for `cwd`, or null if git is unavailable
 * or the directory is not a repo (e.g. the scaffold's `git init` failed).
 */
export function gitHead(cwd: string): string | null {
  const r = spawnSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf-8' });
  if (r.status !== 0) return null;
  const sha = r.stdout.trim();
  return sha.length > 0 ? sha : null;
}

/** Returns true if the working tree has uncommitted changes (tracked or untracked). */
export function gitDirty(cwd: string): boolean {
  const r = spawnSync('git', ['status', '--porcelain'], { cwd, encoding: 'utf-8' });
  if (r.status !== 0) return false;
  return r.stdout.trim().length > 0;
}

/**
 * Did the project change since `baselineHead`? True if HEAD moved or the tree is
 * dirty. When git is unavailable (baselineHead is null), returns true — we can't
 * prove the agent did nothing, so we don't block.
 */
export function projectChangedSince(cwd: string, baselineHead: string | null): boolean {
  if (baselineHead === null) return true;
  const head = gitHead(cwd);
  if (head === null) return true;
  return head !== baselineHead || gitDirty(cwd);
}
```

- [ ] **Step 2: Import the guard in `index.ts`**

After the existing `import { scaffold } from './scaffold.js';` line, add:

```ts
import { gitHead, projectChangedSince } from './git-state.js';
```

- [ ] **Step 3: Snapshot HEAD before the retry loop**

In `runLoop` (after `const { cwd, userPrompt, args } = input;`, before the `AbortController`), add:

```ts
  const baselineHead = gitHead(cwd);
```

- [ ] **Step 4: Require a real change before declaring success**

Replace the success branch inside the loop (currently lines 247-251):

```ts
    lastVerify = await verify(cwd);
    if (lastVerify.ok) {
      if (!projectChangedSince(cwd, baselineHead)) {
        log.fail('Verification passed but the project is unchanged — the agent wrote nothing.');
        lastError =
          'Verification passed, but you made no changes to the project. The bare scaffold already passes all four checks, so a green build with no edits does not count. You must actually implement the requested site (create/edit files) and then make all four verification commands pass.';
        continue;
      }
      printSuccess(cwd, attempt);
      return;
    }
    lastError = lastVerify.failureSummary;
```

- [ ] **Step 5: Build + check**

Run: `npm run build && npm run check`
Expected: both exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/git-state.ts src/index.ts
git commit -m "Guard against false success when the agent makes no changes"
```

---

## Task 6: Scaffold — configs, Biome v2, fonts, site threading, SEO/sitemap files (`scaffold.ts`)

This is the largest task. It touches `ScaffoldOptions`, the `writeFiles` map, `packageJson`, `biomeConfig`, `appCss`, `appHtml`, `indexPage`, and adds four new emitters (`siteFile`, `seoComponent`, `sitemapEndpoint`, `robotsTxt`). Commit once at the end.

**Files:**
- Modify: `src/scaffold.ts:8-10` (ScaffoldOptions), `:38` (writeFiles call), `:73-97` (writeFiles), `:120-123` (packageJson deps), `:193-209` (biomeConfig), `:268` (appHtml body), `:275-278` (appCss), `:308-325` (indexPage); add new emitter functions.

- [ ] **Step 1: Add `site` to `ScaffoldOptions`** (lines 8-10)

```ts
export interface ScaffoldOptions {
  deployTarget?: DeployTarget;
  site?: string;
}
```

- [ ] **Step 2: Thread `site` into `writeFiles`** — change the call on line 38:

```ts
  writeFiles(dir, opts.site);
```

- [ ] **Step 3: Replace the `writeFiles` function** (lines 73-97)

Resolves the site (blank → placeholder) and emits the new files. Note the new `src/lib/site.ts`, `src/lib/components/Seo.svelte`, `src/routes/sitemap.xml/+server.ts`, and `static/robots.txt`:

```ts
function writeFiles(dir: string, site?: string): void {
  const resolvedSite = (site?.trim() || 'https://example.com').replace(/\/+$/, '');
  const isPlaceholder = !site?.trim();

  const files: Record<string, string> = {
    'package.json': packageJson(path.basename(dir)),
    'svelte.config.js': svelteConfig(),
    'vite.config.ts': viteConfig(),
    'tsconfig.json': tsconfig(),
    'biome.json': biomeConfig(),
    '.prettierrc.json': prettierConfig(),
    '.prettierignore': prettierIgnore(),
    '.gitignore': gitignore(),
    'src/app.html': appHtml(),
    'src/app.css': appCss(),
    'src/app.d.ts': appDts(),
    'src/lib/site.ts': siteFile(resolvedSite, isPlaceholder),
    'src/lib/components/Seo.svelte': seoComponent(),
    'src/routes/+layout.svelte': rootLayout(),
    'src/routes/+page.svelte': indexPage(),
    'src/routes/sitemap.xml/+server.ts': sitemapEndpoint(),
    'static/favicon.svg': favicon(),
    'static/robots.txt': robotsTxt(resolvedSite),
    'README.md': `# ${path.basename(dir)}\n\nGenerated by svelte-mate. Stack: SvelteKit ${STACK.sveltekit}, Svelte ${STACK.svelte}, Tailwind ${STACK.tailwind}, @fontsource-variable/inter, Biome (\`.ts\`/\`.js\`/\`.json\`), Prettier + prettier-plugin-svelte (\`.svelte\`), TypeScript strict.\n\n## Dev\n\n\`\`\`bash\nnpm run dev        # dev server\nnpm run build      # production build\nnpm run preview    # preview production build\nnpm run check      # svelte-check + biome check + prettier check\n\`\`\`\n`,
  };

  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content, 'utf-8');
  }
}
```

- [ ] **Step 4: Add `@fontsource-variable/inter` to generated dependencies** (lines 120-123)

```ts
      dependencies: {
        '@fontsource-variable/inter': STACK.fontsourceInter,
        '@tailwindcss/vite': STACK.tailwind,
        tailwindcss: STACK.tailwind,
      },
```

- [ ] **Step 5: Migrate `biomeConfig()` to the Biome v2 schema** (lines 193-209)

`files.ignore` (v1) becomes `files.includes` with `!`-negation globs; `*.svelte` stays excluded so Prettier owns it:

```ts
function biomeConfig(): string {
  return `${JSON.stringify(
    {
      $schema: 'https://biomejs.dev/schemas/2.4.16/schema.json',
      vcs: { enabled: true, clientKind: 'git', useIgnoreFile: true },
      files: {
        ignoreUnknown: true,
        includes: [
          '**',
          '!**/build',
          '!**/.svelte-kit',
          '!**/node_modules',
          '!**/dist',
          '!**/*.svelte',
        ],
      },
      formatter: { enabled: true, indentStyle: 'space', indentWidth: 2, lineWidth: 100 },
      linter: { enabled: true, rules: { recommended: true } },
      javascript: { formatter: { quoteStyle: 'single', semicolons: 'always' } },
    },
    null,
    2,
  )}\n`;
}
```

> If Biome 2 rejects these `files.includes` globs at runtime (Task 11 smoke test), run `npx biome migrate --write` inside the scaffold against a v1 config to learn the exact key names, then mirror them here.

- [ ] **Step 6: Wire the font into `appCss()`** (lines 275-278)

```ts
function appCss(): string {
  return `@import "tailwindcss";
@import "@fontsource-variable/inter";

@theme {
  --font-sans: "Inter Variable", ui-sans-serif, system-ui, sans-serif;
}
`;
}
```

> The `@fontsource-variable/inter` CSS family name is `"Inter Variable"`. If Task 11 shows the font not applying, confirm the family name from `node_modules/@fontsource-variable/inter/index.css` and adjust.

- [ ] **Step 7: Add `font-sans` to the `<body>` in `appHtml()`** (line 268)

Replace the `<body ...>` open tag with:

```html
  <body data-sveltekit-preload-data="hover" class="min-h-screen bg-white font-sans text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
```

- [ ] **Step 8: Add the `siteFile()` emitter**

Add near the other emitters (e.g. before `appHtml()`):

```ts
function siteFile(site: string, isPlaceholder: boolean): string {
  const todo = isPlaceholder ? '// TODO: set your production URL\n' : '';
  return `// Production origin used for canonical URLs (Seo.svelte) and the sitemap.
${todo}export const SITE_URL = '${site}';
`;
}
```

- [ ] **Step 9: Add the `seoComponent()` emitter**

Uses `$app/state`'s `page` (SvelteKit 2.12+) for the pathname and `$lib/site` for the origin. The JSON-LD script tag uses an escaped `<\/script>` to avoid breaking the surrounding template, and escapes `<` in the payload for safety:

```ts
function seoComponent(): string {
  return `<script lang="ts">
  import { page } from '$app/state';
  import { SITE_URL } from '$lib/site';

  interface Props {
    title: string;
    description: string;
    image?: string;
    canonical?: string;
    type?: 'website' | 'article';
    noindex?: boolean;
    jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  }

  let {
    title,
    description,
    image,
    canonical,
    type = 'website',
    noindex = false,
    jsonLd,
  }: Props = $props();

  const canonicalURL = $derived(canonical ?? new URL(page.url.pathname, SITE_URL).href);
  const imageURL = $derived(image ? new URL(image, SITE_URL).href : undefined);
  const jsonLdScript = $derived(
    jsonLd
      ? \`<script type="application/ld+json">\${JSON.stringify(jsonLd).replace(/</g, '\\\\u003c')}<\\/script>\`
      : '',
  );
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <link rel="canonical" href={canonicalURL} />
  {#if noindex}
    <meta name="robots" content="noindex, nofollow" />
  {/if}

  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:type" content={type} />
  <meta property="og:url" content={canonicalURL} />
  {#if imageURL}
    <meta property="og:image" content={imageURL} />
  {/if}

  <meta name="twitter:card" content={imageURL ? 'summary_large_image' : 'summary'} />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
  {#if imageURL}
    <meta name="twitter:image" content={imageURL} />
  {/if}

  {#if jsonLd}
    {@html jsonLdScript}
  {/if}
</svelte:head>
`;
}
```

- [ ] **Step 10: Add the `sitemapEndpoint()` emitter**

Prerendered endpoint; enumerates static pages via `import.meta.glob`, skips dynamic/group routes:

```ts
function sitemapEndpoint(): string {
  return `import { SITE_URL } from '$lib/site';

export const prerender = true;

// Auto-list static pages. Dynamic ([param]) and group ((group)) routes are
// skipped — add dynamic URLs manually if you need them in the sitemap.
const pages = Object.keys(import.meta.glob('/src/routes/**/+page.svelte'))
  .map((p) =>
    p
      .replace('/src/routes', '')
      .replace(/\\/\\+page\\.svelte$/, '')
      .replace(/\\/\\([^)]+\\)/g, ''),
  )
  .filter((p) => !p.includes('['))
  .map((p) => (p === '' ? '/' : p));

export function GET() {
  const urls = [...new Set(pages)]
    .map((p) => \`  <url><loc>\${SITE_URL}\${p}</loc></url>\`)
    .join('\\n');
  const body = \`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
\${urls}
</urlset>\`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
}
`;
}
```

- [ ] **Step 11: Add the `robotsTxt()` emitter**

```ts
function robotsTxt(site: string): string {
  return `User-agent: *
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

Sitemap: ${site}/sitemap.xml
`;
}
```

- [ ] **Step 12: Replace `indexPage()` to render `<Seo>`** (lines 308-325)

```ts
function indexPage(): string {
  return `<script lang="ts">
  import Seo from '$lib/components/Seo.svelte';
  import { SITE_URL } from '$lib/site';

  const greeting = $state('Hello from svelte-mate');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'svelte-mate',
    url: SITE_URL,
  };
</script>

<Seo
  title="Hello from svelte-mate"
  description="A starter site scaffolded by svelte-mate — SvelteKit, Tailwind, and a built-in SEO baseline."
  {jsonLd}
/>

<main class="mx-auto max-w-2xl px-6 py-24">
  <h1 class="text-4xl font-bold tracking-tight">{greeting}</h1>
  <p class="mt-4 text-lg text-slate-600 dark:text-slate-400">
    Edit <code class="rounded bg-slate-100 px-1.5 py-0.5 text-sm dark:bg-slate-800">src/routes/+page.svelte</code>
    to begin.
  </p>
</main>
`;
}
```

> `rootLayout()` is unchanged — `<Seo>` is rendered per page, not in the layout.

- [ ] **Step 13: Build + check the tool itself**

Run: `npm run build && npm run check`
Expected: both exit 0. (The generated `.svelte`/CSS/`.ts` are validated in Task 11's smoke test.)

- [ ] **Step 14: Commit**

```bash
git add src/scaffold.ts
git commit -m "Bake SEO + fonts + sitemap baseline into scaffold; migrate biome.json to v2"
```

---

## Task 7: Site-URL capture — prompt, flag, persistence (`dialog.ts`, `project-config.ts`, `index.ts`)

**Files:**
- Modify: `src/dialog.ts` (add `askText`)
- Modify: `src/project-config.ts:7-10` (add `site`)
- Modify: `src/index.ts:5-13` (import), `:26-31` (USAGE), `:41-48` (ParsedArgs), `:83-91` (parseArgs return), `:130-158` (cmdNew)

- [ ] **Step 1: Add `askText()` to `dialog.ts`**

Append this single-line prompt helper (mirrors the readline style already used):

```ts
export function askText(label: string, hint?: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log(chalk.cyan('▸'), chalk.bold(label));
    if (hint) console.log(chalk.dim(`  ${hint}`));
    rl.question(chalk.dim('  > '), (ans) => {
      rl.close();
      resolve(ans.trim());
    });
  });
}
```

- [ ] **Step 2: Add `site` to `ProjectConfig`** (`project-config.ts` lines 7-10)

```ts
export interface ProjectConfig {
  model: string;
  deployTarget: DeployTarget;
  site?: string;
}
```

- [ ] **Step 3: Import `askText` in `index.ts`**

Change the dialog import (line 6) to:

```ts
import { askText, collectPrompt, selectOption } from './dialog.js';
```

- [ ] **Step 4: Add `site` to `ParsedArgs`** (lines 41-48)

Add after `deploy?: DeployTarget;`:

```ts
  site?: string;
```

- [ ] **Step 5: Parse the `--site` flag** (parseArgs return, lines 83-90)

Add to the returned object (after `deploy,`):

```ts
    site: flags.site && flags.site !== 'true' ? flags.site : undefined,
```

- [ ] **Step 6: Prompt for the production URL in `cmdNew` and thread it through**

In `cmdNew`, after the `deployTarget` selection (line 132) and before collecting the prompt, add:

```ts
  const site =
    args.site ??
    (await askText(
      'Production URL (canonical + sitemap; optional, Enter to skip):',
      'e.g. https://example.com',
    ));
```

Change the scaffold call (line 143):

```ts
  const scaffoldResult = scaffold(outDir, { deployTarget, site });
```

Change the config write (line 158):

```ts
  writeProjectConfig(outDir, { model, deployTarget, site: site || undefined });
```

> `cmdFix` needs no change: it never re-scaffolds, so the production URL is already baked into `src/lib/site.ts`.

- [ ] **Step 7: Add `--site` to the USAGE help text**

In the `Options:` block (after the `--deploy` line, line 28), add:

```
  --site <url>            Production URL for canonical + sitemap (skips the prompt)
```

- [ ] **Step 8: Build + check**

Run: `npm run build && npm run check`
Expected: both exit 0.

- [ ] **Step 9: Commit**

```bash
git add src/dialog.ts src/project-config.ts src/index.ts
git commit -m "Capture optional production URL via prompt + --site flag, persisted"
```

---

## Task 8: Update the agent prompt (`prompt.ts`)

**Files:**
- Modify: `src/prompt.ts:30-45` (files-in-place list), `:54-60` (Required outcome), `:78-82` (scope discipline)

- [ ] **Step 1: Add the new files to the "Files in place" list**

After the `.prettierrc.json` bullet (line 42), add:

```ts
- \`src/lib/site.ts\` — exports \`SITE_URL\` (your production origin). \`Seo.svelte\` and the sitemap import it; don't hardcode the domain elsewhere.
- \`src/lib/components/Seo.svelte\` — head component (title, description, canonical, Open Graph, Twitter, JSON-LD). Render it once per page with a real \`title\` + \`description\`.
- \`src/routes/sitemap.xml/+server.ts\` — prerendered sitemap; auto-lists static pages via \`import.meta.glob\`. New static routes are picked up automatically; for dynamic (\`[param]\`) routes, add their URLs there manually.
- \`static/robots.txt\` — allows all crawlers incl. AI bots and points at the sitemap. Keep it valid if you edit it.
- \`src/app.css\` — also imports \`@fontsource-variable/inter\` and wires it to Tailwind's \`--font-sans\`; \`<body>\` carries \`font-sans\`.
```

- [ ] **Step 2: Add SEO, a11y, and fonts items to "Required outcome"**

After the existing item 5 (`npm run build`…, line 60), add:

```ts
6. Give every page a meaningful title and description by rendering \`<Seo title="…" description="…" />\` (import from \`$lib/components/Seo.svelte\`). Add page-appropriate JSON-LD via the \`jsonLd\` prop where it fits (Article, Product, Organization). Use semantic HTML: landmarks (\`<header>\`, \`<main>\`, \`<footer>\`), one \`<h1>\` per page, \`alt\` on images, accessible names on controls, visible focus states.
7. Meet WCAG 2.1 AA color contrast: ≥4.5:1 for normal text, ≥3:1 for large text. Beware muted Tailwind pairings that fail on light backgrounds (e.g. \`text-slate-400\`/\`text-slate-500\` on white) — pick a darker shade or a darker background.
8. Choose a Google/Fontsource font (or a heading/body pairing) that fits the site's tone/brand and wire it: install the matching \`@fontsource[-variable]/<name>\` package, update the \`@import\` and \`--font-sans\` in \`src/app.css\` (add a \`--font-heading\` variable + an \`h1\`–\`h6\` base rule if pairing). Leaving Inter is valid.
```

- [ ] **Step 3: Loosen the scope-discipline dependency bullet** (line 79)

Replace it with:

```ts
- Do NOT install extra dependencies unless the user's prompt makes them necessary. No UI kits, no icon libraries, no analytics, no CMS. Installing one additional \`@fontsource[-variable]/<name>\` package for the chosen font is expected and fine. If the prompt genuinely needs a feature (e.g. MDsveX, a specific deploy adapter), install the appropriate package. The sitemap and SEO baseline are already wired — do not add a sitemap plugin.
```

- [ ] **Step 4: Build + check**

Run: `npm run build && npm run check`
Expected: both exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/prompt.ts
git commit -m "Tell the agent about the SEO/fonts baseline and add a WCAG-AA a11y requirement"
```

---

## Task 9: Update the README (`README.md`)

**Files:**
- Modify: `README.md:7-15` (stack list), `:34-37` (model menu echo), `:57-58` (examples), `:65` (model row), `:66` (add --site row), `:94` (file list), + new SEO section after Deployment

- [ ] **Step 1: Refresh the stack version list** (lines 7-15)

```markdown
- SvelteKit `^2.61.1` (adapter chosen at scaffold time)
- Svelte `^5.56.0` (runes mode)
- Tailwind CSS `^4.3.0` wired via `@tailwindcss/vite` — not the PostCSS plugin
- Vite `^8.0.0`
- `svelte-check` `^4.5.0` for `.svelte` + TypeScript type-checking
- Biome `^2.4.16` (linter + formatter for `.ts` / `.js` / `.json` — no ESLint)
- Prettier `^3.8.3` + `prettier-plugin-svelte` `^4.1.0` (formatter for `.svelte` only)
- `@fontsource-variable/inter` `^5.2.8` (self-hosted Inter, wired to Tailwind `--font-sans`)
- TypeScript `^6.0.0` strict
- The official [Svelte Claude Code skills](https://github.com/sveltejs/ai-tools) (`svelte-code-writer`, `svelte-core-bestpractices`) installed into `.claude/skills/`
```

- [ ] **Step 2: Update the interactive model-menu echo** (lines 34-37)

```markdown
# ▸ Pick a Claude model:
#   ● 1) Claude Sonnet (latest)  — balanced, fast — currently 4.6
#     2) Claude Opus (latest)    — smartest, costliest — currently 4.8
#     3) Claude Haiku (latest)   — cheap, small edits — currently 4.5
```

- [ ] **Step 3: Update the example commands** (lines 57-58)

```bash
svelte-mate new --model opus --deploy cloudflare --site https://roastery.example "marketing site for a coffee roastery"
svelte-mate fix --model haiku "tighten the hero copy"
```

- [ ] **Step 4: Update the `--model` row and add a `--site` row** (lines 65-66)

```markdown
| `--model <id>` | interactive on `new`, persisted for `fix` | `sonnet`, `opus`, `haiku` (dynamic latest of each tier), or a full ID like `claude-opus-4-8` |
| `--deploy <target>` | interactive on `new` | `none`, `cloudflare`, `vercel`, `netlify` |
| `--site <url>` | interactive on `new` | Production URL for canonical tags + sitemap. Skippable; baked into `src/lib/site.ts`. |
```

- [ ] **Step 5: Add an SEO & fonts section** (after the Deployment section, before "What it does")

```markdown
### SEO, fonts & AI discoverability

Every scaffold ships a baseline so generated sites are discoverable and styled from day one:

- **`Seo.svelte`** (`src/lib/components/`) — a `<svelte:head>` component: title, description, canonical URL, Open Graph, Twitter Card, and a JSON-LD slot. Render it per page with `title` + `description`.
- **`src/routes/sitemap.xml/+server.ts`** — a prerendered sitemap that auto-lists static pages; emitted at build (SvelteKit has no first-party sitemap integration, so this is a small endpoint rather than a plugin).
- **`static/robots.txt`** — allows all crawlers (incl. GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot, Google-Extended) and points at the sitemap.
- **`src/lib/site.ts`** — the `SITE_URL` constant used for canonical tags + sitemap. Set it at `new` time (prompt or `--site`), or edit the `https://example.com` placeholder later.
- **`@fontsource-variable/inter`** — a self-hosted variable font wired to Tailwind's `--font-sans` (no runtime Google request, no layout shift). The agent may swap it to fit the site.

There is intentionally **no `llms.txt`**: as of 2026 the major AI crawlers skip it and read HTML directly. The agentic-SEO story here is structured data (JSON-LD) + an AI-friendly `robots.txt` + clean semantic HTML.
```

- [ ] **Step 6: Update the "What it does, step by step" file list** (line 94)

In step 1, extend the parenthetical pinned-files list to include `src/lib/site.ts`, `src/lib/components/Seo.svelte`, `src/routes/sitemap.xml/+server.ts`, and `static/robots.txt`.

- [ ] **Step 7: Commit**

```bash
git add README.md
git commit -m "Document v0.2: versions, --site, SEO/fonts baseline, dynamic model aliases"
```

---

## Task 10: Update the generated permission allowlist if needed (`skill.ts`) — verification only

**Files:**
- Inspect: `src/skill.ts:83-99` (the generated `.claude/settings.json` allowlist)

- [ ] **Step 1: Confirm the agent can run everything the new baseline needs**

The agent now installs extra `@fontsource` packages (covered by `Bash(npm:*)` / `Bash(npx:*)`, already allowed) and edits `src/app.css`, `src/lib/**`, `src/routes/**` (covered by `Write(./**)` / `Edit(./**)`, already allowed). No new permission entry is required.

- [ ] **Step 2: No-op confirmation**

No code change. This task exists only to record that the allowlist was reviewed against the new baseline and is sufficient. Do not commit.

---

## Task 11: Agent-free scaffold smoke test (definition of done)

Exercises every risky change — Biome 2 schema, TS 6, the SvelteKit 7 / vite 8 stack, `Seo.svelte`, the sitemap endpoint, the `SITE_URL` constant, and the font wiring — without invoking Claude.

**Files:** none modified (throwaway temp directory; nothing committed)

- [ ] **Step 1: Ensure the tool is built**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 2: Scaffold into a temp dir using the built `scaffold()` directly**

```bash
SMOKE_DIR="$(mktemp -d)/site"
node --input-type=module -e "import { scaffold } from '$(pwd)/dist/scaffold.js'; const r = scaffold(process.argv[1], { site: 'https://smoke.example' }); if (!r.ok) { console.error(r.error); process.exit(1); }" "$SMOKE_DIR"
echo "SMOKE_DIR=$SMOKE_DIR"
```

Expected: scaffold runs `npm install`, `svelte-kit sync`, git init/commit, prints "Scaffold complete".

- [ ] **Step 3: Run the generated project's own checks**

```bash
cd "$SMOKE_DIR" && npm run check && npm run build
```

Expected: `svelte-check` (0 errors/0 warnings), `biome check src/` (0 errors), `prettier --check "**/*.svelte"` (0 errors), and `vite build` all pass.

- [ ] **Step 4: Confirm SEO + font artifacts were emitted**

```bash
find "$SMOKE_DIR/.svelte-kit/output/prerendered" -name 'sitemap.xml' | head -1 && echo "sitemap emitted"
grep -rq '<loc>https://smoke.example' "$SMOKE_DIR/.svelte-kit/output/prerendered" && echo "sitemap has loc"
grep -q 'smoke.example' "$SMOKE_DIR/static/robots.txt" && echo "robots OK"
find "$SMOKE_DIR/.svelte-kit/output/client" -name '*.woff2' | head -1 && echo "font emitted"
test -f "$SMOKE_DIR/src/lib/components/Seo.svelte" && echo "Seo present"
```

Expected: `sitemap emitted`, `sitemap has loc`, `robots OK`, `font emitted`, `Seo present`.

> Note: the home page (`/`) is SSR, not prerendered, so its canonical/OG tags are not present as a static file — verifying rendered HTML would require serving the app, which is outside this cheap gate. A green `svelte-check` already proves `Seo.svelte` compiles and is wired; runtime HTML checks remain a possible future enhancement.

- [ ] **Step 5: Clean up**

```bash
cd - && rm -rf "$(dirname "$SMOKE_DIR")"
```

Expected: temp dir removed. Nothing to commit.

- [ ] **Step 6: If any check failed**

Investigate against the spec's risk list:
- **vite 8 build failure** → fall back to the highest vite the SvelteKit/vite-plugin-svelte pins accept (`stack.ts`).
- **TS 6 × `.svelte-kit/tsconfig.json`** → confirm strict-mode compatibility; only fall back to `typescript: '^5.x'` if 6.0 genuinely breaks.
- **Biome 2 `files.includes` rejected** → `npx biome migrate --write` inside the scaffold to learn exact keys; mirror into `biomeConfig()`.
- **prettier-plugin-svelte 4 reformats the generated `.svelte`** → run `prettier --write "**/*.svelte"` in the scaffold and copy the formatted output back into the `seoComponent()` / `indexPage()` emitter strings so the scaffold ships prettier-clean.
- **`$app/state` not found / svelte-check error** → confirm the pinned SvelteKit exposes it; it requires 2.12+.
- **font family name** → check `node_modules/@fontsource-variable/inter/index.css` for the exact `font-family` and adjust `appCss()`.

---

## Self-Review

- **Spec coverage:** Versions (Tasks 1-3) ✓; Biome v2 migration root + scaffold (Tasks 1, 6) ✓; non-interactive directive (Task 4) ✓; false-success guard + `git-state.ts` (Task 5) ✓; model aliases (Task 2) ✓; `Seo.svelte` + `site.ts` + JSON-LD + robots + sitemap endpoint (Task 6) ✓; fonts (Tasks 2, 6) ✓; `--site` capture/persist/placeholder (Task 7) ✓; prompt SEO/fonts/a11y guidance (Task 8) ✓; README (Task 9) ✓; permission review (Task 10) ✓; agent-free smoke verification (Task 11) ✓.
- **Placeholder scan:** No "TBD"/"implement later". The only literal `TODO` is intentional generated content in `src/lib/site.ts` when the site URL is a placeholder.
- **Type consistency:** `ScaffoldOptions.site`, `ProjectConfig.site`, and `ParsedArgs.site` all use `site?: string`. `askText(label, hint?)` signature matches its Task 7 call. `siteFile`, `seoComponent`, `sitemapEndpoint`, `robotsTxt` referenced in the `writeFiles` map (Task 6 Step 3) are all defined within Task 6 (Steps 8-11). `SITE_URL` is the export name used in `site.ts`, `Seo.svelte`, the sitemap endpoint, and `indexPage`. `gitHead` / `projectChangedSince` defined in Task 5 Step 1 match their use in Steps 2-4.
- **Ordering:** Task 6's `writeFiles` map references emitters defined later in the same task — committed together (single commit), so no broken intermediate state is published. The tool's own `npm run build` in Step 13 only compiles `src/` (the generated `.svelte` strings are data, not compiled here), so the tool builds green before the generated-project smoke test in Task 11.
