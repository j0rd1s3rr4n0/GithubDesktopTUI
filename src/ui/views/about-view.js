import blessed from 'blessed';
import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { I18nService } from '../../git/i18n-service.js';

const execAsync = util.promisify(exec);
const AVATAR_CACHE_PATH = path.join(os.homedir(), '.gitu_avatar.jpg');

export class AboutView {
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

    // Left Column: Developer Profile Box with Avatar & GitHub Stats
    this.profileBox = blessed.box({
      parent: this.container,
      top: 0,
      left: 0,
      width: '44%',
      height: '100%',
      label: ' {bold}{magenta-fg}👨‍💻 Creator Profile & Live Avatar{/magenta-fg}{/bold} ',
      tags: true,
      border: { type: 'line' },
      style: {
        border: { fg: 'magenta' },
        bg: 'black'
      },
      scrollable: true,
      scrollbar: { ch: '█', style: { fg: 'magenta' } }
    });

    // Container for ANSI image widget
    this.avatarContainer = blessed.box({
      parent: this.profileBox,
      top: 0,
      left: 'center',
      width: 24,
      height: 10,
      tags: true
    });

    // Text box for text details below avatar
    this.profileDetailsBox = blessed.box({
      parent: this.profileBox,
      top: 10,
      left: 0,
      width: '100%-2',
      height: '100%-12',
      tags: true
    });

    // Right Column: App Info, Features & Language Selector
    this.infoBox = blessed.box({
      parent: this.container,
      top: 0,
      left: '44%',
      width: '56%',
      height: '100%',
      label: ' {bold}{cyan-fg}🐙 Application & Settings{/cyan-fg}{/bold} ',
      tags: true,
      border: { type: 'line' },
      style: {
        border: { fg: 'cyan' },
        bg: 'black'
      },
      scrollable: true,
      scrollbar: { ch: '█', style: { fg: 'cyan' } }
    });

    this.langBtn = blessed.button({
      parent: this.infoBox,
      bottom: 2,
      left: 2,
      width: 34,
      height: 1,
      content: ' [F3] Switch Language ',
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
      parent: this.profileBox,
      bottom: 1,
      left: 2,
      width: 32,
      height: 1,
      content: ' [r] Sync Profile with GitHub ',
      style: {
        bg: 'magenta',
        fg: 'white',
        bold: true,
        focus: { bg: 'yellow', fg: 'black' }
      },
      mouse: true,
      keys: true
    });

