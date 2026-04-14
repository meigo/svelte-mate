import readline from 'node:readline';
import chalk from 'chalk';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

export function selectOption<T extends string>(
  label: string,
  options: SelectOption<T>[],
  defaultIndex = 0,
): Promise<T> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log(chalk.cyan('▸'), chalk.bold(label));
    options.forEach((opt, i) => {
      const marker = i === defaultIndex ? chalk.green('●') : chalk.dim('○');
      const line = `  ${marker} ${i + 1}) ${opt.label}${opt.hint ? chalk.dim(`  — ${opt.hint}`) : ''}`;
      console.log(line);
    });

    const ask = (): void => {
      rl.question(chalk.dim(`  [1-${options.length}, Enter for default] > `), (ans) => {
        const trimmed = ans.trim();
        if (trimmed === '') {
          rl.close();
          // biome-ignore lint/style/noNonNullAssertion: defaultIndex is validated by caller
          resolve(options[defaultIndex]!.value);
          return;
        }
        const n = Number.parseInt(trimmed, 10);
        if (Number.isInteger(n) && n >= 1 && n <= options.length) {
          rl.close();
          // biome-ignore lint/style/noNonNullAssertion: bounds checked above
          resolve(options[n - 1]!.value);
          return;
        }
        console.log(chalk.red(`  Pick a number between 1 and ${options.length}.`));
        ask();
      });
    };
    ask();
    console.log();
  });
}

export function collectPrompt(label: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const lines: string[] = [];

    console.log(chalk.cyan('▸'), chalk.bold(label));
    console.log(
      chalk.dim('  One prompt, multi-line OK. Finish with a blank line. Ctrl+C to abort.'),
    );
    console.log();

    const ask = (): void => {
      rl.question(chalk.dim('  > '), (line) => {
        if (line.trim() === '') {
          if (lines.length === 0) {
            ask();
            return;
          }
          rl.close();
          resolve(lines.join('\n').trim());
          return;
        }
        lines.push(line);
        ask();
      });
    };

    rl.on('close', () => {
      if (lines.length === 0) resolve('');
    });

    ask();
  });
}
