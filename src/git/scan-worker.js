import { parentPort } from 'worker_threads';
import fs from 'fs';
import path from 'path';

const skipDirs = new Set([
  '/proc', '/sys', '/dev', '/run', '/tmp', '/var/lib/docker',
  '/var/run', '/lost+found', '/snap', '.cache', 'node_modules',
  '.npm', '.local/share/Trash', '.cargo', '.rustup', '.gitu_error.log'
]);

parentPort.on('message', async (message) => {
  if (message.type === 'scan-dir') {
    const { dirPath } = message;
    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

      let isGitRepo = false;
      const subDirs = [];

      for (const entry of entries) {
        if (entry.name === '.git') {
          isGitRepo = true;
          break;
        }
        if (entry.isDirectory() && !entry.isSymbolicLink()) {
          const fullPath = path.join(dirPath, entry.name);
          if (!skipDirs.has(fullPath) && !skipDirs.has(entry.name) && !entry.name.startsWith('.')) {
            subDirs.push(fullPath);
          }
        }
      }

      parentPort.postMessage({
        type: 'dir-result',
        dirPath,
        isGitRepo,
        subDirs
      });
    } catch {
      parentPort.postMessage({
        type: 'dir-result',
        dirPath,
        isGitRepo: false,
        subDirs: []
      });
    }
  }
});
