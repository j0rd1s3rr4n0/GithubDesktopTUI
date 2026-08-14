#!/usr/bin/env node

import path from 'path';
import fs from 'fs';
import os from 'os';

// Normalize environment for tmux / screen compatibility
if (process.env.TMUX || (process.env.TERM && (process.env.TERM.includes('screen') || process.env.TERM.includes('tmux')))) {
  if (!process.env.COLORTERM) {
    process.env.COLORTERM = 'truecolor';
  }
  if (!process.env.TERM || process.env.TERM === 'screen' || process.env.TERM === 'tmux') {
    process.env.TERM = 'xterm-256color';
  }
}

import { App } from '../src/ui/app.js';

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
\x1b[1m\x1b[36mGitHub Desktop TUI (gitu / gd)\x1b[0m
Terminal User Interface for Git inspired by GitHub Desktop.

\x1b[1mUsage:\x1b[0m
  gd [path-to-git-repository]
  gitu [path-to-git-repository]

\x1b[1mOptions:\x1b[0m
  -h, --help     Show this help screen
  -v, --version  Show version number

\x1b[1mKeyboard Shortcuts:\x1b[0m
  1 - 8          Switch View Tab (1: Changes, 2: History, 3: Branches, 4: Stash, 5: GitHub, 6: Repos, 7: About, 8: Account)
  Tab            Switch panel focus
  Space          Stage / Unstage file in Changes view
  a / u          Stage ALL / Unstage ALL
  c              Focus Commit Summary box
  Ctrl+Enter     Execute Commit
  b / n          New Branch Modal
  s              Stash Changes Modal
  L              Check GitHub Auth status
  P (Shift+P)    Push commits
  p              Pull commits
  r              Refresh Git status
  m / Ctrl+M     View README / Markdown interpreter
  ? / F1         Toggle Help modal
  q              Quit application
`);
  process.exit(0);
}

if (args.includes('--version') || args.includes('-v')) {
  console.log('gitu v1.0.0');
  process.exit(0);
}

const targetPath = args[0] ? path.resolve(args[0]) : process.cwd();

async function main() {
  try {
    const app = new App(targetPath);
    await app.start();
  } catch (err) {
    const errorMsg = `[${new Date().toISOString()}] Start error: ${err.stack || err}\n`;
    try {
      fs.appendFileSync(path.join(os.homedir(), '.gitu_error.log'), errorMsg);
    } catch {}
    console.error(`\x1b[31mFailed to start gitu: ${err.message}\x1b[0m`);
    process.exit(1);
  }
}

main();
