#!/usr/bin/env node

import path from 'path';
import { App } from '../src/ui/app.js';

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
\x1b[1m\x1b[36mGitHub Desktop TUI (gitu)\x1b[0m
Terminal User Interface for Git inspired by GitHub Desktop.

\x1b[1mUsage:\x1b[0m
  gitu [path-to-git-repository]

\x1b[1mOptions:\x1b[0m
  -h, --help     Show this help screen
  -v, --version  Show version number

\x1b[1mKeyboard Shortcuts:\x1b[0m
  1 - 4          Switch View Tab (1: Changes, 2: History, 3: Branches, 4: Stash)
  Tab            Switch panel focus
  Space          Stage / Unstage file in Changes view
  a / u          Stage ALL / Unstage ALL
  c              Focus Commit Summary box
  Ctrl+Enter     Execute Commit
  b / n          New Branch Modal
  s              Stash Changes Modal
  P (Shift+P)    Push commits
  p              Pull commits
  r              Refresh Git status
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

try {
  const app = new App(targetPath);
  app.start();
} catch (err) {
  console.error(`\x1b[31mFailed to start gitu: ${err.message}\x1b[0m`);
  process.exit(1);
}
