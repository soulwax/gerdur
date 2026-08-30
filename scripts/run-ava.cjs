const {spawnSync} = require('child_process');
const path = require('path');

const avaCli = path.join(path.dirname(require.resolve('ava')), 'cli.mjs');
const result = spawnSync(process.execPath, [avaCli], {
  stdio: 'inherit',
  env: {
    ...process.env,
    SIMULATE: 'true',
  },
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
