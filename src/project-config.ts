import fs from 'node:fs';
import path from 'node:path';
import type { DeployTarget } from './deploy.js';

export const CONFIG_FILENAME = '.svelte-mate.json';

export interface ProjectConfig {
  model: string;
  deployTarget: DeployTarget;
}

export function readProjectConfig(dir: string): Partial<ProjectConfig> | null {
  const p = path.join(dir, CONFIG_FILENAME);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as Partial<ProjectConfig>;
  } catch {
    return null;
  }
}

export function writeProjectConfig(dir: string, config: ProjectConfig): void {
  const p = path.join(dir, CONFIG_FILENAME);
  fs.writeFileSync(p, `${JSON.stringify(config, null, 2)}\n`, 'utf-8');
}
