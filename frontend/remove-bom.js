#!/usr/bin/env node

import fs from 'fs/promises';
import { existsSync, statSync } from 'fs';
import path from 'path';

const DEFAULT_EXTENSIONS = [
  '.css', '.scss', '.sass', '.less',
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
  '.json', '.html', '.htm', '.vue', '.svelte'
];

const DEFAULT_EXCLUDES = [
  'node_modules', '.git', '.next', 'dist', 'build',
  'coverage', '.nyc_output', '.cache', 'vendor'
];

const VERSION = '2.1.0';
const MAX_DEPTH = 10;
const DEFAULT_CONCURRENCY = 10;
const BACKUP_EXT = '.bak';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

const colorize = (str, color) =>
  process.stdout.isTTY ? `${colors[color]}${str}${colors.reset}` : str;

function createStats() {
  return { scanned: 0, cleaned: 0, wouldClean: 0, errors: 0, skipped: 0, backedUp: 0 };
}

function parseArgs(args) {
  const config = {
    dir: 'src',
    extensions: [...DEFAULT_EXTENSIONS],
    excludes: [...DEFAULT_EXCLUDES],
    dryRun: false,
    backup: true,
    list: false,
    check: false,
    restore: false,
    cleanBak: false,
    verbose: false,
    help: false,
    version: false,
    concurrent: 0,
    maxDepth: MAX_DEPTH
  };

  const next = (i) => (i + 1 < args.length ? args[i + 1] : null);
  const parsePosInt = (val, fallback) => { const n = parseInt(val, 10); return Number.isFinite(n) && n > 0 ? n : fallback; };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--dir': case '-d': {
        const val = next(i);
        if (val) { config.dir = val; i++; }
        break;
      }
      case '--ext': case '-e': {
        const val = next(i);
        if (val) { config.extensions = val.split(',').map(e => { const t = e.trim(); return t.startsWith('.') ? t : `.${t}`; }); i++; }
        break;
      }
      case '--exclude': case '-x': {
        const val = next(i);
        if (val) { config.excludes = val.split(',').map(e => e.trim()); i++; }
        break;
      }
      case '--max-depth': {
        const val = next(i);
        if (val) { config.maxDepth = parsePosInt(val, MAX_DEPTH); i++; }
        break;
      }
      case '--concurrent': case '-c': {
        const val = next(i);
        if (val) { config.concurrent = parsePosInt(val, DEFAULT_CONCURRENCY); i++; }
        break;
      }
      case '--dry-run': case '--dry':
        config.dryRun = true;
        break;
      case '--no-backup':
        config.backup = false;
        break;
      case '--list': case '-l':
        config.list = true;
        break;
      case '--check':
        config.check = true;
        break;
      case '--restore':
        config.restore = true;
        break;
      case '--clean-bak':
        config.cleanBak = true;
        break;
      case '--verbose': case '-v':
        config.verbose = true;
        break;
      case '--version':
        config.version = true;
        break;
      case '--help': case '-h':
        config.help = true;
        break;
    }
  }

  return config;
}

function showHelp() {
  console.log(`
${colorize('BOM Remover Pro', 'cyan')} v${VERSION}
${'='.repeat(50)}

Usage: node remove-bom.js [options]

Options:
  -d, --dir <path>         Target directory (default: src)
  -e, --ext <extensions>   Comma-separated file extensions
  -x, --exclude <dirs>     Comma-separated directories to skip
      --max-depth <n>      Max directory depth (default: ${MAX_DEPTH})
  -c, --concurrent <n>     Concurrent file processing (default: sequential)
      --dry-run            Preview changes without modifying files
  -l, --list               List files with BOM (no modifications)
      --check              Exit with code 1 if any BOM found (for CI)
      --restore            Restore files from ${BACKUP_EXT} backups
      --clean-bak          Remove ${BACKUP_EXT} files after successful cleaning
      --no-backup          Disable automatic backup
  -v, --verbose            Show details for every file
      --version            Show version
  -h, --help               Show this help

Examples:
  node remove-bom.js
  node remove-bom.js -d ./components -e js,jsx
  node remove-bom.js --list
  node remove-bom.js --dry-run -v
  node remove-bom.js -c 20 --max-depth 15
`);
}

function hasBOM(buffer) {
  return buffer.length >= 3 &&
    buffer[0] === 0xEF &&
    buffer[1] === 0xBB &&
    buffer[2] === 0xBF;
}

