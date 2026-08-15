import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs';
import { RemoteConfig } from './remote-config.js';

const execAsync = util.promisify(exec);

export class GhService {
  constructor(repoPath = process.cwd()) {
    this.repoPath = repoPath;
    this.remote = RemoteConfig.load();
  }

  reload() {
    this.remote = RemoteConfig.load();
  }

  getRemoteType() {
    return this.remote.remoteType;
  }

  getGitlabHost() {
    return this.remote.gitlabHost || 'gitlab.com';
  }

  getTool() {
    if (this.remote.remoteType === 'gitlab') return 'glab';
    if (this.remote.remoteType === 'custom') return null;
    return 'gh';
  }

  async isToolAvailable() {
    const tool = this.getTool();
    if (!tool) return false;
    try {
      await execAsync(`${tool} --version`);
      return true;
    } catch {
      return false;
    }
  }

  async isGhAvailable() {
    try {
      await execAsync('gh --version');
      return true;
    } catch {
      return false;
    }
  }

  normalizeUser(raw, tool) {
    if (tool === 'glab') {
      return {
        login: raw.username,
        name: raw.name,
        company: raw.organization,
        location: raw.location,
        email: raw.public_email || raw.email,
        blog: raw.website_url,
        twitter_username: raw.twitter,
        hireable: null,
        html_url: raw.web_url,
        bio: raw.bio,
        public_repos: 0,
        public_gists: 0,
        followers: 0,
        following: 0,
        created_at: raw.created_at,
        avatar_url: raw.avatar_url
      };
    }
    return raw;
  }

  async getUser() {
    const tool = this.getTool();
    if (!tool) return null;
    try {
      const { stdout } = await execAsync(`${tool} api user`);
      return this.normalizeUser(JSON.parse(stdout), tool);
    } catch {
      return null;
    }
  }

  async getAuthStatus() {
    const tool = this.getTool();
    if (!tool) {
      return { isLoggedIn: false, user: null, remoteType: 'custom', error: 'Remote type "custom" — GitHub/GitLab integration disabled.' };
    }

    try {
      const { stdout, stderr } = await execAsync(`${tool} auth status`);
      const output = stdout + stderr;

      const loggedInMatch = output.match(/Logged in to ([^\s]+) account ([^\s]+)/i) ||
                            output.match(/Logged in to ([^\s]+) as ([^\s]+)/i);

      if (loggedInMatch) {
        return {
          isLoggedIn: true,
          host: loggedInMatch[1],
          user: loggedInMatch[2].replace(/[()]/g, ''),
          remoteType: this.remote.remoteType
        };
      }

      const userObj = await this.getUser();
      if (userObj && (userObj.login || userObj.username)) {
        return {
          isLoggedIn: true,
          host: tool === 'glab' ? this.getGitlabHost() : 'github.com',
          user: userObj.login || userObj.username,
          name: userObj.name || userObj.login,
          remoteType: this.remote.remoteType
        };
      }

      return { isLoggedIn: false, user: null, remoteType: this.remote.remoteType };
    } catch (err) {
      return { isLoggedIn: false, user: null, remoteType: this.remote.remoteType, error: err.message };
    }
  }

  async logout() {
    const tool = this.getTool();
    if (!tool) return { success: true, message: 'No GitHub/GitLab CLI integration in "custom" mode.' };
    try {
      if (tool === 'glab') {
        await execAsync('glab auth logout');
      } else {
        await execAsync('gh auth logout --hostname github.com -y');
      }
      return { success: true };
    } catch (err) {
      try {
        await execAsync(`${tool} auth logout -y`);
        return { success: true };
      } catch (err2) {
        return { success: false, error: err2.message };
      }
    }
  }

  async getUserOrgs() {
    const tool = this.getTool();
    if (!tool) return [];
    try {
      const cmd = tool === 'glab' ? 'glab api groups' : 'gh api user/orgs';
      const { stdout } = await execAsync(cmd);
      const orgs = JSON.parse(stdout);
      return orgs.map(o => ({
        login: o.login || o.full_path || o.path || o.name,
        description: o.description || ''
      }));
    } catch {
      return [];
    }
  }

  async listReposForOwner(owner = null, limit = 50) {
    const tool = this.getTool();
    if (!tool) return [];
    try {
      let data;
      if (tool === 'glab') {
        const { stdout } = await execAsync(
          `glab api "projects?membership=true&per_page=${limit}&simple=true"`
        );
        data = JSON.parse(stdout);
        return data.map(p => ({
          name: p.name,
          nameWithOwner: p.path_with_namespace,
          description: p.description || '',
          url: p.web_url || p.http_url_to_repo || p.ssh_url_to_repo || '',
          isPrivate: p.visibility === 'private' || p.visibility === 'internal',
          updatedAt: p.last_activity_at || '',
          primaryLanguage: null,
          stargazerCount: p.star_count || 0
        }));
      }

      const cmd = owner
        ? `gh repo list ${owner} --json name,nameWithOwner,description,url,isPrivate,updatedAt,primaryLanguage,stargazerCount --limit ${limit}`
        : `gh repo list --json name,nameWithOwner,description,url,isPrivate,updatedAt,primaryLanguage,stargazerCount --limit ${limit}`;
      const { stdout } = await execAsync(cmd);
      return JSON.parse(stdout);
    } catch (err) {
      return [];
    }
  }

  async listUserRepos(limit = 50) {
    return await this.listReposForOwner(null, limit);
  }

  // Backwards-compatible aliases used by several views
  async getUserRepos(limit = 50) {
    return await this.listUserRepos(limit);
  }

