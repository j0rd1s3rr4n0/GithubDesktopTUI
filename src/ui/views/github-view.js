import blessed from 'blessed';

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

    // Column 1: Pull Requests
    this.prBox = blessed.list({
      parent: this.container,
      top: 0,
      left: 0,
      width: '33%',
      height: '100%',
      label: ' {bold}Pull Requests (gh pr list){/bold} ',
      tags: true,
      border: { type: 'line' },
      style: {
        border: { fg: 'cyan' },
        selected: { bg: 'blue', fg: 'white', bold: true },
        focus: { border: { fg: 'green' } }
      },
      keys: true,
      vi: true,
      mouse: true,
      scrollable: true,
      scrollbar: { ch: '█', style: { fg: 'cyan' } }
    });

    // Column 2: Issues
    this.issuesBox = blessed.list({
      parent: this.container,
      top: 0,
      left: '33%',
      width: '33%',
      height: '100%',
      label: ' {bold}Issues (gh issue list){/bold} ',
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

    // Column 3: Remote Repositories
    this.reposBox = blessed.list({
      parent: this.container,
      top: 0,
      left: '66%',
      width: '34%',
      height: '100%',
      label: ' {bold}My Repositories (gh repo list){/bold} ',
      tags: true,
      border: { type: 'line' },
      style: {
        border: { fg: 'magenta' },
        selected: { bg: 'blue', fg: 'white', bold: true },
        focus: { border: { fg: 'green' } }
      },
      keys: true,
      vi: true,
      mouse: true,
      scrollable: true,
      scrollbar: { ch: '█', style: { fg: 'magenta' } }
    });

    this.prsData = [];
    this.issuesData = [];
    this.reposData = [];

    this.setupEvents();
  }

  setupEvents() {
    this.prBox.on('select item', (item, index) => {
      if (this.prsData[index]) {
        this.screen.emit('notify', `PR #${this.prsData[index].number}: ${this.prsData[index].url}`);
      }
    });

    this.issuesBox.on('select item', (item, index) => {
      if (this.issuesData[index]) {
        this.screen.emit('notify', `Issue #${this.issuesData[index].number}: ${this.issuesData[index].url}`);
      }
    });

    this.reposBox.on('select item', (item, index) => {
      if (this.reposData[index]) {
        this.screen.emit('notify', `Repo: ${this.reposData[index].nameWithOwner} - ${this.reposData[index].url}`);
      }
    });
  }

  async refresh() {
    const auth = await this.ghService.getAuthStatus();

    if (!auth.isLoggedIn) {
      const notAuthText = ['{yellow-fg}gh CLI is not logged in.{/yellow-fg}', 'Press {cyan-fg}L{/cyan-fg} to run gh auth login.'];
      this.prBox.setItems(notAuthText);
      this.issuesBox.setItems(notAuthText);
      this.reposBox.setItems(notAuthText);
      this.screen.render();
      return;
    }

    // Fetch PRs
    this.prsData = await this.ghService.listPullRequests();
    if (this.prsData.length === 0) {
      this.prBox.setItems(['{gray-fg}No open pull requests{/gray-fg}']);
    } else {
      this.prBox.setItems(this.prsData.map(pr => {
        const author = pr.author ? `@${pr.author.login}` : '';
        return `{cyan-fg}#${pr.number}{/cyan-fg} ${pr.title} {gray-fg}(${author}){/gray-fg}`;
      }));
    }

    // Fetch Issues
    this.issuesData = await this.ghService.listIssues();
    if (this.issuesData.length === 0) {
      this.issuesBox.setItems(['{gray-fg}No open issues{/gray-fg}']);
    } else {
      this.issuesBox.setItems(this.issuesData.map(issue => {
        const author = issue.author ? `@${issue.author.login}` : '';
        return `{yellow-fg}#${issue.number}{/yellow-fg} ${issue.title} {gray-fg}(${author}){/gray-fg}`;
      }));
    }

    // Fetch Repos
    this.reposData = await this.ghService.listUserRepos();
    if (this.reposData.length === 0) {
      this.reposBox.setItems(['{gray-fg}No repositories found{/gray-fg}']);
    } else {
      this.reposBox.setItems(this.reposData.map(r => {
        const lock = r.isPrivate ? '{red-fg}🔒{/red-fg} ' : '{green-fg}🌐{/green-fg} ';
        return `${lock}{magenta-fg}${r.nameWithOwner}{/magenta-fg}`;
      }));
    }

    this.screen.render();
  }

  show() {
    this.container.show();
    this.prBox.focus();
    this.refresh();
  }

  hide() {
    this.container.hide();
  }
}
