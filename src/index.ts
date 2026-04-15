#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import { DEPLOY_TARGETS, type DeployTarget } from './deploy.js';
import { collectPrompt, selectOption } from './dialog.js';
import { log } from './logger.js';
import { readProjectConfig, writeProjectConfig } from './project-config.js';
import { buildPrompt } from './prompt.js';
import { runClaude } from './runner.js';
import { scaffold } from './scaffold.js';
import { installSvelteSkills } from './skill.js';
import { MODEL_OPTIONS } from './stack.js';
import { type VerifyResult, verify } from './verify.js';

const USAGE = `
${chalk.bold('svelte-mate')} — focused SvelteKit + Tailwind v4 site generator

${chalk.bold('Usage:')}
  svelte-mate new [options]                Scaffold a site into the CURRENT directory and build it
  svelte-mate fix [options]                Iterate on an existing svelte-mate project (current dir)
  svelte-mate help                         Show this help

The prompt is collected interactively. You may also pass it as a trailing quoted argument for scripting.

${chalk.bold('Options:')}
  --model <id>            Claude model (skips interactive pick). e.g. claude-sonnet-4-6
  --deploy <target>       Deployment target (skips interactive pick): none|cloudflare|vercel|netlify
  --max-retries <n>       Outer retry budget when verification fails (default: 3)
  --timeout <seconds>     Per-attempt agent timeout (default: 3600)

${chalk.bold('Note:')} 'new' refuses to run if the current directory is not empty. Create and cd into a fresh directory first.

${chalk.bold('Workflow:')}
  mkdir coffee-site && cd coffee-site
  svelte-mate new          # then type your prompt
  # later…
  svelte-mate fix          # then type your change request
`;

interface ParsedArgs {
  command: string;
  prompt: string;
  maxRetries: number;
  model?: string;
  deploy?: DeployTarget;
  timeoutSec: number;
}

function parseArgs(argv: string[]): ParsedArgs | { error: string } {
  const [command, ...rest] = argv;
  if (!command) return { error: 'no command' };

  const positional: string[] = [];
  const flags: Record<string, string> = {};
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === undefined) continue;
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = rest[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = 'true';
      }
    } else {
      positional.push(a);
    }
  }

  const prompt = positional.join(' ').trim();
  const maxRetriesRaw = flags.maxRetries ?? flags['max-retries'];
  const timeoutRaw = flags.timeout;

  const validTargets: DeployTarget[] = ['none', 'cloudflare', 'vercel', 'netlify'];
  const deploy =
    flags.deploy && validTargets.includes(flags.deploy as DeployTarget)
      ? (flags.deploy as DeployTarget)
      : undefined;

  return {
    command,
    prompt,
    maxRetries: maxRetriesRaw ? Math.max(1, Number.parseInt(maxRetriesRaw, 10) || 3) : 3,
    model: flags.model,
    deploy,
    timeoutSec: timeoutRaw ? Math.max(60, Number.parseInt(timeoutRaw, 10) || 3600) : 3600,
  };
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));
  if ('error' in parsed) {
    console.log(USAGE);
    process.exit(1);
  }

  switch (parsed.command) {
    case 'new':
      await cmdNew(parsed);
      break;
    case 'fix':
      await cmdFix(parsed);
      break;
    case 'help':
    case '--help':
    case '-h':
      console.log(USAGE);
      break;
    default:
      console.error(chalk.red(`Unknown command: ${parsed.command}\n`));
      console.log(USAGE);
      process.exit(1);
  }
}

async function cmdNew(args: ParsedArgs): Promise<void> {
  const outDir = process.cwd();
  log.info(`Target directory: ${outDir}`);

  // Pre-flight: fail early before asking for anything the user can't use.
  if (fs.existsSync(outDir) && fs.readdirSync(outDir).length > 0) {
    log.fail(`Directory ${outDir} is not empty — refusing to scaffold.`);
    log.dim('  Create and cd into an empty directory, then run svelte-mate new again.');
    process.exit(1);
  }

  const model = args.model ?? (await selectOption('Pick a Claude model:', MODEL_OPTIONS, 0));
  const deployTarget =
    args.deploy ?? (await selectOption('Pick a deployment target:', DEPLOY_TARGETS, 0));

  let userPrompt = args.prompt;
  if (!userPrompt) {
    userPrompt = await collectPrompt('Describe the site you want to build:');
  }
  if (!userPrompt) {
    log.fail('No prompt provided. Aborting.');
    process.exit(1);
  }

  const scaffoldResult = scaffold(outDir, { deployTarget });
  if (!scaffoldResult.ok) {
    log.fail(scaffoldResult.error ?? 'Scaffold failed');
    if (scaffoldResult.existingFiles && scaffoldResult.existingFiles.length > 0) {
      const preview = scaffoldResult.existingFiles.slice(0, 10).join(', ');
      const more =
        scaffoldResult.existingFiles.length > 10
          ? `, …(+${scaffoldResult.existingFiles.length - 10} more)`
          : '';
      log.dim(`  Found: ${preview}${more}`);
      log.dim('  Create and cd into an empty directory, then run svelte-mate new again.');
    }
    process.exit(1);
  }

  writeProjectConfig(outDir, { model, deployTarget });

  const skillResult = installSvelteSkills(outDir);
  if (!skillResult.ok) {
    log.warn(`Skill install failed: ${skillResult.reason}. Continuing without it.`);
  }

  await runLoop({ cwd: outDir, userPrompt, args: { ...args, model } });
}

