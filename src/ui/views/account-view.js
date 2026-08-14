import blessed from 'blessed';
import { exec, execSync } from 'child_process';
import util from 'util';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { RepoStore } from '../../git/repo-store.js';
import { I18nService } from '../../git/i18n-service.js';

const execAsync = util.promisify(exec);
const USER_AVATAR_PATH = path.join(os.homedir(), '.gitu_user_avatar.jpg');

export class AccountView {
  constructor(screen, app, options = {}) {
    this.screen = screen;
    this.app = app;

    this.container = blessed.box({
      top: options.top || 6,
      left: 0,
      width: '100%',
      height: '100%-6',
      hidden: true
    });

    // Left Column: User Profile & Avatar Box
    this.profileBox = blessed.box({
      parent: this.container,
      top: 0,
      left: 0,
      width: '44%',
      height: '100%',
      label: ` {bold}{magenta-fg}${I18nService.t('tabAccount') || '[8] My Account'}{/magenta-fg}{/bold} `,
      tags: true,
      border: { type: 'line' },
      style: {
        border: { fg: 'magenta' },
        bg: 'black'
      },
      scrollable: true,
      scrollbar: { ch: '█', style: { fg: 'magenta' } }
    });

    // TrueColor ANSI Avatar Box (Perfect 1:1 Square Aspect Ratio: 32x32 px = 32 cols x 16 rows)
    this.avatarBox = blessed.box({
      parent: this.profileBox,
      top: 1,
      left: 'center',
      width: 36,
      height: 16,
      tags: false,
      align: 'center'
    });

    this.profileDetailsBox = blessed.box({
      parent: this.profileBox,
      top: 17,
      left: 0,
      width: '100%-2',
      height: '100%-19',
      tags: true
    });

    // Right Column Top: Code & Activity Statistics
    this.statsBox = blessed.box({
      parent: this.container,
      top: 0,
      left: '44%',
      width: '56%',
      height: '50%',
      label: ' {bold}{cyan-fg}📊 Code Statistics & Activity Log{/cyan-fg}{/bold} ',
      tags: true,
      border: { type: 'line' },
      style: {
        border: { fg: 'cyan' },
        bg: 'black'
      },
      scrollable: true,
      scrollbar: { ch: '█', style: { fg: 'cyan' } }
    });

    // Right Column Bottom: Interactive Personal Repos & Starred Repos List
    this.userReposList = blessed.list({
      parent: this.container,
      top: '50%',
      left: '44%',
      width: '56%',
      height: '50%',
      label: ' {bold}{yellow-fg}🌐 My GitHub Repositories (Select & Enter to Clone/Open){/yellow-fg}{/bold} ',
      tags: true,
      border: { type: 'line' },
      style: {
        border: { fg: 'yellow' },
        selected: { bg: 'blue', fg: 'white', bold: true },
        focus: { border: { fg: 'green' } }
      },
      keys: true,
      vi: true,
      mouse: true,
      scrollable: true,
      scrollbar: { ch: '█', style: { fg: 'yellow' } }
    });

    this.loginBtn = blessed.button({
      parent: this.profileBox,
      bottom: 1,
      left: 2,
      width: 32,
      height: 1,
      content: ' [L] Authenticate / Switch ',
      style: {
        bg: 'blue',
        fg: 'white',
        bold: true,
        focus: { bg: 'yellow', fg: 'black' }
      },
      mouse: true,
      keys: true
    });

    this.userRepos = [];
    this.setupEvents();
  }

  updateI18nLabels() {
    this.profileBox.setLabel(` {bold}{magenta-fg}${I18nService.t('tabAccount') || '[8] My Account'}{/magenta-fg}{/bold} `);
    this.screen.render();
  }

  setupEvents() {
    this.loginBtn.on('press', () => this.app.handleGhAuthDirect());
    this.loginBtn.on('click', () => this.app.handleGhAuthDirect());

    this.userReposList.on('select item', (item, index) => {
      if (this.userRepos && this.userRepos[index]) {
        const repo = this.userRepos[index];
        this.app.notify(`Selected repo: ${repo.nameWithOwner} (${repo.stargazerCount || 0} ★)`);
      }
    });

    this.userReposList.key(['enter'], () => {
      const idx = this.userReposList.selected;
      if (this.userRepos && this.userRepos[idx]) {
        const repo = this.userRepos[idx];
        if (this.app.cloneDestModal) {
          this.app.cloneDestModal.prompt(repo.nameWithOwner, this.app.gitService.repoPath);
        }
      }
    });
  }