function removeBOM(buffer) {
  return hasBOM(buffer) ? buffer.slice(3) : buffer;
}

async function findFiles(dir, config, depth = 0) {
  const excludeSet = new Set(config.excludes);
  const results = [];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (excludeSet.has(entry.name)) {
          if (config.verbose) {
            console.log(colorize(`Excluded: ${path.relative(process.cwd(), fullPath)}/`, 'gray'));
          }
          continue;
        }
        if (depth < config.maxDepth) {
          const sub = await findFiles(fullPath, config, depth + 1);
          results.push(...sub);
        }
      } else if (config.extensions.some(ext => entry.name.endsWith(ext))) {
        results.push(fullPath);
      }
    }
  } catch {
    // skip unreadable directories
  }

  return results;
}

async function processFile(filePath, config, stats) {
  stats.scanned++;
  const relativePath = path.relative(process.cwd(), filePath);

  try {
    const buffer = await fs.readFile(filePath);

    if (!hasBOM(buffer)) {
      stats.skipped++;
      if (config.verbose) {
        console.log(colorize(`Skipped (no BOM): ${relativePath}`, 'gray'));
      }
      return false;
    }

    if (config.dryRun) {
      stats.wouldClean++;
      console.log(colorize(`Would remove BOM: ${relativePath}`, 'yellow'));
      return true;
    }

    if (config.backup) {
      await fs.copyFile(filePath, `${filePath}.bak`);
      stats.backedUp++;
      if (config.verbose) {
        console.log(colorize(`Backed up: ${relativePath}.bak`, 'cyan'));
      }
    }

    await fs.writeFile(filePath, removeBOM(buffer));
    stats.cleaned++;
    console.log(colorize(`Removed BOM: ${relativePath}`, 'green'));
    return true;

  } catch (err) {
    stats.errors++;
    console.error(colorize(`Error: ${relativePath}`, 'red'), err.message);
    return false;
  }
}

function showReport(stats, startTime) {
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`\n${'='.repeat(50)}`);
  console.log(colorize('Report', 'bright'));
  console.log('='.repeat(50));

  const rows = [
    ['Files scanned', stats.scanned],
    ['Files cleaned', stats.cleaned],
    ['Would clean (dry-run)', stats.wouldClean],
    ['Skipped (no BOM)', stats.skipped],
    ['Backups created', stats.backedUp],
    ['Errors', stats.errors],
    ['Time elapsed', `${duration}s`]
  ].filter(([label]) => !(stats.wouldClean === 0 && label.includes('dry-run')));

  for (const [label, value] of rows) {
    const colored = typeof value === 'number' && value > 0 ? 'green' : 'gray';
    console.log(`  ${label.padEnd(25)} ${colorize(value, colored)}`);
  }

  console.log(`\n${'─'.repeat(50)}`);
  if (stats.wouldClean > 0) {
    console.log(colorize(`Dry-run: ${stats.wouldClean} file(s) would be cleaned.`, 'yellow'));
  } else if (stats.errors === 0 && stats.cleaned > 0) {
    console.log(colorize('All files cleaned successfully.', 'green'));
  } else if (stats.cleaned === 0 && stats.errors === 0 && stats.wouldClean === 0) {
    console.log(colorize('No BOM found in any file.', 'cyan'));
  } else if (stats.errors > 0) {
    console.log(colorize('Completed with errors. Check log above.', 'yellow'));
  }
  console.log('='.repeat(50) + '\n');
}

async function findBOMFiles(targetDir, config) {
  const files = await findFiles(targetDir, config);
  const results = [];

  for (const file of files) {
    try {
      const buffer = await fs.readFile(file);
      if (hasBOM(buffer)) {
        results.push(file);
      }
    } catch { /* skip */ }
  }

  return results;
}

async function restoreBackups(targetDir, config) {
  const files = await findFiles(targetDir, config);
  let restored = 0;

  for (const file of files) {
    const bakPath = file + BACKUP_EXT;
    if (!existsSync(bakPath)) continue;

    try {
      await fs.copyFile(bakPath, file);
      await fs.unlink(bakPath);
      restored++;
      console.log(colorize(`Restored: ${path.relative(process.cwd(), file)}`, 'cyan'));
    } catch (err) {
      console.error(colorize(`Restore failed: ${path.relative(process.cwd(), file)}`, 'red'), err.message);
    }
  }

  if (restored === 0) {
    console.log(colorize('No backup files found to restore.', 'gray'));
  } else {
    console.log(colorize(`Restored ${restored} file(s) from backups.`, 'green'));
  }
}

