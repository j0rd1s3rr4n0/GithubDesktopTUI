import path from 'path';
import fs from 'fs';
import { spawnSync } from 'child_process';

function runGit(cwd, args) {
  const res = spawnSync('git', args, { cwd, encoding: 'utf8' });
  return {
    stdout: res.stdout || '',
    stderr: res.stderr || '',
    status: res.status
  };
}

export class GitService {
  constructor(targetPath = process.cwd()) {
    this.repoPath = path.resolve(targetPath);
  }

  async isRepo() {
    try {
      const r = runGit(this.repoPath, ['rev-parse', '--is-inside-work-tree']);
      return r.status === 0 && (r.stdout || '').trim() === 'true';
    } catch {
      return false;
    }
  }

  async findRepoRoot() {
    try {
      const r = runGit(this.repoPath, ['rev-parse', '--show-toplevel']);
      if (r.status === 0 && r.stdout.trim()) {
        this.repoPath = r.stdout.trim();
        return true;
      }
    } catch {}
    return false;
  }

  async initRepo() {
    const r = runGit(this.repoPath, ['init']);
    return r.status === 0;
  }

  async getRepoName() {
    const r = runGit(this.repoPath, ['rev-parse', '--show-toplevel']);
    if (r.status === 0 && r.stdout.trim()) return path.basename(r.stdout.trim());
    return path.basename(this.repoPath);
  }

  async hasRemoteOrigin() {
    const r = runGit(this.repoPath, ['remote']);
    if (r.status !== 0) return false;
    return (r.stdout || '').split(/\s+/).includes('origin');
  }

  async getStatus() {
    try {
      const r = runGit(this.repoPath, ['status', '--porcelain', '--branch']);
      if (r.status !== 0) throw new Error(r.stderr || 'git status failed');
      const lines = (r.stdout || '').split('\n').filter(Boolean);
      const files = [];
      let current = 'HEAD';
      let ahead = 0;
      let behind = 0;
      let tracking = null;

      for (const line of lines) {
        if (line.startsWith('##')) {
          // branch line: ## branch... [ahead X, behind Y]
          const branchLine = line.slice(2).trim();
          const m = branchLine.match(/([^\s\.]+)(?:\.\.\.([^\s]+))?/);
          if (m) {
            current = m[1];
            tracking = m[2] || null;
          }
          const a = branchLine.match(/ahead (\d+)/);
          const b = branchLine.match(/behind (\d+)/);
          ahead = a ? parseInt(a[1], 10) : 0;
          behind = b ? parseInt(b[1], 10) : 0;
          continue;
        }

        // porcelain format: XY <path>
        const match = line.match(/^([ MADRCU?!]{2})\s+(.*)$/);
        if (!match) continue;
        const xy = match[1];
        const filePath = match[2].trim();
        const indexChar = xy[0];
        const workChar = xy[1];
        let statusCode = 'M';
        let staged = false;

        if (indexChar === '?' || workChar === '?') {
          statusCode = '?';
          staged = false;
        } else if (indexChar === 'A' || workChar === 'A') {
          statusCode = 'A';
          staged = indexChar === 'A';
        } else if (indexChar === 'D' || workChar === 'D') {
          statusCode = 'D';
          staged = indexChar === 'D';
        } else if (indexChar === 'R') {
          statusCode = 'R';
          staged = true;
        } else if (indexChar === 'M' || workChar === 'M') {
          statusCode = 'M';
          staged = indexChar === 'M';
        }

        files.push({
          path: filePath,
          status: statusCode,
          staged,
          indexStatus: indexChar,
          workingDirStatus: workChar
        });
      }

      return {
        currentBranch: current,
        tracking,
        ahead,
        behind,
        isClean: files.length === 0,
        files
      };
    } catch (err) {
      return { currentBranch: 'HEAD', tracking: null, ahead: 0, behind: 0, isClean: true, files: [] };
    }
  }

  async getFileDiff(filepath, staged = false) {
    const args = ['diff'];
    if (staged) args.push('--cached');
    args.push('--', filepath);
    const r = runGit(this.repoPath, args);
    if (r.status !== 0) return `Error generating diff: ${r.stderr}`;
    return r.stdout || '(No changes)';
  }

  async getFileContentAtCommit(commitHash, filepath) {
    const r = runGit(this.repoPath, ['show', `${commitHash}:${filepath}`]);
    if (r.status !== 0) return null;
    return r.stdout;
  }

  async stageFile(filepath) {
    runGit(this.repoPath, ['add', filepath]);
  }

  async unstageFile(filepath) {
    runGit(this.repoPath, ['reset', 'HEAD', '--', filepath]);
  }

  async stageAll() {
    runGit(this.repoPath, ['add', '.']);
  }

  async unstageAll() {
    runGit(this.repoPath, ['reset', 'HEAD']);
  }

  async discardFileChanges(filepath, isUntracked = false) {
    if (isUntracked) {
      const fullPath = path.join(this.repoPath, filepath);
      if (fs.existsSync(fullPath)) {
        if (fs.statSync(fullPath).isDirectory()) fs.rmSync(fullPath, { recursive: true, force: true });
        else fs.unlinkSync(fullPath);
      }
      return;
    }
    runGit(this.repoPath, ['checkout', '--', filepath]);
  }

