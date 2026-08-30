import chalk from 'chalk';

export const info = (message: string) => chalk.blueBright('ℹ info ') + message;

export const warn = (message: string) => chalk.yellowBright('⚠ warn ') + message;

export const pending = (message: string) => chalk.blueBright('● pending ') + message;

export const success = (message: string) => chalk.greenBright('✔ success ') + message;

export const error = (message: string) => chalk.redBright('✖ error ') + message;

export const note = (message: string) => chalk.gray('  → ' + message);

export default {info, warn, pending, success, error, note};
