import { spawnSync } from 'node:child_process';
import { log } from './logger.js';

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

export function verify(cwd: string): VerifyResult {
  const steps: StepResult[] = [];
  for (const step of STEPS) {
    log.step(`Verify: ${step.name}`);
    const result = spawnSync(step.command, step.args, {
      cwd,
      encoding: 'utf-8',
      env: { ...process.env, CI: '1', FORCE_COLOR: '0' },
    });
    const combined = `${result.stdout ?? ''}\n${result.stderr ?? ''}`.trim();
    const ok = result.status === 0;
    steps.push({ name: step.name, ok, output: combined });
    if (ok) {
      log.ok(`${step.name} passed`);
    } else {
      log.fail(`${step.name} failed`);
      const failureSummary = formatFailure(step.name, combined);
      return { ok: false, steps, failureSummary };
    }
  }
  return { ok: true, steps };
}

function formatFailure(stepName: string, output: string): string {
  const lines = output.split('\n');
  const tail = lines.slice(-120).join('\n');
  return `Step "${stepName}" failed:\n\n${tail}`;
}
