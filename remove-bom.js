#!/usr/bin/env node

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const script = path.join(__dirname, 'frontend', 'remove-bom.js');
const args = process.argv.slice(2).join(' ');

const dirs = [
  path.join(__dirname, 'frontend', 'src'),
  path.join(__dirname, 'backend')
];

for (const dir of dirs) {
  try {
    execSync(`node "${script}" -d "${dir}" ${args}`, { stdio: 'inherit' });
  } catch {
    process.exit(1);
  }
}
