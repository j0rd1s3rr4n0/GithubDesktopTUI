import { Worker } from 'worker_threads';
import fs from 'fs';
import path from 'path';
import os from 'os';
import fileURLToPath from 'url';
import { RepoStore } from './repo-store.js';

export class RepoScanner {
  static isScanning = false;
  static workers = [];

  static async scanSystem(startDir = '/', onFoundCallback = null, onCompleteCallback = null) {
    if (this.isScanning) return;
    this.isScanning = true;

    // Use 2 worker threads max to conserve system CPU & RAM
    const numWorkers = Math.min(2, Math.max(1, os.cpus().length - 1));
    const workerScript = path.join(path.dirname(import.meta.url.replace('file://', '')), 'scan-worker.js');

    const foundRepos = [];
    const queue = [startDir];

    const homeDir = os.homedir();
    if (startDir === '/' && fs.existsSync(homeDir)) {
      queue.unshift(homeDir);
    }

    let activeCount = 0;
    this.workers = [];

    const stopAll = () => {
      this.isScanning = false;
      this.workers.forEach(w => w.terminate());
      this.workers = [];
      if (onCompleteCallback) onCompleteCallback(foundRepos);
    };

    const processNext = (worker) => {
      if (!this.isScanning) return;

      if (queue.length === 0 && activeCount === 0) {
        stopAll();
        return;
      }

      if (queue.length === 0) return;

      const nextDir = queue.shift();
      activeCount++;

      // Small 2ms throttle delay per job to cap CPU consumption under 10%
      setTimeout(() => {
        if (this.isScanning) {
          worker.postMessage({ type: 'scan-dir', dirPath: nextDir });
        }
      }, 2);
    };

    for (let i = 0; i < numWorkers; i++) {
      const worker = new Worker(workerScript);
      this.workers.push(worker);

      worker.on('message', (res) => {
        activeCount--;
        if (!this.isScanning) return;

        if (res.type === 'dir-result') {
          if (res.isGitRepo) {
            foundRepos.push(res.dirPath);
            RepoStore.addRecent(res.dirPath);
            if (onFoundCallback) onFoundCallback(res.dirPath, foundRepos.length);
          } else if (res.subDirs && res.subDirs.length > 0) {
            queue.push(...res.subDirs);
          }
        }

        processNext(worker);
      });

      worker.on('error', () => {
        activeCount--;
        processNext(worker);
      });

      processNext(worker);
    }
  }

  static stopScan() {
    this.isScanning = false;
    this.workers.forEach(w => w.terminate());
    this.workers = [];
  }
}
