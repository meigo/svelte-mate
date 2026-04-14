import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { log } from './logger.js';

export interface RunOptions {
  cwd: string;
  prompt: string;
  model?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface RunResult {
  exitCode: number | null;
  timedOut: boolean;
  durationMs: number;
  outputTail: string;
}

const TAIL_BYTES = 12_000;

export function runClaude(opts: RunOptions): Promise<RunResult> {
  const { cwd, prompt, model, timeoutMs = 60 * 60 * 1000, signal } = opts;

  const promptFile = path.join(cwd, '.svelte-mate-prompt.md');
  fs.writeFileSync(promptFile, prompt, 'utf-8');

  const args = ['-p', promptFile, '--dangerously-skip-permissions'];
  if (model) args.push('--model', model);

  log.step(`Running Claude Code (${model ?? 'default model'})`);

  return new Promise<RunResult>((resolve) => {
    const start = Date.now();
    const child = spawn('claude', args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    });

    let tail = '';
    const append = (chunk: string): void => {
      tail += chunk;
      if (tail.length > TAIL_BYTES) tail = tail.slice(-TAIL_BYTES);
    };

    child.stdout.on('data', (b: Buffer) => {
      const t = b.toString();
      append(t);
      process.stdout.write(t);
    });
    child.stderr.on('data', (b: Buffer) => {
      const t = b.toString();
      append(t);
      process.stderr.write(t);
    });

    let timedOut = false;
    let settled = false;
    const finish = (code: number | null): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      try {
        fs.unlinkSync(promptFile);
      } catch {
        // ignore
      }
      resolve({ exitCode: code, timedOut, durationMs: Date.now() - start, outputTail: tail });
    };

    const timer = setTimeout(() => {
      timedOut = true;
      log.warn(`Claude exceeded ${Math.round(timeoutMs / 1000)}s, terminating`);
      child.kill('SIGTERM');
      setTimeout(() => child.kill('SIGKILL'), 5_000);
    }, timeoutMs);

    const onAbort = (): void => {
      log.warn('Claude aborted');
      child.kill('SIGTERM');
    };
    signal?.addEventListener('abort', onAbort, { once: true });

    child.on('error', (err) => {
      log.fail(`Failed to spawn claude: ${err.message}`);
      finish(null);
    });
    child.on('close', (code) => finish(code));
  });
}
