import fs from 'node:fs';
import path from 'node:path';
import { log } from './logger.js';
import { STACK } from './stack.js';

export type DeployTarget = 'none' | 'cloudflare' | 'vercel' | 'netlify';

export const DEPLOY_TARGETS: { value: DeployTarget; label: string; hint?: string }[] = [
  { value: 'none', label: 'None', hint: 'adapter-auto, wire up deployment later' },
  { value: 'cloudflare', label: 'Cloudflare Pages', hint: 'adapter-cloudflare + wrangler' },
  { value: 'vercel', label: 'Vercel', hint: 'adapter-vercel + vercel CLI' },
  { value: 'netlify', label: 'Netlify', hint: 'adapter-netlify + netlify CLI' },
];

interface DeployConfig {
  adapterPackage: string;
  adapterVersion: string;
  cliDeps: Record<string, string>;
  deployScript: string;
  svelteConfig: string;
  platformFile: { path: string; contents: string };
  gitignoreExtras: string[];
}

const DEPLOY_CONFIGS: Record<
  Exclude<DeployTarget, 'none'>,
  (projectName: string) => DeployConfig
> = {
  cloudflare: (name) => ({
    adapterPackage: '@sveltejs/adapter-cloudflare',
    adapterVersion: STACK.adapterCloudflare,
    cliDeps: { wrangler: '^3.90.0' },
    deployScript: 'wrangler pages deploy .svelte-kit/cloudflare',
    svelteConfig: svelteConfigFor('@sveltejs/adapter-cloudflare', ''),
    platformFile: {
      path: 'wrangler.toml',
      contents: `name = "${name}"
compatibility_date = "2024-11-01"
pages_build_output_dir = ".svelte-kit/cloudflare"
`,
    },
    gitignoreExtras: ['.wrangler/'],
  }),
  vercel: () => ({
    adapterPackage: '@sveltejs/adapter-vercel',
    adapterVersion: STACK.adapterVercel,
    cliDeps: { vercel: '^37.0.0' },
    deployScript: 'vercel deploy --prod --yes',
    svelteConfig: svelteConfigFor('@sveltejs/adapter-vercel', "{ runtime: 'nodejs22.x' }"),
    platformFile: {
      path: 'vercel.json',
      contents: `${JSON.stringify(
        {
          $schema: 'https://openapi.vercel.sh/vercel.json',
          framework: 'sveltekit',
        },
        null,
        2,
      )}\n`,
    },
    gitignoreExtras: ['.vercel/'],
  }),
  netlify: () => ({
    adapterPackage: '@sveltejs/adapter-netlify',
    adapterVersion: STACK.adapterNetlify,
    cliDeps: { 'netlify-cli': '^24.0.0' },
    deployScript: 'netlify deploy --prod',
    svelteConfig: svelteConfigFor('@sveltejs/adapter-netlify', ''),
    platformFile: {
      path: 'netlify.toml',
      contents: `[build]
  command = "npm run build"
  publish = "build"
`,
    },
    gitignoreExtras: ['.netlify/'],
  }),
};

function svelteConfigFor(adapterPackage: string, adapterArgs: string): string {
  return `import adapter from '${adapterPackage}';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(${adapterArgs}),
    alias: {
      '@/*': 'src/*',
    },
  },
};

export default config;
`;
}

export function applyDeployConfig(projectDir: string, target: DeployTarget): void {
  if (target === 'none') return;

  const projectName = path.basename(projectDir);
  const config = DEPLOY_CONFIGS[target](projectName);

  log.step(`Wiring ${target} deployment`);

  // Rewrite svelte.config.js with the specific adapter
  fs.writeFileSync(path.join(projectDir, 'svelte.config.js'), config.svelteConfig, 'utf-8');

  // Platform file
  fs.writeFileSync(
    path.join(projectDir, config.platformFile.path),
    config.platformFile.contents,
    'utf-8',
  );

  // Update package.json: swap adapter-auto → specific adapter, add CLI, add deploy script
  const pkgPath = path.join(projectDir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as {
    scripts?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  pkg.scripts = { ...pkg.scripts, deploy: config.deployScript };
  const existingDeps = Object.entries(pkg.devDependencies ?? {}).filter(
    ([k]) => k !== '@sveltejs/adapter-auto',
  );
  const devDeps: Record<string, string> = {
    ...Object.fromEntries(existingDeps),
    [config.adapterPackage]: config.adapterVersion,
    ...config.cliDeps,
  };
  pkg.devDependencies = sortKeys(devDeps);
  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf-8');

  // Append to .gitignore
  const gitignorePath = path.join(projectDir, '.gitignore');
  const existing = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf-8') : '';
  const missing = config.gitignoreExtras.filter((line) => !existing.includes(line));
  if (missing.length > 0) {
    const appended = `${existing.trimEnd()}\n${missing.join('\n')}\n`;
    fs.writeFileSync(gitignorePath, appended, 'utf-8');
  }
}

function sortKeys(obj: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)));
}
