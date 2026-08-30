import chalk from 'chalk';
import checkForUpdate from 'update-check';
import gradient from 'gradient-string';

const updateCheck = async (pkg: any) => {
  try {
    const distTag = pkg.version.includes('beta') ? 'beta' : 'latest';
    const update = await checkForUpdate(pkg, {distTag});
    if (update) {
      process.on('exit', () => {
        console.log(
          gradient('#f50', 'orange', 'red')(' ──────────────────────────────────────────────') +
            '\n' +
            gradient('#f50', 'orange', 'red')(`     Update available ${pkg.version} \u2192  ${update.latest}`) +
            '\n' +
            chalk.redBright('     Run ') +
            chalk.cyanBright(`${(process as any).pkg ? 'gerdur -U' : 'npm i -g gerdur@' + distTag}`) +
            chalk.redBright(' to update') +
            '\n' +
            gradient('#f50', 'orange', 'red')(' ──────────────────────────────────────────────'),
        );
      });
    }
    return update;
  } catch (err) {}
};

export default updateCheck;
