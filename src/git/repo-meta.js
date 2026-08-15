import { exec } from 'child_process';
import util from 'util';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { RemoteConfig } from './remote-config.js';

const execAsync = util.promisify(exec);
const CACHE_PATH = path.join(os.homedir(), '.gitu_repos_meta.json');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export class RepoMeta {
  static loadCache() {
    try {
      if (fs.existsSync(CACHE_PATH)) {
        return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
      }
    } catch {}
    return {};
  }

  static saveCache(cache) {
    try {
      fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), 'utf8');
    } catch {}
  }

  static clearCache() {
    try {
      if (fs.existsSync(CACHE_PATH)) fs.unlinkSync(CACHE_PATH);
    } catch {}
  }

  static parseOwnerRepo(remoteUrl) {
    // Handles https://host/owner/repo(.git), git@host:owner/repo.git,
    // ssh://git@host/owner/repo(.git), host:owner/repo, etc.
    try {
      let u = remoteUrl.trim();
      if (u.endsWith('.git')) u = u.slice(0, -4);
      u = u.replace(/^git@/, '');
      let m = u.match(/^(?:https?:\/\/|\/\/)([^/]+)\/(.+)$/);
      if (m) return { host: m[1], path: m[2] };
      m = u.match(/^([^/:]+):(.+)$/);
      if (m) return { host: m[1], path: m[2] };
      m = u.match(/^ssh:\/\/[^@]+@([^/]+)\/(.+)$/);
      if (m) return { host: m[1], path: m[2] };
    } catch {}
    return null;
  }

  static classifyRemote(remoteUrl) {
    if (!remoteUrl) return null;
    const parsed = this.parseOwnerRepo(remoteUrl);
    if (!parsed) return 'custom';
    const host = parsed.host.toLowerCase();
    if (host.includes('github.com')) return 'github';
    const gitlabHost = (RemoteConfig.load().gitlabHost || 'gitlab.com').toLowerCase().replace(/^https?:\/\//, '');
    if (host.includes(gitlabHost)) return 'gitlab';
    return 'custom';
  }

  static async getRemoteOrigin(repoPath) {
    try {
      const { stdout } = await execAsync('git remote get-url origin', { cwd: repoPath });
      return stdout.trim();
    } catch {
      return null;
    }
  }

  static async fetchIsFork(remoteUrl) {
    const remoteType = this.classifyRemote(remoteUrl);
    if (remoteType !== 'github' && remoteType !== 'gitlab') {
      return { isFork: null, parent: null };
    }
    const parsed = this.parseOwnerRepo(remoteUrl);
    if (!parsed) return { isFork: null, parent: null };
    const ownerRepo = parsed.path;

    try {
      if (remoteType === 'github') {
        const { stdout } = await execAsync(
          `gh repo view "${ownerRepo}" --json isFork,parent --jq '.isFork, (.parent.fullName // "")'`
        );
        const lines = stdout.trim().split('\n');
        return { isFork: lines[0] === 'true', parent: lines[1] || null };
      }
      const { stdout } = await execAsync(
        `glab api "projects/${encodeURIComponent(ownerRepo)}" --jq '.forked_from_project.full_path // ""'`
      );
      const parent = stdout.trim();
      return { isFork: Boolean(parent), parent: parent || null };
    } catch {
      return { isFork: null, parent: null };
    }
  }

  static async getRepoMeta(repoPath, options = {}) {
    const force = !!options.force;
    const skipFork = !!options.skipFork;
    const cache = this.loadCache();
    const key = path.resolve(repoPath);

    const remoteUrl = await this.getRemoteOrigin(key);
    const remoteType = this.classifyRemote(remoteUrl);
    const base = { remoteUrl, remoteType };

    if (remoteType !== 'github' && remoteType !== 'gitlab') {
      return { ...base, isFork: null, parent: null, needsForkFetch: false };
    }

    const cached = cache[key];
    const forkFresh = cached && (cached.isFork === true || cached.isFork === false) &&
      (Date.now() - (cached.checkedAt || 0) < CACHE_TTL_MS) && !force;

    if (forkFresh) {
      return { ...base, isFork: cached.isFork, parent: cached.parent || null, needsForkFetch: false };
    }

    if (skipFork) {
      return { ...base, isFork: null, parent: null, needsForkFetch: true };
    }

    const forkInfo = await this.fetchIsFork(remoteUrl);
    const result = { ...base, ...forkInfo, checkedAt: Date.now(), needsForkFetch: false };
    cache[key] = result;
    this.saveCache(cache);
    return result;
  }

  static async fetchForkFor(repoPath, meta) {
    const key = path.resolve(repoPath);
    const cache = this.loadCache();
    const forkInfo = await this.fetchIsFork(meta.remoteUrl);
    const result = {
      remoteUrl: meta.remoteUrl,
      remoteType: meta.remoteType,
      ...forkInfo,
      checkedAt: Date.now(),
      needsForkFetch: false
    };
    cache[key] = result;
    this.saveCache(cache);
    return result;
  }

  static async getMetaForRepos(repoPaths, force = false) {
    const results = await Promise.all(repoPaths.map(p => this.getRepoMeta(p, force).catch(() => ({
      remoteUrl: null,
      remoteType: null,
      isFork: null,
      parent: null
    }))));
    const map = {};
    repoPaths.forEach((p, i) => { map[path.resolve(p)] = results[i]; });
    return map;
  }
}