  async listPullRequests(limit = 30) {
    const tool = this.getTool();
    if (!tool) return [];
    try {
      if (tool === 'glab') {
        const { stdout } = await execAsync(`glab mr list --output json --limit ${limit}`, { cwd: this.repoPath });
        const mrs = JSON.parse(stdout);
        return mrs.map(mr => ({
          number: mr.iid,
          title: mr.title,
          author: (mr.author && (mr.author.username || mr.author.name)) || 'Unknown',
          state: mr.state || '',
          headRefName: mr.source_branch || '',
          url: mr.web_url || '',
          createdAt: mr.created_at || ''
        }));
      }
      const { stdout } = await execAsync(`gh pr list --json number,title,author,state,headRefName,url,createdAt --limit ${limit}`, {
        cwd: this.repoPath
      });
      return JSON.parse(stdout);
    } catch {
      return [];
    }
  }

  async getPullRequests(limit = 30) {
    return await this.listPullRequests(limit);
  }

  async listIssues(limit = 30) {
    const tool = this.getTool();
    if (!tool) return [];
    try {
      if (tool === 'glab') {
        const { stdout } = await execAsync(`glab issue list --output json --limit ${limit}`, { cwd: this.repoPath });
        const issues = JSON.parse(stdout);
        return issues.map(i => ({
          number: i.iid,
          title: i.title,
          author: (i.author && (i.author.username || i.author.name)) || 'Unknown',
          state: i.state || '',
          labels: (i.labels || []).map(l => (typeof l === 'string' ? l : l.name)),
          url: i.web_url || '',
          createdAt: i.created_at || ''
        }));
      }
      const { stdout } = await execAsync(`gh issue list --json number,title,author,state,labels,url,createdAt --limit ${limit}`, {
        cwd: this.repoPath
      });
      return JSON.parse(stdout);
    } catch {
      return [];
    }
  }

  async getIssues(limit = 30) {
    return await this.listIssues(limit);
  }

  async createPullRequest(title, body = '', baseBranch = 'main') {
    const tool = this.getTool();
    if (!tool) return { success: false, error: 'GitHub/GitLab integration disabled in "custom" mode.' };
    try {
      const bodyArg = body ? `-b "${body.replace(/"/g, '\\"')}"` : '-b ""';
      const cmd = tool === 'glab'
        ? `glab mr create -t "${title.replace(/"/g, '\\"')}" ${bodyArg} --target-branch ${baseBranch}`
        : `gh pr create -t "${title.replace(/"/g, '\\"')}" ${bodyArg} -B ${baseBranch}`;
      const { stdout } = await execAsync(cmd, { cwd: this.repoPath });
      return { success: true, url: stdout.trim() };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async cloneRepo(repoNameWithOwner, targetBaseDir) {
    const tool = this.getTool();
    if (!tool) {
      return { success: false, error: 'Cloning requires GitHub (gh) or GitLab (glab). Use "git clone" manually in "custom" mode.' };
    }
    try {
      const parts = repoNameWithOwner.split('/');
      const repoName = parts[parts.length - 1].replace(/\.git$/, '');
      const destinationDir = path.join(targetBaseDir, repoName);

      if (fs.existsSync(destinationDir)) {
        const files = fs.readdirSync(destinationDir);
        if (files.length > 0) {
          return {
            success: false,
            error: `Destination path "${destinationDir}" already exists and is not an empty directory.\n\nPlease choose a different directory or delete existing files.`
          };
        }
      }

      const { stdout, stderr } = await execAsync(`${tool} repo clone ${repoNameWithOwner} "${destinationDir}"`);
      return { success: true, clonedPath: destinationDir, output: stdout || stderr };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async createRemoteRepo(name, isPrivate = false) {
    const tool = this.getTool();
    if (!tool) {
      return { success: false, error: 'Publishing requires GitHub (gh) or GitLab (glab). In "custom" mode, set a remote URL manually (Settings).' };
    }

    const visibility = isPrivate ? 'private' : 'public';

    // GitLab: try `glab repo create --source` + `--push` first, then API fallback.
    if (tool === 'glab') {
      try {
        await execAsync(`glab repo create "${name.replace(/"/g, '\\"')}" --${visibility} --source="${this.repoPath}" --push`, { cwd: this.repoPath });
        return { success: true, output: `Published GitLab repository "${name}"` };
      } catch {}
      try {
        const { stdout } = await execAsync(
          `glab api "projects" -f name="${name.replace(/"/g, '\\"')}" -f visibility=${visibility}`
        );
        const project = JSON.parse(stdout);
        const remoteUrl = project.http_url_to_repo || project.ssh_url_to_repo;
        if (remoteUrl) {
          await execAsync(`git remote remove origin 2>/dev/null; git remote add origin "${remoteUrl}"`, { cwd: this.repoPath });
          await execAsync(`git push -u origin HEAD`, { cwd: this.repoPath });
        }
        return { success: true, output: `Published GitLab repository "${name}"` };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }

    try {
      const visibilityFlag = isPrivate ? '--private' : '--public';
      const cmd = `gh repo create "${name.replace(/"/g, '\\"')}" ${visibilityFlag} --source="${this.repoPath}" --remote=origin --push`;
      const { stdout, stderr } = await execAsync(cmd, { cwd: this.repoPath });
      return { success: true, output: stdout || stderr };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async setCustomRemote(url) {
    try {
      if (!url || !url.trim()) return { success: false, error: 'No remote URL provided.' };
      const clean = url.trim();
      await execAsync('git remote remove origin', { cwd: this.repoPath }).catch(() => {});
      await execAsync(`git remote add origin "${clean}"`, { cwd: this.repoPath });
      this.remote.customRemoteUrl = clean;
      RemoteConfig.save(this.remote);
      return { success: true, message: `Origin set to ${clean}` };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}