async function cleanBackups(targetDir, config) {
  const files = await findFiles(targetDir, config);
  let removed = 0;

  for (const file of files) {
    const bakPath = file + BACKUP_EXT;
    if (!existsSync(bakPath)) continue;

    try {
      await fs.unlink(bakPath);
      removed++;
    } catch { /* skip */ }
  }

  if (removed === 0) {
    console.log(colorize('No backup files found to remove.', 'gray'));
  } else {
    console.log(colorize(`Removed ${removed} backup file(s).`, 'green'));
  }
}

async function main() {
  const config = parseArgs(process.argv.slice(2));

  if (config.help) {
    showHelp();
    process.exit(0);
  }

  if (config.version) {
    console.log(`v${VERSION}`);
    process.exit(0);
  }

  const startTime = Date.now();
  const targetDir = path.resolve(process.cwd(), config.dir);

  if (!existsSync(targetDir)) {
    console.error(colorize(`Directory not found: ${targetDir}`, 'red'));
    process.exit(1);
  }

  if (!statSync(targetDir).isDirectory()) {
    console.error(colorize(`Not a directory: ${targetDir}`, 'red'));
    process.exit(1);
  }

  console.log(colorize('BOM Remover Pro', 'cyan') + colorize(` v${VERSION}`, 'gray'));
  console.log(colorize('='.repeat(50), 'gray'));

  if (config.restore) {
    await restoreBackups(targetDir, config);
    return;
  }

  if (config.cleanBak) {
    await cleanBackups(targetDir, config);
    return;
  }

  if (config.dryRun) {
    console.log(colorize('Dry run: no files will be modified', 'yellow'));
  }
  if (!config.backup && !config.dryRun) {
    console.log(colorize('Backup disabled: files will be modified in-place', 'yellow'));
  }

  console.log(`Target: ${targetDir}`);
  console.log(`Extensions: ${config.extensions.join(', ')}`);
  console.log(`Excluded dirs: ${config.excludes.join(', ')}`);
  console.log('');

  if (config.list || config.check) {
    console.log(colorize('Scanning for files with BOM...', 'cyan'));
    const bomFiles = await findBOMFiles(targetDir, config);
    if (bomFiles.length === 0) {
      console.log(colorize('No BOM found in any file.', 'green'));
      if (config.check) process.exit(0);
    } else {
      for (const f of bomFiles) {
        console.log(path.relative(process.cwd(), f));
      }
      console.log(colorize(`\n${bomFiles.length} file(s) with BOM`, 'cyan'));
      if (config.check) process.exit(1);
    }
    return;
  }

  console.log(colorize('Scanning for files...', 'cyan'));
  const files = await findFiles(targetDir, config);
  console.log(colorize(`Found ${files.length} matching file(s).\n`, 'cyan'));

  if (files.length === 0) {
    console.log(colorize('No files to process.', 'green'));
    return;
  }

  console.log(colorize('Processing...', 'cyan') + '\n');

  const stats = createStats();

  async function processSequential() {
    for (const file of files) {
      await processFile(file, config, stats);
    }
  }

  async function processConcurrent(concurrency) {
    const queue = [...files];
    let index = 0;
    const total = queue.length;

    async function worker() {
      while (true) {
        const i = index++;
        if (i >= total) break;
        const file = queue[i];
        await processFile(file, config, stats);
        if (!config.verbose && !config.dryRun && total > 20) {
          const pct = Math.round(((i + 1) / total) * 100);
          process.stdout.write(`\r  Progress: ${pct}% (${i + 1}/${total})   `);
        }
      }
    }

    const workers = Array.from({ length: concurrency }, () => worker());
    await Promise.all(workers);
    if (!config.verbose && !config.dryRun && total > 20) process.stdout.write('\n');
  }

  if (config.concurrent > 0) {
    await processConcurrent(config.concurrent);
  } else {
    await processSequential();
  }

  showReport(stats, startTime);
}

process.on('unhandledRejection', (reason) => {
  console.error(colorize('Unhandled rejection:', 'red'), reason);
  process.exit(1);
});

main();
