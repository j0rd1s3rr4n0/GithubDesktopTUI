#!/usr/bin/env node

import path from 'path';
import fs from 'fs';
import os from 'os';
import { createInterface } from 'readline';
import { execSync } from 'child_process';

// ─── Normalize environment for tmux / screen compatibility ───────────────────
if (process.env.TMUX || (process.env.TERM && (process.env.TERM.includes('screen') || process.env.TERM.includes('tmux')))) {
  if (!process.env.COLORTERM) {
    process.env.COLORTERM = 'truecolor';
  }
  if (!process.env.TERM || process.env.TERM === 'screen' || process.env.TERM === 'tmux') {
    process.env.TERM = 'xterm-256color';
  }
}

// ─── Resolve project root ────────────────────────────────────────────────────
const __filename = new URL(import.meta.url).pathname;
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const INSTALL_MARKER = path.join(os.homedir(), '.gd_installed');

// ─── CLI flags ───────────────────────────────────────────────────────────────
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
\x1b[1m\x1b[36mGitHub Desktop TUI (gd / ghtui)\x1b[0m
Terminal User Interface for Git inspired by GitHub Desktop.

\x1b[1mUsage:\x1b[0m
  gd [path-to-git-repository]
  ghtui [path-to-git-repository]

\x1b[1mOptions:\x1b[0m
  -h, --help       Show this help screen
  -v, --version    Show version number
  --install        Install gd & ghtui globally (create symlinks in /usr/local/bin)
  --uninstall      Remove global gd & ghtui symlinks

\x1b[1mKeyboard Shortcuts:\x1b[0m
  1 - 8          Switch View Tab
  Tab            Switch panel focus
  Space          Stage / Unstage file in Changes view
  a / u          Stage ALL / Unstage ALL
  c              Focus Commit Summary box
  Ctrl+Enter     Execute Commit
  b / n          New Branch Modal
  s              Stash Changes Modal
  G              Publish repo to GitHub (Public / Private)
  L              Check GitHub Auth status
  P (Shift+P)    Push commits
  p              Pull commits
  m / Ctrl+M     View README / Markdown interpreter
  r              Refresh Git status
  ? / F1         Toggle Help modal
  q              Quit application
`);
  process.exit(0);
}

if (args.includes('--version') || args.includes('-v')) {
  console.log('gd v1.0.0');
  process.exit(0);
}

// ─── Global install / uninstall ──────────────────────────────────────────────
const ENTRY_SCRIPT = path.join(PROJECT_ROOT, 'bin', 'gitu.js');
const SYMLINK_TARGETS = [
  { name: 'gd', dest: '/usr/local/bin/gd' },
  { name: 'ghtui', dest: '/usr/local/bin/ghtui' }
];

function installGlobally() {
  console.log('\x1b[36m\x1b[1m🔧  Installing gd & ghtui globally...\x1b[0m\n');

  const wrapperScript = `#!/bin/sh\nexec node "${ENTRY_SCRIPT}" "$@"\n`;

  for (const { name, dest } of SYMLINK_TARGETS) {
    try {
      // Remove any existing symlink or file
      if (fs.existsSync(dest)) {
        fs.unlinkSync(dest);
      }
      // Write a wrapper shell script instead of symlink (more portable)
      fs.writeFileSync(dest, wrapperScript, { mode: 0o755 });
      console.log(`  \x1b[32m✓\x1b[0m  ${name} → \x1b[33m${dest}\x1b[0m`);
    } catch (err) {
      if (err.code === 'EACCES') {
        console.error(`\n\x1b[31m✗ Permission denied writing to ${dest}\x1b[0m`);
        console.error(`  Run with sudo:  \x1b[33msudo node bin/gitu.js --install\x1b[0m\n`);
        process.exit(1);
      }
      console.error(`\x1b[31m✗ Failed to install ${name}: ${err.message}\x1b[0m`);
    }
  }

  // Mark as installed
  try {
    fs.writeFileSync(INSTALL_MARKER, JSON.stringify({
      installedAt: new Date().toISOString(),
      projectRoot: PROJECT_ROOT,
      version: '1.0.0'
    }), 'utf-8');
  } catch {}

  console.log(`\n\x1b[32m\x1b[1m✓ Installation complete!\x1b[0m`);
  console.log(`  Now you can run \x1b[36mgd\x1b[0m or \x1b[36mghtui\x1b[0m from anywhere.\n`);
}

function uninstallGlobally() {
  console.log('\x1b[33m\x1b[1m🗑  Uninstalling gd & ghtui...\x1b[0m\n');

  for (const { name, dest } of SYMLINK_TARGETS) {
    try {
      if (fs.existsSync(dest)) {
        fs.unlinkSync(dest);
        console.log(`  \x1b[32m✓\x1b[0m  Removed ${name} from ${dest}`);
      } else {
        console.log(`  \x1b[90m—\x1b[0m  ${name} not found at ${dest} (already removed)`);
      }
    } catch (err) {
      if (err.code === 'EACCES') {
        console.error(`\n\x1b[31m✗ Permission denied. Run with sudo:  sudo node bin/gitu.js --uninstall\x1b[0m\n`);
        process.exit(1);
      }
      console.error(`\x1b[31m✗ Failed to remove ${name}: ${err.message}\x1b[0m`);
    }
  }

  try {
    if (fs.existsSync(INSTALL_MARKER)) fs.unlinkSync(INSTALL_MARKER);
  } catch {}

  console.log(`\n\x1b[32m✓ Uninstall complete.\x1b[0m\n`);
}

if (args.includes('--install')) {
  installGlobally();
  process.exit(0);
}

if (args.includes('--uninstall')) {
  uninstallGlobally();
  process.exit(0);
}

// ─── First-run install prompt ────────────────────────────────────────────────
async function checkFirstRun() {
  // Skip if already installed globally
  if (fs.existsSync(INSTALL_MARKER)) return;

  // Check if gd is already available in PATH (e.g. via npm link)
  const isInPath = SYMLINK_TARGETS.some(({ dest }) => fs.existsSync(dest));
  if (isInPath) {
    // Mark as installed so we don't ask again
    try {
      fs.writeFileSync(INSTALL_MARKER, JSON.stringify({
        installedAt: new Date().toISOString(),
        projectRoot: PROJECT_ROOT,
        version: '1.0.0',
        method: 'pre-existing'
      }), 'utf-8');
    } catch {}
    return;
  }

  // Ask the user
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  return new Promise((resolve) => {
    console.log('');
    console.log('\x1b[36m\x1b[1m╔══════════════════════════════════════════════════════════════╗\x1b[0m');
    console.log('\x1b[36m\x1b[1m║     🐙  GitHub Desktop TUI — First Run Setup                ║\x1b[0m');
    console.log('\x1b[36m\x1b[1m╚══════════════════════════════════════════════════════════════╝\x1b[0m');
    console.log('');
    console.log('  Would you like to install \x1b[33mgd\x1b[0m and \x1b[33mghtui\x1b[0m commands globally');
    console.log('  so you can use them from \x1b[1many directory\x1b[0m?');
    console.log('');
    console.log('  This will create commands in \x1b[90m/usr/local/bin/\x1b[0m');
    console.log('  (may require \x1b[33msudo\x1b[0m password)');
    console.log('');

    rl.question('  \x1b[1mInstall globally? [Y/n]: \x1b[0m', (answer) => {
      rl.close();
      const ans = (answer || 'y').trim().toLowerCase();
      if (ans === 'y' || ans === 'yes' || ans === 's' || ans === 'si' || ans === 'sí') {
        console.log('');
        try {
          installGlobally();
        } catch (err) {
          if (err.code === 'EACCES' || (err.message && err.message.includes('EACCES'))) {
            console.log('\x1b[33m  Retrying with sudo...\x1b[0m\n');
            try {
              execSync(`sudo node "${ENTRY_SCRIPT}" --install`, { stdio: 'inherit' });
            } catch {
              console.error('\x1b[31m  ✗ sudo install failed. You can install later with:\x1b[0m');
              console.error(`    \x1b[33msudo node "${ENTRY_SCRIPT}" --install\x1b[0m\n`);
            }
          }
        }
      } else {
        // Mark as declined so we don't keep asking
        try {
          fs.writeFileSync(INSTALL_MARKER, JSON.stringify({
            installedAt: new Date().toISOString(),
            projectRoot: PROJECT_ROOT,
            version: '1.0.0',
            method: 'declined'
          }), 'utf-8');
        } catch {}
        console.log('\n  \x1b[90mSkipped. You can install later with:\x1b[0m');
        console.log(`  \x1b[33msudo node ${path.relative(process.cwd(), ENTRY_SCRIPT)} --install\x1b[0m\n`);
      }
      resolve();
    });
  });
}

// ─── Main: launch the TUI ───────────────────────────────────────────────────
const targetPath = args.filter(a => !a.startsWith('-'))[0]
  ? path.resolve(args.filter(a => !a.startsWith('-'))[0])
  : process.cwd();

async function main() {
  // First-run install prompt (only shows once)
  await checkFirstRun();

  try {
    const { App } = await import('../src/ui/app.js');
    const { RepoScanner } = await import('../src/git/repo-scanner.js');
    const app = new App(targetPath);

    // ── Graceful shutdown: kill all background workers on exit ──
    const cleanup = () => {
      try {
        RepoScanner.stopScan();
      } catch {}
      try {
        if (app.screen) app.screen.destroy();
      } catch {}
    };

    // Register cleanup on all exit signals
    process.on('SIGINT', () => {
      cleanup();
      process.exit(0);
    });
    process.on('SIGTERM', () => {
      cleanup();
      process.exit(0);
    });
    process.on('exit', () => {
      try {
        RepoScanner.stopScan();
      } catch {}
    });

    await app.start();
  } catch (err) {
    const errorMsg = `[${new Date().toISOString()}] Start error: ${err.stack || err}\n`;
    try {
      fs.appendFileSync(path.join(os.homedir(), '.gitu_error.log'), errorMsg);
    } catch {}
    console.error(`\x1b[31mFailed to start gd: ${err.message}\x1b[0m`);
    process.exit(1);
  }
}

main();

