import { execSync, exec } from 'child_process';
import util from 'util';

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

      // Check alternative JSON format
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

  async listUserRepos(limit = 30) {
    try {
      const { stdout } = await execAsync(`gh repo list --json name,nameWithOwner,description,url,isPrivate,updatedAt --limit ${limit}`);
      return JSON.parse(stdout);
    } catch (err) {
      return [];
    }
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

  async cloneRepo(repoNameWithOwner, targetDir) {
    try {
      const { stdout } = await execAsync(`gh repo clone ${repoNameWithOwner} "${targetDir}"`);
      return { success: true, output: stdout };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}
