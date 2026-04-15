import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { log } from './logger.js';
import { SKILL_NAMES, SKILL_REPO, SKILL_SUBDIR_IN_REPO } from './stack.js';

export interface SkillInstallResult {
  ok: boolean;
  reason?: string;
}

export function installSvelteSkills(targetDir: string): SkillInstallResult {
  const skillsDir = path.join(targetDir, '.claude', 'skills');
  const allPresent = SKILL_NAMES.every((name) => {
    const p = path.join(skillsDir, name);
    return fs.existsSync(p) && fs.readdirSync(p).length > 0;
  });
  if (allPresent) {
    log.info('Svelte skills already present, skipping install');
    return { ok: true };
  }

  log.step('Installing Svelte Claude Code skills');

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'svelte-mate-skill-'));
  try {
    const clone = spawnSync('git', ['clone', '--depth=1', '--quiet', SKILL_REPO, tmpRoot], {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 120_000,
    });
    if (clone.status !== 0) {
      const stderr = clone.stderr?.toString() ?? '';
      return { ok: false, reason: `git clone failed: ${stderr.trim() || clone.status}` };
    }

    const srcSkillsDir = path.join(tmpRoot, SKILL_SUBDIR_IN_REPO);
    if (!fs.existsSync(srcSkillsDir)) {
      return {
        ok: false,
        reason: `skills dir "${SKILL_SUBDIR_IN_REPO}" not found in cloned repo`,
      };
    }

    fs.mkdirSync(skillsDir, { recursive: true });
    const installed: string[] = [];
    const missing: string[] = [];
    for (const name of SKILL_NAMES) {
      const src = path.join(srcSkillsDir, name);
      const dest = path.join(skillsDir, name);
      if (!fs.existsSync(src)) {
        missing.push(name);
        continue;
      }
      if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true });
      fs.cpSync(src, dest, { recursive: true });
      installed.push(name);
    }

    if (installed.length === 0) {
      return { ok: false, reason: `no expected skills found in repo: ${missing.join(', ')}` };
    }

    ensureClaudeSettings(targetDir);

    log.ok(`Installed skills: ${installed.map((n) => `.claude/skills/${n}`).join(', ')}`);
    if (missing.length > 0) {
      log.warn(`Some expected skills were missing from the repo: ${missing.join(', ')}`);
    }
    return { ok: true };
  } finally {
    try {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}

function ensureClaudeSettings(targetDir: string): void {
  const settingsPath = path.join(targetDir, '.claude', 'settings.json');
  if (fs.existsSync(settingsPath)) return;
  const settings = {
    permissions: {
      allow: [
        'Read(./**)',
        'Write(./**)',
        'Edit(./**)',
        'Bash(npm:*)',
        'Bash(npx:*)',
        'Bash(biome:*)',
        'Bash(prettier:*)',
        'Bash(svelte-kit:*)',
        'Bash(svelte-check:*)',
        'Bash(vite:*)',
        'Bash(git:*)',
      ],
    },
  };
  fs.writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, 'utf-8');
}
