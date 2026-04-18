#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function run(cmd) {
  return execSync(cmd, { encoding: 'utf8' }).trim();
}

// Stage question database and submissions
run('git add default/');

const submissionsFile = path.join(__dirname, '..', 'submissions.json');
if (fs.existsSync(submissionsFile)) {
  run('git add submissions.json');
}

const diff = execSync('git diff --cached --name-only', { encoding: 'utf8' }).trim();
if (!diff) {
  console.log('Nothing to save — everything is up to date.');
  process.exit(0);
}

const date = new Date().toISOString().slice(0, 16).replace('T', ' ');
const msg = `update: questions & submissions ${date}`;

run(`git commit -m "${msg}"`);
console.log(`Committed: ${msg}`);

run('git push');
console.log('Pushed to origin.');
