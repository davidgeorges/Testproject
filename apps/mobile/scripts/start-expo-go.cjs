const { spawn } = require('node:child_process');

const expoCli = require.resolve('expo/bin/cli');
const port = process.env.EXPO_GO_PORT || '8082';
const child = spawn(process.execPath, [expoCli, 'start', '--go', '--lan', '--port', port], {
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code) => process.exit(code ?? 0));
