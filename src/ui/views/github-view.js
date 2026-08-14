import blessed from 'blessed';
import { I18nService } from '../../git/i18n-service.js';

export class GithubView {
  constructor(screen, ghService, options = {}) {
    this.screen = screen;
    this.ghService = ghService;

    this.container = blessed.box({
      top: options.top || 6,
      left: 0,
      width: '100%',
      height: '100%-6',
      hidden: true
    });

    // Top Panel: Pull Requests
    this.prList = blessed.list({
      parent: this.container,
      top: 0,
      left: 0,
      width: '50%',
      height: '50%',
      label: ` {bold}${I18nService.t('prListLabel')}{/bold} `,
      tags: true,
      border: { type: 'line' },
      style: {
        border: { fg: 'green' },
        selected: { bg: 'blue', fg: 'white', bold: true },
        focus: { border: { fg: 'yellow' } }
      },
      keys: true,
      vi: true,
      mouse: true,
      scrollable: true,
      scrollbar: { ch: '█', style: { fg: 'green' } }
    });

    // Top Right: Issues
    this.issueList = blessed.list({
      parent: this.container,
      top: 0,
      left: '50%',
      width: '50%',
      height: '50%',
      label: ` {bold}${I18nService.t('issuesListLabel')}{/bold} `,
      tags: true,
      border: { type: 'line' },
      style: {
        border: { fg: 'yellow' },
        selected: { bg: 'blue', fg: 'white', bold: true },
        focus: { border: { fg: 'yellow' } }
      },
      keys: true,
      vi: true,
      mouse: true,
      scrollable: true,
      scrollbar: { ch: '█', style: { fg: 'yellow' } }
    });

    // Bottom Panel: Remote Repositories
    this.repoList = blessed.list({
      parent: this.container,
      top: '50%',
      left: 0,
      width: '100%',
      height: '50%',
      label: ` {bold}${I18nService.t('reposListLabel')}{/bold} `,
      tags: true,
      border: { type: 'line' },
      style: {
        border: { fg: 'cyan' },
        selected: { bg: 'blue', fg: 'white', bold: true },
        focus: { border: { fg: 'yellow' } }
      },
      keys: true,
      vi: true,
      mouse: true,
      scrollable: true,
      scrollbar: { ch: '█', style: { fg: 'cyan' } }
    });
  }

  updateI18nLabels() {
    this.prList.setLabel(` {bold}${I18nService.t('prListLabel')}{/bold} `);
    this.issueList.setLabel(` {bold}${I18nService.t('issuesListLabel')}{/bold} `);
    this.repoList.setLabel(` {bold}${I18nService.t('reposListLabel')}{/bold} `);
    this.screen.render();
  }

  async refresh() {
    this.updateI18nLabels();
    const auth = await this.ghService.getAuthStatus();
    if (!auth.isLoggedIn) {
      this.prList.setItems(['{yellow-fg}GitHub CLI not authenticated. Press [L] to login.{/yellow-fg}']);
      this.issueList.setItems(['{yellow-fg}Press [L] to authenticate with GitHub CLI.{/yellow-fg}']);
      this.repoList.setItems(['{yellow-fg}Press [L] to authenticate with GitHub CLI.{/yellow-fg}']);
      this.screen.render();
      return;
    }

    try {
      const prs = await this.ghService.getPullRequests();
      const prItems = prs.map(pr => `{green-fg}#${pr.number}{/green-fg} ${pr.title} {gray-fg}(${pr.headRefName}){/gray-fg}`);
      this.prList.setItems(prItems.length ? prItems : ['{gray-fg}No open pull requests{/gray-fg}']);
    } catch {
      this.prList.setItems(['{gray-fg}Failed to fetch PRs{/gray-fg}']);
    }

    try {
      const issues = await this.ghService.getIssues();
      const issueItems = issues.map(i => `{yellow-fg}#${i.number}{/yellow-fg} ${i.title}`);
      this.issueList.setItems(issueItems.length ? issueItems : ['{gray-fg}No open issues{/gray-fg}']);
    } catch {
      this.issueList.setItems(['{gray-fg}Failed to fetch issues{/gray-fg}']);
    }

    try {
      const repos = await this.ghService.getUserRepos();
      const repoItems = repos.map(r => `{cyan-fg}${r.nameWithOwner}{/cyan-fg} {gray-fg}(${r.isPrivate ? 'Private' : 'Public'}){/gray-fg}`);
      this.repoList.setItems(repoItems.length ? repoItems : ['{gray-fg}No repositories found{/gray-fg}']);
    } catch {
      this.repoList.setItems(['{gray-fg}Failed to fetch repositories{/gray-fg}']);
    }

    this.screen.render();
  }

  show() {
    this.container.show();
    this.prList.focus();
    this.refresh();
  }

  hide() {
    this.container.hide();
  }
}
