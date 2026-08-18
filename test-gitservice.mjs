import fs from 'fs';
import path from 'path';
import os from 'os';
import { GitService } from './src/git/git-service.js';

async function main() {
  const tmpBase = os.tmpdir();
  const repoDir = path.join(tmpBase, `gitu-test-${Date.now()}`);
  fs.mkdirSync(repoDir, { recursive: true });
  console.log('Created temp dir:', repoDir);

  const gs = new GitService(repoDir);

  const isRepoBefore = await gs.isRepo();
  console.log('isRepo before init:', isRepoBefore);

  const initRes = await gs.initRepo();
  console.log('initRepo:', initRes);

  // write a file
  const filePath = path.join(repoDir, 'README.md');
  fs.writeFileSync(filePath, '# test repo\n');
  console.log('Wrote README.md');

  await gs.stageAll();
  console.log('stageAll done');

  await gs.commit('Initial commit from test');
  console.log('commit done');

  // create and checkout branch
  const branchName = 'feature/test-branch';
  await gs.createBranch(branchName, true);
  console.log('createBranch and checkout done:', branchName);

  // checkout alias
  await gs.checkout('master').catch(e => console.log('checkout master failed (may be main):', e.message));
  console.log('checkout alias invoked');

  const branches = await gs.getBranches();
  console.log('branches:', branches.local.map(b => ({ name: b.name, current: b.current })).slice(0,10));

  // cleanup: remove temp repo folder
  // NOTE: keep it for inspection
  console.log('Test completed successfully');
}

main().catch(err => { console.error('Test script error:', err); process.exit(1); });