  generateAnsiAvatarSync(imagePath) {
    const pyScript = `
from PIL import Image
import os, sys

img_path = "${imagePath}"
if not os.path.exists(img_path):
    sys.exit(1)

try:
    resample = Image.Resampling.LANCZOS
except AttributeError:
    resample = Image.LANCZOS

img = Image.open(img_path).resize((32, 32), resample).convert("RGB")
w, h = img.size

lines = []
for y in range(0, h, 2):
    line = " "
    for x in range(w):
        r1, g1, b1 = img.getpixel((x, y))
        r2, g2, b2 = img.getpixel((x, min(y + 1, h - 1)))
        line += f"\\x1b[38;2;{r1};{g1};{b1}m\\x1b[48;2;{r2};{g2};{b2}m▀\\x1b[0m"
    lines.append(line)

print("\\n".join(lines))
    `;

    try {
      return execSync(`python3 -c '${pyScript}'`, { encoding: 'utf8' });
    } catch {
      return null;
    }
  }

  async fetchGitCodeStats() {
    let commitCount = 0;
    let addedLines = 0;
    let deletedLines = 0;

    try {
      const { stdout: commitsOut } = await execAsync('git rev-list --count HEAD');
      commitCount = parseInt(commitsOut.trim(), 10) || 0;
    } catch {}

    try {
      const { stdout: statOut } = await execAsync('git log --shortstat');
      const insertionsMatches = statOut.match(/(\d+)\s+insertions?\(\+\)/g);
      const deletionsMatches = statOut.match(/(\d+)\s+deletions?\(-\)/g);

      if (insertionsMatches) {
        insertionsMatches.forEach(m => {
          const num = parseInt(m.match(/\d+/)[0], 10);
          addedLines += num;
        });
      }

      if (deletionsMatches) {
        deletionsMatches.forEach(m => {
          const num = parseInt(m.match(/\d+/)[0], 10);
          deletedLines += num;
        });
      }
    } catch {}

    return { commitCount, addedLines, deletedLines };
  }

