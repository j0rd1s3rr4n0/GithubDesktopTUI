import blessed from 'blessed';
import { exec } from 'child_process';
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
      width: '46%',
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

    // Right Column: Code & Git Activity Statistics
    this.statsBox = blessed.box({
      parent: this.container,
      top: 0,
      left: '46%',
      width: '54%',
      height: '100%',
      label: ' {bold}{cyan-fg}📊 Code & Activity Statistics{/cyan-fg}{/bold} ',
      tags: true,
      border: { type: 'line' },
      style: {
        border: { fg: 'cyan' },
        bg: 'black'
      },
      scrollable: true,
      scrollbar: { ch: '█', style: { fg: 'cyan' } }
    });

    this.loginBtn = blessed.button({
      parent: this.profileBox,
      bottom: 1,
      left: 2,
      width: 32,
      height: 1,
      content: ' [L] Authenticate with GitHub ',
      style: {
        bg: 'blue',
        fg: 'white',
        bold: true,
        focus: { bg: 'yellow', fg: 'black' }
      },
      mouse: true,
      keys: true
    });

    this.refreshBtn = blessed.button({
      parent: this.statsBox,
      bottom: 1,
      left: 2,
      width: 32,
      height: 1,
      content: ' [r] Refresh Account Stats ',
      style: {
        bg: 'green',
        fg: 'black',
        bold: true,
        focus: { bg: 'yellow', fg: 'black' }
      },
      mouse: true,
      keys: true
    });

    this.setupEvents();
  }

  updateI18nLabels() {
    this.profileBox.setLabel(` {bold}{magenta-fg}${I18nService.t('tabAccount') || '[8] My Account'}{/magenta-fg}{/bold} `);
    this.screen.render();
  }

  setupEvents() {
    this.loginBtn.on('press', () => this.app.handleGhAuthDirect());
    this.loginBtn.on('click', () => this.app.handleGhAuthDirect());

    this.refreshBtn.on('press', () => this.refresh());
    this.refreshBtn.on('click', () => this.refresh());
  }

  async generateAnsiAvatar(imagePath) {
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
      const { stdout } = await execAsync(`python3 -c '${pyScript}'`);
      return stdout;
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
    this.profileDetailsBox.setContent('{cyan-fg}Loading user account & code stats...{/cyan-fg}');
    this.screen.render();

    const auth = await this.app.ghService.getAuthStatus();
    let userObj = null;

    if (auth.isLoggedIn) {
      try {
        const { stdout } = await execAsync('gh api user');
        userObj = JSON.parse(stdout);
      } catch {}
    }

    if (!userObj) {
      this.avatarBox.setContent('\x1b[33m  🔑 Not Authenticated with GitHub  \x1b[0m');
      this.profileDetailsBox.setContent([
        '{yellow-fg}{bold}Status:{/bold} Not Logged In{/yellow-fg}',
        '',
        'Press {cyan-fg}[L]{/cyan-fg} or click the button below to authenticate with GitHub CLI.',
        'Once logged in, your profile, metrics, avatar, and PRs will sync automatically.'
      ].join('\n'));
    } else {
      try {
        if (userObj.avatar_url) {
          await execAsync(`curl -s -L "${userObj.avatar_url}" -o "${USER_AVATAR_PATH}"`);
        }
      } catch {}

      let ansiArt = null;
      if (fs.existsSync(USER_AVATAR_PATH)) {
        ansiArt = await this.generateAnsiAvatar(USER_AVATAR_PATH);
      }

      if (ansiArt) {
        this.avatarBox.setContent(ansiArt);
      } else {
        this.avatarBox.setContent(`\x1b[35m  🐙 @${userObj.login} Avatar  \x1b[0m`);
      }

      const profileContent = [
        `{bold}{yellow-fg}Username:{/yellow-fg}{/bold}  @${userObj.login}`,
        `{bold}{yellow-fg}Name:{/yellow-fg}{/bold}      ${userObj.name || 'N/A'}`,
        `{bold}{yellow-fg}Location:{/yellow-fg}{/bold}  ${userObj.location || 'N/A'}`,
        `{bold}{yellow-fg}Website:{/yellow-fg}{/bold}   ${userObj.blog || 'N/A'}`,
        `{bold}{yellow-fg}GitHub:{/yellow-fg}{/bold}    {cyan-fg}${userObj.html_url}{/cyan-fg}`,
        '',
        `{bold}{yellow-fg}Bio:{/yellow-fg}{/bold}`,
        `  "${userObj.bio || 'No bio provided'}"`,
        '',
        `{bold}{yellow-fg}GitHub Account Metrics:{/yellow-fg}{/bold}`,
        `  • {green-fg}Public Repositories:{/green-fg} ${userObj.public_repos}`,
        `  • {green-fg}Followers:{/green-fg}           ${userObj.followers}`,
        `  • {green-fg}Following:{/green-fg}           ${userObj.following}`
      ].join('\n');

      this.profileDetailsBox.setContent(profileContent);
    }

    const gitStats = await this.fetchGitCodeStats();
    const appStats = RepoStore.getStats();
    const netLines = gitStats.addedLines - gitStats.deletedLines;
    const netFormatted = netLines >= 0 ? `{green-fg}+${netLines}{/green-fg}` : `{red-fg}${netLines}{/red-fg}`;

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
