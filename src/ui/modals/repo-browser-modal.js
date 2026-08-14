import blessed from 'blessed';

export class RepoBrowserModal {
  constructor(screen, ghService, onRepoSelectedCallback) {
    this.screen = screen;
    this.ghService = ghService;
    this.onRepoSelected = onRepoSelectedCallback;

    this.box = blessed.box({
      parent: screen,
      top: 'center',
      left: 'center',
      width: 76,
      height: 22,
      label: ' {bold}Clone Remote Repository - Browse Accounts & Orgs{/bold} ',
      tags: true,
      hidden: true,
      border: { type: 'line' },
      style: {
        border: { fg: 'cyan' },
        bg: 'black'
      },
      keys: true
    });

    // Left List: Account & Organizations selector
    this.ownerList = blessed.list({
      parent: this.box,
      top: 0,
      left: 0,
      width: '32%',
      height: '100%-2',
      label: ' {bold}Owner / Scope{/bold} ',
      tags: true,
      border: { type: 'line' },
      style: {
        border: { fg: 'yellow' },
        selected: { bg: 'blue', fg: 'white', bold: true },
        focus: { border: { fg: 'green' } }
      },
      keys: true,
      vi: true,
      mouse: true
    });

    // Right List: Repositories list for selected Owner
    this.repoList = blessed.list({
      parent: this.box,
      top: 0,
      left: '32%',
      width: '68%',
      height: '100%-2',
      label: ' {bold}Repositories (Select & Enter to Clone){/bold} ',
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

    // Bottom Help hint bar
    this.helpText = blessed.text({
      parent: this.box,
      bottom: 0,
      left: 1,
      width: '100%-2',
      tags: true,
      content: '{cyan-fg}[Tab]{/cyan-fg} Switch list  {cyan-fg}[Enter]{/cyan-fg} Select / Clone  {cyan-fg}[Esc/q]{/cyan-fg} Cancel'
    });

    this.ownersData = [];
    this.reposData = [];

    this.setupEvents();
  }

  setupEvents() {
    this.ownerList.on('select item', (item, index) => {
      this.onOwnerSelected(index);
    });

    this.repoList.on('select item', (item, index) => {
      // Show description or details if needed
    });

    this.repoList.key(['enter'], () => {
      const idx = this.repoList.selected;
      if (this.reposData[idx]) {
        const repo = this.reposData[idx];
        this.hide();
        if (this.onRepoSelected) this.onRepoSelected(repo.nameWithOwner);
      }
    });

    this.box.key(['escape', 'q'], () => this.hide());
  }

  async show() {
    this.box.show();
    this.ownerList.focus();
    this.screen.render();

    const auth = await this.ghService.getAuthStatus();
    if (!auth.isLoggedIn) {
      this.ownerList.setItems(['{yellow-fg}Not Logged In{/yellow-fg}']);
      this.repoList.setItems(['{yellow-fg}Run "gh auth login" to browse GitHub repos.{/yellow-fg}']);
      this.screen.render();
      return;
    }

    // Build Owner list: Personal account + Orgs
    const orgs = await this.ghService.getUserOrgs();
    this.ownersData = [
      { type: 'user', name: `@${auth.user} (Personal)`, value: null },
      ...orgs.map(o => ({ type: 'org', name: `🏢 ${o.login}`, value: o.login }))
    ];

    this.ownerList.setItems(this.ownersData.map(o => o.name));
    this.ownerList.select(0);
    await this.onOwnerSelected(0);
  }

  async onOwnerSelected(index) {
    if (!this.ownersData || !this.ownersData[index]) return;
    const owner = this.ownersData[index];

    this.repoList.setItems(['{cyan-fg}Loading repositories...{/cyan-fg}']);
    this.screen.render();

    this.reposData = await this.ghService.listReposForOwner(owner.value);

    if (this.reposData.length === 0) {
      this.repoList.setItems(['{gray-fg}No repositories found{/gray-fg}']);
    } else {
      this.repoList.setItems(this.reposData.map(r => {
        const lock = r.isPrivate ? '{red-fg}🔒{/red-fg} ' : '{green-fg}🌐{/green-fg} ';
        const desc = r.description ? `{gray-fg} - ${r.description.slice(0, 30)}{/gray-fg}` : '';
        return `${lock}{magenta-fg}${r.nameWithOwner}{/magenta-fg}${desc}`;
      }));
      this.repoList.select(0);
    }
    this.screen.render();
  }

  hide() {
    this.box.hide();
    this.screen.render();
  }
}
