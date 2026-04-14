import chalk from 'chalk';

export const log = {
  info: (msg: string): void => console.log(chalk.cyan('▸'), msg),
  step: (msg: string): void => console.log(chalk.magenta('⚙'), chalk.bold(msg)),
  ok: (msg: string): void => console.log(chalk.green('✔'), msg),
  warn: (msg: string): void => console.log(chalk.yellow('⚠'), msg),
  fail: (msg: string): void => console.log(chalk.red('✘'), msg),
  dim: (msg: string): void => console.log(chalk.dim(msg)),
  bare: (msg: string): void => console.log(msg),
};
