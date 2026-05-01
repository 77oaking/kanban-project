#!/usr/bin/env node
/**
 * Run Jest with --experimental-vm-modules in a way that survives:
 *   - npm workspace hoisting (jest may live in repo-root or apps/api node_modules)
 *   - Jest 29's `exports` map (which blocks require.resolve('jest/bin/jest.js'))
 *
 * Trick: jest's exports DO expose `./package.json`. Resolve that, then walk
 * to bin/jest.js relative to the package root.
 */
const { spawn } = require('child_process');
const path = require('path');
const { existsSync } = require('fs');

const jestPkg = require.resolve('jest/package.json');
const jestBin = path.join(path.dirname(jestPkg), 'bin', 'jest.js');

if (!existsSync(jestBin)) {
  console.error(`[test] Could not find jest bin at ${jestBin}`);
  process.exit(1);
}

const args = ['--experimental-vm-modules', jestBin, '--runInBand', ...process.argv.slice(2)];
const child = spawn(process.execPath, args, { stdio: 'inherit' });
child.on('exit', (code) => process.exit(code ?? 1));
