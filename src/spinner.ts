import chalk from 'chalk';

// dots4 from cli-spinners (sindresorhus/cli-spinners) — braille walk.
const FRAMES = ['⠄', '⠆', '⠇', '⠋', '⠙', '⠸', '⠰', '⠠', '⠰', '⠸', '⠙', '⠋', '⠇', '⠆'];
const INTERVAL_MS = 80;

export class Spinner {
  private timer: NodeJS.Timeout | null = null;
  private frame = 0;
  private readonly label: string;
  private readonly stream: NodeJS.WriteStream = process.stderr;
  private readonly enabled: boolean;

  constructor(label: string) {
    this.label = label;
    this.enabled = Boolean(this.stream.isTTY) && !process.env.CI;
  }

  start(): void {
    if (this.timer) return;
    if (!this.enabled) {
      this.stream.write(`  ${chalk.dim('…')} ${this.label}\n`);
      return;
    }
    this.stream.write('\x1B[?25l'); // hide cursor
    this.tick();
    this.timer = setInterval(() => this.tick(), INTERVAL_MS);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.enabled) {
      this.stream.write('\r\x1B[K\x1B[?25h'); // clear line + show cursor
    }
  }

  private tick(): void {
    const f = FRAMES[this.frame % FRAMES.length] ?? '';
    this.frame++;
    this.stream.write(`\r  ${chalk.cyan(f)} ${this.label}`);
  }
}
