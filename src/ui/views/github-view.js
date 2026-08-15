import blessed from 'blessed';
import { I18nService } from '../../git/i18n-service.js';

export class GithubView {
  constructor(screen, ghService, options = {}) {
    this.screen = screen;
    this.ghService = ghService;
    this.gitService = null; // Set externally by App

    this.container = blessed.box({
      top: options.top || 6,
      left: 0,
      width: '100%',
      height: '100%-6',
      hidden: true
    });

    // Publish Banner — shown when no remote origin exists
    this.publishBanner = blessed.box({
      parent: this.container,
      top: 0,
      left: 0,
      width: '100%',
      height: 5,
      tags: true,
      hidden: true,
      border: { type: 'line' },
      style: {
        border: { fg: 'yellow' },
        bg: 'black'
      }
    });

    this.publishText = blessed.text({
      parent: this.publishBanner,
      top: 0,
      left: 2,
      tags: true,
      content: '{yellow-fg}{bold}⚠  This repository is not published to GitHub yet.{/bold}{/yellow-fg}\n' +
               '   Press {green-fg}{bold}G{/bold}{/green-fg} or click the button below to create a GitHub repository (Public or Private).'
    });

    this.publishBtn = blessed.button({
      parent: this.publishBanner,
      top: 2,
      left: 4,
      width: 42,
      height: 1,
      content: ' 🚀 Publish Repository to GitHub (G) ',
      align: 'center',
      tags: true,
      style: {
        bg: 'green',
        fg: 'black',
        bold: true,
        focus: { bg: 'yellow', fg: 'black' },
        hover: { bg: 'yellow', fg: 'black' }
      },
      mouse: true,
      keys: true
    });

    this.publishBtn.on('press', () => this.screen.emit('open-create-repo-modal'));
    this.publishBtn.on('click', () => this.screen.emit('open-create-repo-modal'));

    // Top Left Panel: Pull Requests
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
      wordWrap: false,
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

    // Check if we have a remote origin and show/hide the publish banner accordingly
    let hasRemote = false;
    if (this.gitService) {
      try {
        hasRemote = await this.gitService.hasRemoteOrigin();
      } catch {}
    }

    if (!hasRemote) {
      this.publishBanner.show();
      this.publishBanner.setFront();
      // Shift the PR/Issues/Repos panels down to make room for the banner
      this.prList.position.top = 5;
      this.issueList.position.top = 5;
      this.repoList.position.top = '50%';
    } else {
      this.publishBanner.hide();
      this.prList.position.top = 0;
      this.issueList.position.top = 0;
      this.repoList.position.top = '50%';
    }

    const auth = await this.ghService.getAuthStatus();

    if (auth.remoteType === 'custom') {
      this.prList.setItems(['{yellow-fg}Custom Remote mode — GitHub/GitLab browsing disabled.{/yellow-fg}']);
      this.issueList.setItems(['{yellow-fg}Press [ , ] to open Settings and configure the remote.{/yellow-fg}']);
      this.repoList.setItems(['{yellow-fg}Set a custom remote URL in Settings ( , ).{/yellow-fg}']);
      this.screen.render();
      return;
    }

    if (!auth.isLoggedIn) {
      this.prList.setItems(['{yellow-fg}Git CLI not authenticated. Press [L] to login.{/yellow-fg}']);
      this.issueList.setItems(['{yellow-fg}Press [L] to authenticate with GitHub/GitLab CLI.{/yellow-fg}']);
      this.repoList.setItems(['{yellow-fg}Press [L] to authenticate with GitHub/GitLab CLI.{/yellow-fg}']);
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
      const listW = this.getRepoListWidth();
      const nameBudget = Math.max(6, Math.floor(listW * 0.6));
      const repoItems = repos.map(r => {
        const name = this.fitListText(r.nameWithOwner, nameBudget);
        const raw = `{cyan-fg}${name}{/cyan-fg} {gray-fg}(${r.isPrivate ? 'Private' : 'Public'}){/gray-fg}`;
        return this.padListRow(raw, listW);
      });
      this.repoList.setItems(repoItems.length ? repoItems : ['{gray-fg}No repositories found{/gray-fg}']);
    } catch {
      this.repoList.setItems(['{gray-fg}Failed to fetch repositories{/gray-fg}']);
    }

    this.screen.render();
  }

  getRepoListWidth() {
    const w = this.repoList.width;
    if (typeof w === 'number' && w > 0) return Math.max(10, w - 2);
    return Math.max(10, this.screen.width - 2);
  }

  fitListText(s, max) {
    s = String(s || '');
    if (s.length <= max) return s;
    if (max <= 1) return '…';
    return s.slice(0, max - 1) + '…';
  }

  padListRow(s, width) {
    s = String(s || '');
    const plain = s.replace(/\{\/?[a-z0-9]*(?:-[a-z0-9]+)*\}/gi, '');
    const len = plain.length;
    if (len >= width) return s;
    return s + '{/}' + ' '.repeat(width - len);
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