  async undoChanges(filepath, isUntracked = false) {
    const fullPath = path.join(this.repoPath, filepath);
    if (isUntracked) {
      if (fs.existsSync(fullPath)) {
        if (fs.statSync(fullPath).isDirectory()) fs.rmSync(fullPath, { recursive: true, force: true });
        else fs.unlinkSync(fullPath);
      }
      return;
    }

    // unstage
    runGit(this.repoPath, ['reset', 'HEAD', '--', filepath]);
    // restore from HEAD
    const r = runGit(this.repoPath, ['checkout', 'HEAD', '--', filepath]);
    if (r.status === 0) return;

    if (fs.existsSync(fullPath)) {
      if (fs.statSync(fullPath).isDirectory()) fs.rmSync(fullPath, { recursive: true, force: true });
      else fs.unlinkSync(fullPath);
    }
  }

  async commit(summary, description = '') {
    if (!summary || !summary.trim()) throw new Error('Commit summary is required');
    const message = description.trim() ? `${summary.trim()}\n\n${description.trim()}` : summary.trim();
    const r = runGit(this.repoPath, ['commit', '-m', message]);
    if (r.status !== 0) throw new Error(r.stderr || 'git commit failed');
    return r.stdout;
  }

  async getCommitHistory(limit = 50) {
    const fmt = ['%H','%an','%ae','%ad','%s'].join('%x1f');
    const r = runGit(this.repoPath, ['log', `-n`, String(limit), `--pretty=format:${fmt}`]);
    if (r.status !== 0) return [];
    const lines = (r.stdout || '').split('\n').filter(Boolean);
    return lines.map(line => {
      const parts = line.split('\x1f');
      const hash = parts[0] || '';
      const message = parts[4] || '';
      return {
        hash,
        shortHash: hash.slice(0,7),
        author: parts[1] || '',
        email: parts[2] || '',
        date: parts[3] || '',
        message,
        summary: message.split('\n')[0]
      };
    });
  }

  async getCommitDetails(hash) {
    const r = runGit(this.repoPath, ['show', '--stat', '--patch', '--format=FULL', hash]);
    if (r.status !== 0) return { hash, shortHash: hash.slice(0,7), author: 'Unknown', email: '', date: '', message: 'Could not load commit details', patch: r.stderr };
    // Best-effort parse: return raw output in patch
    return { hash, shortHash: hash.slice(0,7), author: '', email: '', date: '', message: '', patch: r.stdout };
  }

  async getBranches() {
    const rCurrent = runGit(this.repoPath, ['rev-parse', '--abbrev-ref', 'HEAD']);
    const current = rCurrent.status === 0 ? (rCurrent.stdout || '').trim() : 'HEAD';
    const r = runGit(this.repoPath, ['branch', '-a', '--format', '%(refname:short)']);
    if (r.status !== 0) return { current, local: [], remote: [], branches: [] };
    const all = (r.stdout || '').split('\n').filter(Boolean);
    const local = [];
    const remote = [];
    for (const name of all) {
      const isRemote = name.startsWith('remotes/');
      const displayName = isRemote ? name.replace('remotes/', '') : name;
      const obj = { name, displayName, current: name === current, isRemote };
      if (isRemote) remote.push(obj); else local.push(obj);
    }
    return { current, local, remote, branches: [...local, ...remote] };
  }

  async checkoutBranch(branchName) {
    const r = runGit(this.repoPath, ['checkout', branchName]);
    if (r.status !== 0) throw new Error(r.stderr || 'git checkout failed');
  }

  async checkout(branchName) {
    return this.checkoutBranch(branchName);
  }

  async createBranch(branchName, checkout = true) {
    if (checkout) runGit(this.repoPath, ['checkout', '-b', branchName]);
    else runGit(this.repoPath, ['branch', branchName]);
  }

  async deleteBranch(branchName, force = false) {
    const flag = force ? '-D' : '-d';
    runGit(this.repoPath, ['branch', flag, branchName]);
  }

  async getStashes() {
    const r = runGit(this.repoPath, ['stash', 'list']);
    if (r.status !== 0) return [];
    return (r.stdout || '').split('\n').filter(Boolean).map((line, idx) => ({ index: idx, name: `stash@{${idx}}`, hash: null, message: line }));
  }

  async createStash(message = '', includeUntracked = true) {
    const args = ['stash', 'push'];
    if (includeUntracked) args.push('--include-untracked');
    if (message.trim()) args.push('-m', message.trim());
    runGit(this.repoPath, args);
  }

  async applyStash(index = 0) {
    runGit(this.repoPath, ['stash', 'apply', `stash@{${index}}`]);
  }

  async popStash(index = 0) {
    runGit(this.repoPath, ['stash', 'pop', `stash@{${index}}`]);
  }

  async dropStash(index = 0) {
    runGit(this.repoPath, ['stash', 'drop', `stash@{${index}}`]);
  }

  async push(force = false) {
    if (force) return runGit(this.repoPath, ['push', '--force-with-lease']);
    return runGit(this.repoPath, ['push']);
  }

  async pull(force = false) {
    if (!force) return runGit(this.repoPath, ['pull']);
    const s = await this.getStatus();
    const branch = s.currentBranch || 'HEAD';
    runGit(this.repoPath, ['fetch']);
    return runGit(this.repoPath, ['reset', '--hard', `origin/${branch}`]);
  }

  async fetch() {
    return runGit(this.repoPath, ['fetch']);
  }
}
