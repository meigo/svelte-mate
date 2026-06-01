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

export const SKILL_REPO = 'https://github.com/sveltejs/ai-tools.git';
export const SKILL_SUBDIR_IN_REPO = 'plugins/claude/svelte/skills';
export const SKILL_NAMES = ['svelte-code-writer', 'svelte-core-bestpractices'] as const;

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

export const MODEL_OPTIONS: { value: string; label: string; hint?: string }[] = [
  { value: 'sonnet', label: 'Claude Sonnet (latest)', hint: 'balanced, fast — currently 4.6' },
  { value: 'opus', label: 'Claude Opus (latest)', hint: 'smartest, costliest — currently 4.8' },
  { value: 'haiku', label: 'Claude Haiku (latest)', hint: 'cheap, small edits — currently 4.5' },
];
