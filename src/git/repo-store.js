import fs from 'fs';
import path from 'path';
import os from 'os';

const STORE_PATH = path.join(os.homedir(), '.gitu_history.json');

export class RepoStore {
  static load() {
    try {
      if (fs.existsSync(STORE_PATH)) {
        const raw = fs.readFileSync(STORE_PATH, 'utf8');
        return JSON.parse(raw);
      }
    } catch {}
    return { recentRepos: [], clonedRepos: [] };
  }

  static save(data) {
    try {
      fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf8');
    } catch {}
  }

  static addRecent(repoPath) {
    const data = this.load();
    const resolved = path.resolve(repoPath);
    data.recentRepos = [resolved, ...data.recentRepos.filter(p => p !== resolved)].slice(0, 50);
    this.save(data);
  }

  static addCloned(repoName, repoPath, repoUrl = '') {
    const data = this.load();
    const resolved = path.resolve(repoPath);
    const existing = data.clonedRepos.filter(r => r.path !== resolved);
    data.clonedRepos = [
      {
        name: repoName,
        path: resolved,
        url: repoUrl,
        clonedAt: new Date().toISOString()
      },
      ...existing
    ];
    this.addRecent(resolved);
  }

  static getRecent() {
    const data = this.load();
    return data.recentRepos.filter(p => fs.existsSync(p));
  }

  static getCloned() {
    const data = this.load();
    return data.clonedRepos.filter(r => fs.existsSync(r.path));
  }
}
