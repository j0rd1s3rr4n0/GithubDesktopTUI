import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = util.promisify(exec);

export class GhService {
  constructor(repoPath = process.cwd()) {
    this.repoPath = repoPath;
  }

  async isGhAvailable() {
    try {
      await execAsync('gh --version');
      return true;
    } catch {
      return false;
    }
  }

  async getAuthStatus() {
    try {
      const { stdout, stderr } = await execAsync('gh auth status');
      const output = stdout + stderr;
      
      const loggedInMatch = output.match(/Logged in to ([^\s]+) account ([^\s]+)/i) || 
                            output.match(/Logged in to ([^\s]+) as ([^\s]+)/i);

      if (loggedInMatch) {
        return {
          isLoggedIn: true,
          host: loggedInMatch[1],
          user: loggedInMatch[2].replace(/[()]/g, '')
        };
      }

      try {
        const { stdout: userJson } = await execAsync('gh api user');
        const userObj = JSON.parse(userJson);
        if (userObj && userObj.login) {
          return {
            isLoggedIn: true,
            host: 'github.com',
            user: userObj.login,
            name: userObj.name || userObj.login
          };
        }
      } catch {}

      return { isLoggedIn: false, user: null };
    } catch (err) {
      return { isLoggedIn: false, user: null, error: err.message };
    }
  }

  async logout() {
    try {
      await execAsync('gh auth logout --hostname github.com -y');
      return { success: true };
    } catch (err) {
      try {
        await execAsync('gh auth logout -y');
        return { success: true };
      } catch (err2) {
        return { success: false, error: err2.message };
      }
    }
  }

  async getUserOrgs() {
    try {
      const { stdout } = await execAsync('gh api user/orgs');
      const orgs = JSON.parse(stdout);
      return orgs.map(o => ({
        login: o.login,
        description: o.description || ''
      }));
    } catch {
      return [];
    }
  }

  async listReposForOwner(owner = null, limit = 50) {
    try {
      const cmd = owner ? `gh repo list ${owner} --json name,nameWithOwner,description,url,isPrivate,updatedAt --limit ${limit}`
                        : `gh repo list --json name,nameWithOwner,description,url,isPrivate,updatedAt --limit ${limit}`;
      const { stdout } = await execAsync(cmd);
      return JSON.parse(stdout);
    } catch (err) {
      return [];
    }
  }

  async listUserRepos(limit = 50) {
    return await this.listReposForOwner(null, limit);
  }

  async listPullRequests(limit = 30) {
    try {
      const { stdout } = await execAsync(`gh pr list --json number,title,author,state,headRefName,url,createdAt --limit ${limit}`, {
        cwd: this.repoPath
      });
      return JSON.parse(stdout);
    } catch {
      return [];
    }
  }

  async listIssues(limit = 30) {
    try {
      const { stdout } = await execAsync(`gh issue list --json number,title,author,state,labels,url,createdAt --limit ${limit}`, {
        cwd: this.repoPath
      });
      return JSON.parse(stdout);
    } catch {
      return [];
    }
  }

  async createPullRequest(title, body = '', baseBranch = 'main') {
    try {
      const bodyArg = body ? `-b "${body.replace(/"/g, '\\"')}"` : '-b ""';
      const { stdout } = await execAsync(`gh pr create -t "${title.replace(/"/g, '\\"')}" ${bodyArg} -B ${baseBranch}`, {
        cwd: this.repoPath
      });
      return { success: true, url: stdout.trim() };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async cloneRepo(repoNameWithOwner, targetBaseDir) {
    try {
      // Extract repo name e.g. "owner/my-app" -> "my-app"
      const parts = repoNameWithOwner.split('/');
      const repoName = parts[parts.length - 1].replace(/\.git$/, '');
      const destinationDir = path.join(targetBaseDir, repoName);

      // If destination directory exists and is not empty, handle error clearly
      if (fs.existsSync(destinationDir)) {
        const files = fs.readdirSync(destinationDir);
        if (files.length > 0) {
          return {
            success: false,
            error: `Destination path "${destinationDir}" already exists and is not an empty directory.\n\nPlease choose a different directory or delete existing files.`
          };
        }
      }

      const { stdout, stderr } = await execAsync(`gh repo clone ${repoNameWithOwner} "${destinationDir}"`);
      return { success: true, clonedPath: destinationDir, output: stdout || stderr };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}
