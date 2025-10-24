#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Test runner script for Zembil
const args = process.argv.slice(2);

// Default test command
const testCommand = 'npm';
const testArgs = ['test', ...args];

console.log('🧪 Running Zembil tests...\n');

const testProcess = spawn(testCommand, testArgs, {
  stdio: 'inherit',
  cwd: path.join(__dirname, '..')
});

testProcess.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ All tests passed!');
  } else {
    console.log('\n❌ Tests failed with exit code:', code);
    process.exit(code);
  }
});

testProcess.on('error', (error) => {
  console.error('❌ Failed to start test process:', error);
  process.exit(1);
});
