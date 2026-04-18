#!/usr/bin/env node
const { execSync } = require('child_process');

function run(cmd) {
  return execSync(cmd, { encoding: 'utf8' }).trim();
}

// Stage only the default/ question database
run('git add default/');

// Check if there's anything staged
const diff = execSync('git diff --cached --name-only', { encoding: 'utf8' }).trim();
if (!diff) {
  console.log('Nothing to save — default/ is already up to date.');
  process.exit(0);
}

const date = new Date().toISOString().slice(0, 10);
const msg = `update: question database ${date}`;

run(`git commit -m "${msg}"`);
console.log(`Committed: ${msg}`);

run('git push');
console.log('Pushed to origin.');
