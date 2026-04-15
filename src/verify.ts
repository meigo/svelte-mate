import { spawn } from 'node:child_process';
import { log } from './logger.js';
import { Spinner } from './spinner.js';

export interface VerifyStep {
  name: string;
  command: string;
  args: string[];
}

export interface StepResult {
  name: string;
  ok: boolean;
  output: string;
}

export interface VerifyResult {
  ok: boolean;
  steps: StepResult[];
  failureSummary?: string;
}

const STEPS: VerifyStep[] = [
  { name: 'svelte-check', command: 'npm', args: ['run', 'svelte:check', '--silent'] },
  { name: 'biome check', command: 'npm', args: ['run', 'biome:check', '--silent'] },
  { name: 'vite build', command: 'npm', args: ['run', 'build', '--silent'] },
];

export async function verify(cwd: string): Promise<VerifyResult> {
  const steps: StepResult[] = [];
  for (const step of STEPS) {
    const spinner = new Spinner(`Verify: ${step.name}`);
    spinner.start();
    let result: { ok: boolean; output: string };
    try {
      result = await runStep(step, cwd);
    } finally {
      spinner.stop();
    }
    steps.push({ name: step.name, ok: result.ok, output: result.output });
    if (result.ok) {
      log.ok(`${step.name} passed`);
    } else {
      log.fail(`${step.name} failed`);
      return { ok: false, steps, failureSummary: formatFailure(step.name, result.output) };
    }
  }
  return { ok: true, steps };
}

function runStep(step: VerifyStep, cwd: string): Promise<{ ok: boolean; output: string }> {
  return new Promise((resolve) => {
    const child = spawn(step.command, step.args, {
      cwd,
      env: { ...process.env, CI: '1', FORCE_COLOR: '0' },
    });
    const chunks: string[] = [];
    child.stdout.on('data', (b: Buffer) => chunks.push(b.toString()));
    child.stderr.on('data', (b: Buffer) => chunks.push(b.toString()));
    child.on('error', (err) => {
      resolve({ ok: false, output: `Failed to spawn: ${err.message}` });
    });
    child.on('close', (code) => {
      resolve({ ok: code === 0, output: chunks.join('').trim() });
    });
  });
}

function formatFailure(stepName: string, output: string): string {
  const lines = output.split('\n');
  const tail = lines.slice(-120).join('\n');
  return `Step "${stepName}" failed:\n\n${tail}`;
}
