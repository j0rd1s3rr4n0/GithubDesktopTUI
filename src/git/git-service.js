import { simpleGit } from 'simple-git';
import path from 'path';
import fs from 'fs';

export class GitService {
  constructor(targetPath = process.cwd()) {
    this.repoPath = path.resolve(targetPath);
    this.git = simpleGit(this.repoPath);
  }

  async isRepo() {
    try {
      return await this.git.checkIsRepo();
    } catch {
      return false;
    }
  }

  async getRepoName() {
    try {
      const topLevel = await this.git.revparse(['--show-toplevel']);
      return path.basename(topLevel.trim());
    } catch {
      return path.basename(this.repoPath);
    }
  }

  async getStatus() {
    try {
      const status = await this.git.status();
      const files = [];

      // Parse status files
      for (const file of status.files) {
        let statusCode = 'M';
        let staged = false;

        const indexStatus = file.index;
        const workingDirStatus = file.working_dir;

        if (indexStatus === '?' || workingDirStatus === '?') {
          statusCode = '?';
          staged = false;
        } else if (indexStatus === 'A') {
          statusCode = 'A';
          staged = true;
        } else if (workingDirStatus === 'A') {
          statusCode = 'A';
          staged = false;
        } else if (indexStatus === 'D') {
          statusCode = 'D';
          staged = true;
        } else if (workingDirStatus === 'D') {
          statusCode = 'D';
          staged = false;
        } else if (indexStatus === 'R') {
          statusCode = 'R';
          staged = true;
        } else if (indexStatus === 'M') {
          statusCode = 'M';
          staged = true;
        } else if (workingDirStatus === 'M') {
          statusCode = 'M';
          staged = false;
        }

        files.push({
          path: file.path,
          status: statusCode,
          staged,
          indexStatus,
          workingDirStatus
        });
      }

      return {
        currentBranch: status.current || 'HEAD',
        tracking: status.tracking,
        ahead: status.ahead,
        behind: status.behind,
        isClean: status.isClean(),
        files
      };
    } catch (err) {
      throw new Error(`Error fetching status: ${err.message}`);
    }
  }

  async getFileDiff(filepath, staged = false) {
    try {
      const options = [];
      if (staged) {
        options.push('--cached');
      }
      options.push('--', filepath);
      const diff = await this.git.diff(options);
      return diff || '(No changes)';
    } catch (err) {
      return `Error generating diff: ${err.message}`;
    }
  }

  async stageFile(filepath) {
    await this.git.add(filepath);
  }

  async unstageFile(filepath) {
    await this.git.reset(['HEAD', '--', filepath]);
  }

  async stageAll() {
    await this.git.add('.');
  }

  async unstageAll() {
    await this.git.reset(['HEAD']);
  }

  async discardFileChanges(filepath, isUntracked = false) {
    if (isUntracked) {
      const fullPath = path.join(this.repoPath, filepath);
      if (fs.existsSync(fullPath)) {
        if (fs.statSync(fullPath).isDirectory()) {
          fs.rmSync(fullPath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(fullPath);
        }
      }
    } else {
      await this.git.checkout(['--', filepath]);
    }
  }

  async commit(summary, description = '') {
    if (!summary || !summary.trim()) {
      throw new Error('Commit summary is required');
    }
    const message = description.trim() 
      ? `${summary.trim()}\n\n${description.trim()}`
      : summary.trim();

    return await this.git.commit(message);
  }

  async getCommitHistory(limit = 50) {
    try {
      const log = await this.git.log({ maxCount: limit });
      return log.all.map(commit => ({
        hash: commit.hash,
        shortHash: commit.hash.slice(0, 7),
        author: commit.author_name,
        email: commit.author_email,
        date: commit.date,
        message: commit.message,
        summary: commit.message.split('\n')[0],
        refs: commit.refs
      }));
    } catch {
      return [];
    }
  }

  async getCommitDetails(hash) {
    try {
      const showResult = await this.git.show([
        '--stat',
        '--patch',
        '--format=FULL_HEADER%n%H%n%an%n%ae%n%ad%n%B%nEND_HEADER',
        hash
      ]);

      const parts = showResult.split('END_HEADER');
      const headerPart = parts[0] || '';
      const diffPart = parts.slice(1).join('END_HEADER') || '';

      const lines = headerPart.split('\n');
      const commitHash = lines[1] || hash;
      const author = lines[2] || '';
      const email = lines[3] || '';
      const date = lines[4] || '';
      const message = lines.slice(5).join('\n').trim();

      return {
        hash: commitHash,
        shortHash: commitHash.slice(0, 7),
        author,
        email,
        date,
        message,
        patch: diffPart.trim() || '(No diff content)'
      };
    } catch (err) {
      return {
        hash,
        shortHash: hash.slice(0, 7),
        author: 'Unknown',
        email: '',
        date: '',
        message: 'Could not load commit details',
        patch: err.message
      };
    }
  }

  async getBranches() {
    try {
      const summary = await this.git.branch(['-a']);
      const branches = [];

      for (const name of summary.all) {
        const isCurrent = name === summary.current;
        const isRemote = name.startsWith('remotes/');
        branches.push({
          name,
          displayName: isRemote ? name.replace('remotes/', '') : name,
          isCurrent,
          isRemote
        });
      }

      return {
        current: summary.current,
        branches
      };
    } catch (err) {
      return { current: 'HEAD', branches: [] };
    }
  }

  async checkoutBranch(branchName) {
    await this.git.checkout(branchName);
  }

  async createBranch(branchName, checkout = true) {
    if (checkout) {
      await this.git.checkoutLocalBranch(branchName);
    } else {
      await this.git.branch([branchName]);
    }
  }

  async deleteBranch(branchName, force = false) {
    const flag = force ? '-D' : '-d';
    await this.git.branch([flag, branchName]);
  }

  async getStashes() {
    try {
      const stashList = await this.git.stashList();
      return stashList.all.map((item, idx) => ({
        index: idx,
        name: `stash@{${idx}}`,
        hash: item.hash,
        message: item.message,
        date: item.date
      }));
    } catch {
      return [];
    }
  }

  async createStash(message = '', includeUntracked = true) {
    const args = ['save'];
    if (includeUntracked) args.push('--include-untracked');
    if (message.trim()) args.push(message.trim());
    await this.git.stash(args);
  }

  async applyStash(index = 0) {
    await this.git.stash(['apply', `stash@{${index}}`]);
  }

  async popStash(index = 0) {
    await this.git.stash(['pop', `stash@{${index}}`]);
  }

  async dropStash(index = 0) {
    await this.git.stash(['drop', `stash@{${index}}`]);
  }

  async push() {
    return await this.git.push();
  }

  async pull() {
    return await this.git.pull();
  }

  async fetch() {
    return await this.git.fetch();
  }
}
