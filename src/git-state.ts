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