    this.setupEvents();
  }

  setupEvents() {
    const cycleLang = () => {
      const newLang = I18nService.cycleLanguage();
      this.app.notify(`Language changed to: ${newLang.toUpperCase()}`);
      this.app.updateI18nLabels();
    };

    this.langBtn.on('press', cycleLang);
    this.langBtn.on('click', cycleLang);

    const refreshProfile = () => {
      this.loadProfile();
      this.app.notify('Synced live GitHub profile & avatar for @j0rd1s3rr4n0');
    };

    this.refreshBtn.on('press', refreshProfile);
    this.refreshBtn.on('click', refreshProfile);
  }

  async loadProfile() {
    this.profileDetailsBox.setContent('{cyan-fg}Syncing live GitHub profile & avatar (@j0rd1s3rr4n0)...{/cyan-fg}');
    this.screen.render();

    let userObj = null;
    try {
      const { stdout } = await execAsync('gh api users/j0rd1s3rr4n0');
      userObj = JSON.parse(stdout);
    } catch {}

    if (!userObj) {
      userObj = {
        login: 'j0rd1s3rr4n0',
        name: 'Jordi Serrano',
        bio: 'Configuring Whoami | Ethical hacker & Threat Hunter',
        location: 'Barcelona',
        blog: 'jordiserrano.me',
        html_url: 'https://github.com/j0rd1s3rr4n0',
        avatar_url: 'https://avatars.githubusercontent.com/u/44474715?v=4',
        public_repos: 100,
        followers: 204,
        following: 489
      };
    }

    // Try downloading avatar image for ANSI rendering
    try {
      const avatarUrl = userObj.avatar_url || 'https://avatars.githubusercontent.com/u/44474715?v=4';
      await execAsync(`curl -s -L "${avatarUrl}" -o "${AVATAR_CACHE_PATH}"`);
    } catch {}

    // Render ANSI avatar image if file exists
    if (fs.existsSync(AVATAR_CACHE_PATH)) {
      try {
        if (this.avatarImageWidget) {
          this.avatarImageWidget.destroy();
        }
        this.avatarImageWidget = blessed.ansiimage({
          parent: this.avatarContainer,
          top: 0,
          left: 'center',
          width: 22,
          height: 10,
          file: AVATAR_CACHE_PATH,
          animate: false
        });
      } catch {
        this.avatarContainer.setContent('{magenta-fg}🐙 j0rd1s3rr4n0 Avatar{/magenta-fg}');
      }
    } else {
      this.avatarContainer.setContent('{magenta-fg}🐙 j0rd1s3rr4n0 Avatar{/magenta-fg}');
    }

    const profileContent = [
      `{bold}{yellow-fg}Name:{/yellow-fg}{/bold}      ${userObj.name || 'Jordi Serrano'}`,
      `{bold}{yellow-fg}Username:{/yellow-fg}{/bold}  @${userObj.login}`,
      `{bold}{yellow-fg}Location:{/yellow-fg}{/bold}  ${userObj.location || 'Barcelona'}`,
      `{bold}{yellow-fg}Website:{/yellow-fg}{/bold}   ${userObj.blog || 'jordiserrano.me'}`,
      `{bold}{yellow-fg}GitHub:{/yellow-fg}{/bold}    {cyan-fg}${userObj.html_url}{/cyan-fg}`,
      '',
      `{bold}{yellow-fg}Live Bio:{/yellow-fg}{/bold}`,
      `  "${userObj.bio || 'Ethical hacker & Threat Hunter'}"`,
      '',
      `{bold}{yellow-fg}Real-Time GitHub Stats:{/yellow-fg}{/bold}`,
      `  • {green-fg}Public Repositories:{/green-fg} ${userObj.public_repos}`,
      `  • {green-fg}Followers:{/green-fg}           ${userObj.followers}`,
      `  • {green-fg}Following:{/green-fg}           ${userObj.following}`
    ].join('\n');

    this.profileDetailsBox.setContent(profileContent);
    this.renderInfo();
  }

  renderInfo() {
    const currentLang = I18nService.getLanguage().toUpperCase();

    const infoContent = [
      `{bold}{cyan-fg}${I18nService.t('aboutTitle')}{/cyan-fg}{/bold}`,
      `{gray-fg}${I18nService.t('aboutVersion')}{/gray-fg}`,
      '',
      `{yellow-fg}{bold}App Description:{/bold}{/yellow-fg}`,
      `${I18nService.t('aboutAppDesc')}`,
      '',
      `{yellow-fg}{bold}${I18nService.t('creatorTitle')}{/bold}{/yellow-fg}`,
      `  👨‍💻 {bold}{magenta-fg}j0rd1s3rr4n0{/magenta-fg}{/bold}`,
      `  🌐 ${I18nService.t('githubProfile')} {cyan-fg}https://github.com/j0rd1s3rr4n0{/cyan-fg}`,
      '',
      `{yellow-fg}{bold}${I18nService.t('featuresTitle')}{/bold}{/yellow-fg}`,
      `  • {green-fg}1: Changes{/green-fg}     - Staging, unified diff preview & commits`,
      `  • {green-fg}2: History{/green-fg}     - Interactive commit log & patch viewer`,
      `  • {green-fg}3: Branches{/green-fg}    - Branch checkout, push & pull`,
      `  • {green-fg}4: Stash{/green-fg}       - Stash drawer manager`,
      `  • {green-fg}5: GitHub{/green-fg}      - Pull Requests, Issues & Repositories`,
      `  • {green-fg}6: Repositories{/green-fg}- Unified local & cloned repo switcher`,
      `  • {green-fg}7: About{/green-fg}       - Live Profile, Image Avatar & i18n`,
      '',
      `{bold}{yellow-fg}Active Language:{/yellow-fg}{/bold} {green-fg}${currentLang}{/green-fg}`
    ].join('\n');

    this.infoBox.setContent(infoContent);
    this.langBtn.setContent(` [F3] Switch Language (${currentLang}) `);
    this.screen.render();
  }

  refresh() {
    this.loadProfile();
  }

  show() {
    this.container.show();
    this.profileBox.focus();
    this.loadProfile();
  }

  hide() {
    this.container.hide();
  }
}