  async refresh() {
    this.updateI18nLabels();
    this.profileDetailsBox.setContent('{cyan-fg}Loading GitHub account API data & statistics...{/cyan-fg}');
    this.screen.render();

    const auth = await this.app.ghService.getAuthStatus();
    let userObj = null;
    let userOrgs = [];

    if (auth.isLoggedIn) {
      try {
        const { stdout } = await execAsync('gh api user');
        userObj = JSON.parse(stdout);
      } catch {}

      try {
        const { stdout: orgsOut } = await execAsync('gh api user/orgs');
        userOrgs = JSON.parse(orgsOut);
      } catch {}
    }

    if (!userObj) {
      this.avatarBox.setContent('\x1b[33m  🔑 Not Authenticated with GitHub  \x1b[0m');
      this.profileDetailsBox.setContent([
        '{yellow-fg}{bold}Status:{/bold} Not Logged In{/yellow-fg}',
        '',
        'Press {cyan-fg}[L]{/cyan-fg} or click the button below to authenticate with GitHub CLI.',
        'Once logged in, your full GitHub API metrics, organizations, avatar, and personal repos will load automatically.'
      ].join('\n'));
      this.userReposList.setItems(['{yellow-fg}Press [L] to authenticate with GitHub CLI{/yellow-fg}']);
    } else {
      try {
        if (userObj.avatar_url) {
          execSync(`curl -s -L "${userObj.avatar_url}" -o "${USER_AVATAR_PATH}"`);
        }
      } catch {}

      let ansiArt = null;
      if (fs.existsSync(USER_AVATAR_PATH)) {
        ansiArt = this.generateAnsiAvatarSync(USER_AVATAR_PATH);
      }

      if (ansiArt) {
        this.avatarBox.setContent(ansiArt);
      } else {
        this.avatarBox.setContent(`\x1b[35m  🐙 @${userObj.login} Avatar  \x1b[0m`);
      }

      const orgsStr = userOrgs.length ? userOrgs.map(o => `{magenta-fg}@${o.login}{/magenta-fg}`).join(', ') : '{gray-fg}None{/gray-fg}';

      const profileContent = [
        `{bold}{yellow-fg}Username:{/yellow-fg}{/bold}  @${userObj.login}`,
        `{bold}{yellow-fg}Name:{/yellow-fg}{/bold}      ${userObj.name || 'N/A'}`,
        `{bold}{yellow-fg}Company:{/yellow-fg}{/bold}   ${userObj.company || 'N/A'}`,
        `{bold}{yellow-fg}Location:{/yellow-fg}{/bold}  ${userObj.location || 'N/A'}`,
        `{bold}{yellow-fg}Email:{/yellow-fg}{/bold}     ${userObj.email || 'N/A'}`,
        `{bold}{yellow-fg}Website:{/yellow-fg}{/bold}   ${userObj.blog || 'N/A'}`,
        `{bold}{yellow-fg}Twitter/X:{/yellow-fg}{/bold} @${userObj.twitter_username || 'N/A'}`,
        `{bold}{yellow-fg}Hireable:{/yellow-fg}{/bold}  ${userObj.hireable ? '{green-fg}Yes ✓{/green-fg}' : 'No'}`,
        `{bold}{yellow-fg}GitHub:{/yellow-fg}{/bold}    {cyan-fg}${userObj.html_url}{/cyan-fg}`,
        '',
        `{bold}{yellow-fg}Bio:{/yellow-fg}{/bold}`,
        `  "${userObj.bio || 'No bio provided'}"`,
        '',
        `{bold}{yellow-fg}GitHub Organizations:{/yellow-fg}{/bold}`,
        `  ${orgsStr}`,
        '',
        `{bold}{yellow-fg}GitHub Account API Metrics:{/yellow-fg}{/bold}`,
        `  • {green-fg}Public Repositories:{/green-fg} ${userObj.public_repos}`,
        `  • {green-fg}Public Gists:{/green-fg}        ${userObj.public_gists || 0}`,
        `  • {green-fg}Followers:{/green-fg}           ${userObj.followers}`,
        `  • {green-fg}Following:{/green-fg}           ${userObj.following}`,
        `  • {green-fg}Account Created:{/green-fg}     ${(userObj.created_at || '').slice(0, 10)}`
      ].join('\n');

      this.profileDetailsBox.setContent(profileContent);

      // Fetch personal repositories via GitHub API
      try {
        const repos = await this.app.ghService.getUserRepos();
        this.userRepos = repos;
        const items = repos.map(r => {
          const vis = r.isPrivate ? '{magenta-fg}🔒 Private{/magenta-fg}' : '{green-fg}🌐 Public{/green-fg}';
          const lang = r.primaryLanguage && r.primaryLanguage.name ? `{yellow-fg}[${r.primaryLanguage.name}]{/yellow-fg} ` : '';
          return `${vis} ${lang}{bold}${r.nameWithOwner}{/bold} {yellow-fg}★ ${r.stargazerCount || 0}{/yellow-fg}`;
        });
        this.userReposList.setItems(items.length ? items : ['{gray-fg}No personal repositories found{/gray-fg}']);
      } catch {
        this.userReposList.setItems(['{red-fg}Failed to fetch user repositories via GitHub API{/red-fg}']);
      }
    }

    // Load Code & Git Activity Stats
    const gitStats = await this.fetchGitCodeStats();
    const appStats = RepoStore.getStats();
    const netLines = gitStats.addedLines - gitStats.deletedLines;
    const netFormatted = netLines >= 0 ? `{green-fg}+${netLines.toLocaleString()}{/green-fg}` : `{red-fg}${netLines.toLocaleString()}{/red-fg}`;

    const statsContent = [
      '{bold}{yellow-fg}📈 Repository Code Statistics:{/yellow-fg}{/bold}',
      `  • {bold}Total Commits in Repo:{/bold}     {yellow-fg}${gitStats.commitCount}{/yellow-fg} commits`,
      `  • {bold}Characters / Lines Added ({green-fg}+{/green-fg}):{/bold}   {green-fg}+${gitStats.addedLines.toLocaleString()}{/green-fg} lines`,
      `  • {bold}Characters / Lines Deleted ({red-fg}-{/red-fg}):{/bold} {red-fg}-${gitStats.deletedLines.toLocaleString()}{/red-fg} lines`,
      `  • {bold}Net Code Contributed:{/bold}         ${netFormatted} lines`,
      '',
      '{bold}{yellow-fg}🚀 TUI Application Activity:{/bold}{/yellow-fg}',
      `  • {bold}Total Push Operations:{/bold}        {magenta-fg}${appStats.totalPushes}{/magenta-fg} pushes`,
      `  • {bold}Total Pull Operations:{/bold}        {cyan-fg}${appStats.totalPulls}{/cyan-fg} pulls`,
      `  • {bold}Recent Repos Managed:{/bold}         ${appStats.recentCount} repos`,
      `  • {bold}Cloned GitHub Repos:{/bold}          ${appStats.clonedCount} repos`,
      '',
      '{bold}{yellow-fg}🌐 GitHub Service Integration:{/yellow-fg}{/bold}',
      `  • {bold}Authentication Status:{/bold}        ${auth.isLoggedIn ? '{green-fg}✓ Connected{/green-fg}' : '{red-fg}✗ Disconnected{/red-fg}'}`
    ].join('\n');

    this.statsBox.setContent(statsContent);
    this.screen.render();
  }

  show() {
    this.container.show();
    this.profileBox.focus();
    this.refresh();
  }

  hide() {
    this.container.hide();
  }
}
