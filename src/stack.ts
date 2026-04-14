export const STACK = {
  svelte: '^5.0.0',
  sveltekit: '^2.0.0',
  vitePluginSvelte: '^5.0.0',
  adapterAuto: '^3.0.0',
  adapterCloudflare: '^5.0.0',
  adapterVercel: '^5.0.0',
  adapterNetlify: '^5.0.0',
  svelteCheck: '^4.0.0',
  vite: '^6.0.0',
  tailwind: '^4.0.0',
  biome: '^1.9.4',
  typescript: '^5.7.0',
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
  `Biome ${STACK.biome} (lint + format)`,
  `TypeScript ${STACK.typescript} (strict)`,
].join(', ');

export const MODEL_OPTIONS: { value: string; label: string; hint?: string }[] = [
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', hint: 'balanced, fast' },
  { value: 'claude-opus-4-6', label: 'Claude Opus 4.6', hint: 'smartest, slowest, costliest' },
  { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', hint: 'cheap, best for small edits' },
];
