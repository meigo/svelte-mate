# svelte-mate

A focused CLI that generates **SvelteKit 2 + Svelte 5 + Tailwind v4 + Biome** websites with Claude Code. One command per site.

The stack is locked and explicit so the agent can't guess-and-fail:

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

## Install

Requires Node 20+, Git, and [Claude Code](https://docs.claude.com/en/docs/claude-code) on `$PATH`.

```bash
npm install
npm run build
npm link        # exposes the `svelte-mate` command globally
```

## Use

Both commands operate on the **current directory** and collect everything **interactively**. `new` refuses to run unless the directory is empty — create a fresh folder and `cd` in first.

```bash
mkdir coffee-site && cd coffee-site
svelte-mate new
# ▸ Pick a Claude model:
#   ● 1) Claude Sonnet (latest)  — balanced, fast — currently 4.6
#     2) Claude Opus (latest)    — smartest, costliest — currently 4.8
#     3) Claude Haiku (latest)   — cheap, small edits — currently 4.5
#
# ▸ Pick a deployment target:
#   ● 1) None               — adapter-auto, wire up deployment later
#     2) Cloudflare Pages   — adapter-cloudflare + wrangler
#     3) Vercel             — adapter-vercel + vercel CLI
#     4) Netlify            — adapter-netlify + netlify CLI
#
# ▸ Describe the site you want to build:
#   > marketing site for a coffee roastery, 4 pages, dark mode toggle
#   > (blank line to finish)

# later, in the same directory:
svelte-mate fix
# ▸ What change do you want?
```

`fix` remembers the model (and deploy target) that `new` picked by reading `.svelte-mate.json`. Override per-run with flags:

```bash
svelte-mate new --model opus --deploy cloudflare --site https://roastery.example "marketing site for a coffee roastery"
svelte-mate fix --model haiku "tighten the hero copy"
```

### Options

| Flag | Default | What it does |
|---|---|---|
| `--model <id>` | interactive on `new`, persisted for `fix` | `sonnet`, `opus`, `haiku` (dynamic latest of each tier), or a full ID like `claude-opus-4-8` |
| `--deploy <target>` | interactive on `new` | `none`, `cloudflare`, `vercel`, `netlify` |
| `--site <url>` | interactive on `new` | Production URL for canonical tags + sitemap. Skippable; baked into `src/lib/site.ts`. |
| `--max-retries <n>` | `3` | Outer retry budget when verification fails |
| `--timeout <seconds>` | `3600` | Per-attempt agent timeout |

### Deployment

When you pick a target other than `none`, svelte-mate swaps the SvelteKit adapter, writes the platform config, adds the platform CLI to devDeps, and adds an `npm run deploy` script:

| Target | Adapter | CLI | Platform file |
|---|---|---|---|
| `none` | `@sveltejs/adapter-auto` | — | — |
| `cloudflare` | `@sveltejs/adapter-cloudflare` | `wrangler` | `wrangler.toml` |
| `vercel` | `@sveltejs/adapter-vercel` | `vercel` | `vercel.json` |
| `netlify` | `@sveltejs/adapter-netlify` | `netlify-cli` | `netlify.toml` |

svelte-mate does **not** run the deploy or handle authentication — that stays with the platform's own CLI:

```bash
# after svelte-mate is done:
npm run deploy      # e.g. `wrangler pages deploy .svelte-kit/cloudflare`
```

You'll need to authenticate with the platform once (`wrangler login`, `vercel login`, `netlify login`) before the first deploy.

Picking a specific adapter instead of keeping `adapter-auto` is a deliberate choice: `adapter-auto` detects the target at build time and installs the matching adapter on demand, which is flaky in reproducible CI. Pinning the adapter up front makes the scaffold deterministic.

### SEO, fonts & AI discoverability

Every scaffold ships a baseline so generated sites are discoverable and styled from day one:

- **`Seo.svelte`** (`src/lib/components/`) — a `<svelte:head>` component: title, description, canonical URL, Open Graph, Twitter Card, and a JSON-LD slot. Render it per page with `title` + `description`.
- **`src/routes/sitemap.xml/+server.ts`** — a prerendered sitemap that auto-lists static pages; emitted at build (SvelteKit has no first-party sitemap integration, so this is a small endpoint rather than a plugin).
- **`static/robots.txt`** — allows all crawlers (incl. GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot, Google-Extended) and points at the sitemap.
- **`src/lib/site.ts`** — the `SITE_URL` constant used for canonical tags + sitemap. Set it at `new` time (prompt or `--site`), or edit the `https://example.com` placeholder later.
- **`@fontsource-variable/inter`** — a self-hosted variable font wired to Tailwind's `--font-sans` (no runtime Google request, no layout shift). The agent may swap it to fit the site.

There is intentionally **no `llms.txt`**: as of 2026 the major AI crawlers skip it and read HTML directly. The agentic-SEO story here is structured data (JSON-LD) + an AI-friendly `robots.txt` + clean semantic HTML.

## What it does, step by step

1. **Scaffolds** a fresh SvelteKit project into the current directory (empty required) with every config file pinned (`package.json`, `svelte.config.js`, `vite.config.ts`, `tsconfig.json`, `biome.json`, `src/app.html`, `src/app.css`, `src/app.d.ts`, `src/routes/+layout.svelte`, `src/routes/+page.svelte`, `src/lib/site.ts`, `src/lib/components/Seo.svelte`, `src/routes/sitemap.xml/+server.ts`, `static/robots.txt`). If you picked a deploy target, the adapter, platform config, and `npm run deploy` script are written too. Runs `npm install` + `svelte-kit sync`, commits the scaffold.
2. **Installs** the official Svelte Claude Code skills (`svelte-code-writer`, `svelte-core-bestpractices`) from `sveltejs/ai-tools` into `.claude/skills/` and writes a permissive `.claude/settings.json`. Saves your model + deploy choice to `.svelte-mate.json` so `fix` can reuse them.
3. **Invokes Claude Code** in the project directory with an explicit prompt that declares the locked stack, points at the installed skills, and demands `svelte-check` + `biome check` + `prettier --check` + `vite build` all pass.
4. **Verifies** by running those four commands itself after the agent exits.
5. **Retries** on verification failure — up to `--max-retries` times — feeding the previous error back to the agent.
6. **Fails honestly**. After the retry budget is spent, it prints the last failure and stops. No infinite loops, no silent "success".

## Scope

- One site per run, serial.
- Your prompt goes straight to the agent — no intake interview.
- Verification is hardcoded: `svelte-check`, `biome check`, `prettier --check`, `vite build`.
- Claude Code only (for now).
- Builds sites, not test suites — no test scaffolding.

## Design notes

- **Explicit over clever.** Every dep, every config file is hand-rolled and pinned. The agent never has to guess "is it `@tailwindcss/postcss` or `@tailwindcss/vite`?" — the scaffold has the answer already. Deploy targets pin the adapter for the same reason.
- **Honest failure beats eternal fixing.** The outer retry loop is capped. If Claude can't make it green in N tries, you see the real error and decide.
- **Runes-first.** The scaffolded `+page.svelte` uses `$state` and the layout uses `$props`, so the agent has no excuse to fall back on legacy Svelte 4 idioms.
- **Biome skips `.svelte`, Prettier owns `.svelte`.** Biome doesn't parse Svelte templates, so `*.svelte` is in its ignore list. `svelte-check` handles Svelte + TS correctness, Biome formats and lints `.ts` / `.js` / `.json`, and Prettier + `prettier-plugin-svelte` formats `.svelte` (scoped via `**/*.svelte` in the scripts — Prettier never touches non-Svelte files). Clear per-extension ownership, no tool overlap.

## Enhancement ideas

Things that have been discussed but not built. Not a roadmap — just a list to pick from when the time feels right.

- **Node adapter target.** A `node` deploy target using `@sveltejs/adapter-node` for self-hosted deployments (Docker, VPS). Would need a different deploy script (there isn't a first-party `node` CLI — it'd just be `npm run build` + instructions).
- **Tighter retry context.** Feed only the failing verification step's tail back to the agent, not the full previous log. Cuts tokens and reduces distraction on retry.
- **Skill version pin.** Currently clones `main` of `sveltejs/ai-tools`. Pinning to a release tag would make runs reproducible.
- **Additional skills.** `spences10/svelte-skills-kit` ships 10 more focused skills (runes, styling, remote functions, LayerChart, etc.). An opt-in flag could pull those in on top of the official two.
- **Integrate the MCP server.** `sveltejs/ai-tools` also ships an MCP remote server for Svelte docs lookup. Wiring it via `.claude/settings.json` → `mcp` would give the agent live docs at runtime instead of only the frozen skill content.
- **Other coding agents.** Abstract the runner behind a preset table (command template, prompt delivery, default model) to support Codex / Gemini CLI / Qwen Code. The skills are Claude-specific — other agents would need an equivalent `AGENTS.md` or inlined guidance.
