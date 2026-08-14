import fs from 'fs';
import path from 'path';
import os from 'os';
import { RepoStore } from './repo-store.js';

export class RepoScanner {
  static isScanning = false;

  static async scanSystem(startDir = '/', onFoundCallback = null, onCompleteCallback = null) {
    if (this.isScanning) return;
    this.isScanning = true;

    const skipDirs = new Set([
      '/proc', '/sys', '/dev', '/run', '/tmp', '/var/lib/docker',
      '/var/run', '/lost+found', '/snap', '.cache', 'node_modules',
      '.npm', '.local/share/Trash', '.cargo', '.rustup'
    ]);

    const foundRepos = [];
    const queue = [startDir];

    // Priority check for $HOME if starting from / to give instant user results
    const homeDir = os.homedir();
    if (startDir === '/' && fs.existsSync(homeDir)) {
      queue.unshift(homeDir);
    }

    const processDir = async (dirPath) => {
      try {
        const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

        // Check if this dir itself is a git repo
        const hasGit = entries.some(e => e.name === '.git');
        if (hasGit) {
          foundRepos.push(dirPath);
          RepoStore.addRecent(dirPath);
          if (onFoundCallback) onFoundCallback(dirPath, foundRepos.length);
          return; // Don't recurse inside a git repo working tree
        }

        for (const entry of entries) {
          if (entry.isDirectory() && !entry.isSymbolicLink()) {
            const fullPath = path.join(dirPath, entry.name);
            if (!skipDirs.has(fullPath) && !skipDirs.has(entry.name) && !entry.name.startsWith('.')) {
              queue.push(fullPath);
            }
          }
        }
      } catch {
        // Ignore EACCES, EPERM, ENOENT permission denied errors silently
      }
    };

    const runScan = async () => {
      while (queue.length > 0 && this.isScanning) {
        const batch = queue.splice(0, 40); // Process 40 directories per chunk
        await Promise.all(batch.map(d => processDir(d)));
        // Yield execution to keep Blessed UI 100% responsive
        await new Promise(r => setTimeout(r, 10));
      }
      this.isScanning = false;
      if (onCompleteCallback) onCompleteCallback(foundRepos);
    };

    runScan();
  }

  static stopScan() {
    this.isScanning = false;
  }
}
