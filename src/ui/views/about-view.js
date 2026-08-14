import blessed from 'blessed';
import { I18nService } from '../../git/i18n-service.js';

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
      width: '42%',
      height: '100%',
      label: ' {bold}{magenta-fg}👨‍💻 Creator Profile (GitHub API){/magenta-fg}{/bold} ',
      tags: true,
      border: { type: 'line' },
      style: {
        border: { fg: 'magenta' },
        bg: 'black'
      },
      scrollable: true,
      scrollbar: { ch: '█', style: { fg: 'magenta' } }
    });

    // Right Column: App Info, Features & Language Selector
    this.infoBox = blessed.box({
      parent: this.container,
      top: 0,
      left: '42%',
      width: '58%',
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
      width: 32,
      height: 1,
      content: ' [F3] Switch Language (EN/ES/CA) ',
      style: {
        bg: 'blue',
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
  }

  async loadProfile() {
    this.profileBox.setContent('{cyan-fg}Fetching live profile via GitHub API (gh api users/j0rd1s3rr4n0)...{/cyan-fg}');
    this.screen.render();

    try {
      const ghService = this.app.ghService;
      let userObj = null;
      try {
        const { stdout } = await ghService.execAsync ? ghService.execAsync('gh api users/j0rd1s3rr4n0') : { stdout: '' };
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
          public_repos: 100,
          followers: 204,
          following: 489
        };
      }

      const avatarArt = [
        '{magenta-fg}   ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄   {/magenta-fg}',
        '{magenta-fg}  █ {bold}🐙  j0rd1s3rr4n0  {/bold} █  {/magenta-fg}',
        '{magenta-fg}  █  Ethical Hacker    █  {/magenta-fg}',
        '{magenta-fg}  █  & Threat Hunter   █  {/magenta-fg}',
        '{magenta-fg}   ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀   {/magenta-fg}'
      ].join('\n');

      const profileContent = [
        avatarArt,
        '',
        `{bold}{yellow-fg}Name:{/yellow-fg}{/bold}      ${userObj.name || 'Jordi Serrano'}`,
        `{bold}{yellow-fg}Username:{/yellow-fg}{/bold}  @${userObj.login}`,
        `{bold}{yellow-fg}Location:{/yellow-fg}{/bold}  ${userObj.location || 'Barcelona'}`,
        `{bold}{yellow-fg}Website:{/yellow-fg}{/bold}   ${userObj.blog || 'jordiserrano.me'}`,
        `{bold}{yellow-fg}GitHub:{/yellow-fg}{/bold}    {cyan-fg}${userObj.html_url}{/cyan-fg}`,
        '',
        `{bold}{yellow-fg}Bio:{/yellow-fg}{/bold}`,
        `  "${userObj.bio || 'Ethical hacker & Threat Hunter'}"`,
        '',
        `{bold}{yellow-fg}GitHub Metrics:{/yellow-fg}{/bold}`,
        `  • {green-fg}Public Repositories:{/green-fg} ${userObj.public_repos}`,
        `  • {green-fg}Followers:{/green-fg}           ${userObj.followers}`,
        `  • {green-fg}Following:{/green-fg}           ${userObj.following}`
      ].join('\n');

      this.profileBox.setContent(profileContent);
    } catch {
      this.profileBox.setContent('{red-fg}Failed to load profile details.{/red-fg}');
    }

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
      `  • {green-fg}7: About{/green-fg}       - Profile & Multi-language settings`,
      '',
      `{bold}{yellow-fg}Current Language:{/yellow-fg}{/bold} {green-fg}${currentLang}{/green-fg}`
    ].join('\n');

    this.infoBox.setContent(infoContent);
    this.langBtn.setContent(` [F3] Language: ${currentLang} (EN/ES/CA) `);
    this.screen.render();
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
