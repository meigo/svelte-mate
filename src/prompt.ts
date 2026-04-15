import { SKILL_NAMES, STACK_SUMMARY } from './stack.js';

export interface PromptInput {
  userPrompt: string;
  attempt: number;
  maxAttempts: number;
  previousError?: string;
}

export function buildPrompt(input: PromptInput): string {
  const { userPrompt, attempt, maxAttempts, previousError } = input;
  const isRetry = attempt > 1;

  const header = isRetry
    ? `# Retry attempt ${attempt} of ${maxAttempts}\n\nA previous attempt left the project failing verification. Fix the specific errors below — do not rewrite files that already work.\n\n\`\`\`\n${(previousError ?? '').slice(-6000)}\n\`\`\`\n`
    : '# Build this SvelteKit website';

  const skillList = SKILL_NAMES.map((n) => `  - \`.claude/skills/${n}/\``).join('\n');

  return `${header}

## User prompt

${userPrompt}

## Locked stack — do NOT deviate

${STACK_SUMMARY}

The project has already been scaffolded for you. Files in place:

- \`package.json\` — dependencies pinned; do not change SvelteKit/Svelte/Tailwind/Biome major versions.
- \`vite.config.ts\` — Tailwind v4 is wired via \`@tailwindcss/vite\` alongside \`@sveltejs/vite-plugin-svelte\`. Do not switch to the PostCSS Tailwind plugin.
- \`svelte.config.js\` — uses \`@sveltejs/adapter-auto\` and \`vitePreprocess\`. Keep adapter-auto unless the user's prompt explicitly requires a specific platform.
- \`src/app.css\` — contains \`@import "tailwindcss";\`. This is the Tailwind v4 entry. It is imported once from \`src/routes/+layout.svelte\`.
- \`src/app.html\` — HTML shell with \`%sveltekit.head%\` / \`%sveltekit.body%\` placeholders.
- \`src/routes/+layout.svelte\` — root layout, imports \`app.css\`. Add global chrome (nav, footer) here.
- \`src/routes/+page.svelte\` — home page. Replace its contents.
- \`src/app.d.ts\` — ambient types for \`App.Locals\`, \`App.PageData\`, etc.
- \`tsconfig.json\` — extends \`.svelte-kit/tsconfig.json\`. Keep strict mode. \`svelte-kit sync\` must have been run for this file to resolve.
- \`biome.json\` — Biome is the only linter/formatter for \`.ts\` / \`.js\` / \`.json\`. \`.svelte\` files are ignored by Biome.
- \`.prettierrc.json\` + \`.prettierignore\` — Prettier + \`prettier-plugin-svelte\` is the only formatter for \`.svelte\` files. Do not run Prettier against \`.ts\` / \`.js\` / \`.json\`; that is Biome's territory.
- Skills installed under \`.claude/skills/\`:
${skillList}
  Consult them for Svelte 5 runes, SvelteKit routing, load functions, form actions, styling, and deployment patterns.

## Svelte 5 / SvelteKit conventions

- Use **runes** (\`$state\`, \`$derived\`, \`$effect\`, \`$props\`). Do NOT use legacy \`export let\`, \`$:\` reactive statements, or stores for local component state.
- Components are \`.svelte\`; route files follow SvelteKit conventions (\`+page.svelte\`, \`+layout.svelte\`, \`+page.ts\`, \`+page.server.ts\`, \`+server.ts\`).
- Prefer server \`load\` functions for data. Use form actions for mutations. Reserve client-only code for genuinely interactive UI.
- Use Tailwind utility classes directly in \`.svelte\` templates. Keep \`app.css\` minimal (only \`@import "tailwindcss";\` plus genuinely global rules).

## Required outcome

1. Implement the user's prompt on top of the scaffold.
2. All Svelte + TypeScript must pass \`svelte-check\` with zero errors and zero warnings.
3. All \`.ts\` / \`.js\` / \`.json\` must pass \`biome check src/\` with zero errors (auto-fix with \`npm run biome:fix\` when safe).
4. All \`.svelte\` files must pass \`prettier --check "**/*.svelte"\` with zero errors (auto-fix with \`npm run prettier:fix\` when safe).
5. \`npm run build\` must succeed (SvelteKit production build) with no warnings that would break production.

## Your verification loop — run all four, fix until green

Before exiting, **you must** run every one of these and iterate until each returns 0:

\`\`\`bash
npm run svelte:check
npm run biome:check
npm run prettier:check
npm run build
\`\`\`

If an error appears, read it carefully, fix the root cause, and run the failing command again. Do not suppress errors with \`any\`, \`@ts-ignore\`, or biome \`// biome-ignore\` directives unless there is a genuinely unavoidable reason — and if you must, add a short comment explaining why.

Keep going until all four commands exit 0. Do not exit early claiming "the important parts work" — the verification loop is the definition of done.

## Scope discipline

- Do NOT install extra dependencies unless the user's prompt makes them necessary. No UI kits, no icon libraries, no analytics, no CMS. If the prompt asks for a feature that genuinely needs one (e.g. MDsveX, a specific deploy adapter), install the appropriate package.
- Do NOT create tests unless the user asked for them. This tool is for generating sites, not test suites.
- Do NOT touch files outside this project directory.
- Do NOT modify \`.claude/\` or \`biome.json\` or \`.prettierrc.json\` or the Tailwind/Vite wiring.

## Commit

When everything is green, make a single \`git commit\` with a descriptive message summarising what you built.
`;
}