async function cmdFix(args: ParsedArgs): Promise<void> {
  const dir = process.cwd();
  if (!fs.existsSync(path.join(dir, 'package.json'))) {
    log.fail(`No package.json in ${dir}. cd into a svelte-mate project first.`);
    process.exit(1);
  }
  log.info(`Iterating on existing project at ${dir}`);

  const saved = readProjectConfig(dir);
  const model = args.model ?? saved?.model;
  if (model) log.dim(`  Model: ${model}${args.model ? '' : ' (from .svelte-mate.json)'}`);

  let userPrompt = args.prompt;
  if (!userPrompt) {
    userPrompt = await collectPrompt('What change do you want?');
  }
  if (!userPrompt) {
    log.fail('No prompt provided. Aborting.');
    process.exit(1);
  }

  const skillResult = installSvelteSkills(dir);
  if (!skillResult.ok) {
    log.warn(`Skill install failed: ${skillResult.reason}. Continuing without it.`);
  }

  await runLoop({ cwd: dir, userPrompt, args: { ...args, model } });
}

interface LoopInput {
  cwd: string;
  userPrompt: string;
  args: ParsedArgs;
}

async function runLoop(input: LoopInput): Promise<void> {
  const { cwd, userPrompt, args } = input;
  const controller = new AbortController();
  const onSig = (): void => {
    log.warn('Received interrupt, aborting agent');
    controller.abort();
  };
  process.on('SIGINT', onSig);
  process.on('SIGTERM', onSig);

  let lastVerify: VerifyResult | null = null;
  let lastError: string | undefined;

  for (let attempt = 1; attempt <= args.maxRetries; attempt++) {
    log.step(`\n═══ Attempt ${attempt} / ${args.maxRetries} ═══`);

    const prompt = buildPrompt({
      userPrompt,
      attempt,
      maxAttempts: args.maxRetries,
      previousError: lastError,
    });

    const runResult = await runClaude({
      cwd,
      prompt,
      model: args.model,
      timeoutMs: args.timeoutSec * 1000,
      signal: controller.signal,
    });

    if (controller.signal.aborted) {
      log.fail('Aborted by user before verification');
      process.exit(130);
    }

    if (runResult.exitCode !== 0) {
      log.warn(
        `Claude exited with code ${runResult.exitCode}${runResult.timedOut ? ' (timeout)' : ''}`,
      );
      lastError = `Claude exited with code ${runResult.exitCode}${runResult.timedOut ? ' (timeout)' : ''}.\n\nLast output:\n${runResult.outputTail}`;
      continue;
    }

    lastVerify = await verify(cwd);
    if (lastVerify.ok) {
      printSuccess(cwd, attempt);
      return;
    }
    lastError = lastVerify.failureSummary;
  }

  printFailure(cwd, args.maxRetries, lastVerify, lastError);
  process.exit(1);
}

function printSuccess(cwd: string, attempts: number): void {
  log.bare('');
  log.ok(
    chalk.bold.green(`Site built successfully in ${attempts} attempt${attempts === 1 ? '' : 's'}.`),
  );
  log.dim(`  Location: ${cwd}`);
  log.dim('  Next: npm run dev');
}

function printFailure(
  cwd: string,
  attempts: number,
  lastVerify: VerifyResult | null,
  lastError: string | undefined,
): void {
  log.bare('');
  log.fail(chalk.bold.red(`Gave up after ${attempts} attempt${attempts === 1 ? '' : 's'}.`));
  log.dim(`  Location: ${cwd}`);

  if (lastVerify) {
    log.bare('\n  Last verification state:');
    for (const s of lastVerify.steps) {
      const mark = s.ok ? chalk.green('✔') : chalk.red('✘');
      log.bare(`    ${mark} ${s.name}`);
    }
  }

  if (lastError) {
    log.bare(chalk.bold('\n  Final error (tail):'));
    const tail = lastError.split('\n').slice(-40).join('\n');
    log.bare(chalk.dim(tail));
  }

  log.bare('');
  log.dim('  Inspect the project manually, or re-run with --max-retries <n> to try more attempts.');
}

main().catch((e) => {
  console.error(chalk.red(`Fatal: ${e instanceof Error ? e.message : String(e)}`));
  process.exit(1);
});
