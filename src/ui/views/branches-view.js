import blessed from 'blessed';
import { I18nService } from '../../git/i18n-service.js';

export class BranchesView {
  constructor(screen, gitService, options = {}) {
    this.screen = screen;
    this.gitService = gitService;

    this.container = blessed.box({
      top: options.top || 6,
      left: 0,
      width: '100%',
      height: '100%-6',
      hidden: true
    });

    // Left Column: Local Branches List
    this.localList = blessed.list({
      parent: this.container,
      top: 0,
      left: 0,
      width: '50%',
      height: '100%',
      label: ` {bold}${I18nService.t('localBranchesLabel')}{/bold} `,
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

    // Right Column: Remote Branches List
    this.remoteList = blessed.list({
      parent: this.container,
      top: 0,
      left: '50%',
      width: '50%',
      height: '100%',
      label: ` {bold}${I18nService.t('remoteBranchesLabel')}{/bold} `,
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

    this.localBranches = [];
    this.remoteBranches = [];

    this.setupEvents();
  }

  updateI18nLabels() {
    this.localList.setLabel(` {bold}${I18nService.t('localBranchesLabel')}{/bold} `);
    this.remoteList.setLabel(` {bold}${I18nService.t('remoteBranchesLabel')}{/bold} `);
    this.screen.render();
  }

  setupEvents() {
    this.localList.key(['enter'], async () => {
      const idx = this.localList.selected;
      if (this.localBranches[idx]) {
        await this.checkoutBranch(this.localBranches[idx].name);
      }
    });

    this.localList.key(['b'], () => {
      this.screen.emit('open-branch-modal');
    });

    this.localList.key(['S-p'], () => {
      this.screen.emit('execute-push');
    });

    this.localList.key(['p'], () => {
      this.screen.emit('execute-pull');
    });
  }

  async checkoutBranch(branchName) {
    try {
      await this.gitService.checkout(branchName);
      this.screen.emit('notify', `${I18nService.t('checkoutSuccess')}"${branchName}"`);
      await this.refresh();
      if (this.onStatusChanged) this.onStatusChanged();
    } catch (err) {
      this.screen.emit('notify', `Checkout failed: ${err.message}`);
    }
  }

  async refresh() {
    this.updateI18nLabels();
    try {
      const branchData = await this.gitService.getBranches();
      this.localBranches = Array.isArray(branchData.local) ? branchData.local : [];
      this.remoteBranches = Array.isArray(branchData.remote) ? branchData.remote : [];

      const localItems = this.localBranches.map(b => {
        const star = b.current ? '{green-fg}* {/green-fg}' : '  ';
        const currentTag = b.current ? ' {green-fg}(active){/green-fg}' : '';
        return `${star}{bold}${b.name}{/bold}${currentTag}`;
      });

      const remoteItems = this.remoteBranches.map(b => {
        return `  {cyan-fg}${b.displayName || b.name}{/cyan-fg}`;
      });

      this.localList.setItems(localItems.length ? localItems : ['{gray-fg}No local branches{/gray-fg}']);
      this.remoteList.setItems(remoteItems.length ? remoteItems : ['{gray-fg}No remote branches{/gray-fg}']);
      this.screen.render();
    } catch (err) {
      this.localList.setItems([`{red-fg}Error: ${err.message}{/red-fg}`]);
      this.remoteList.setItems([`{red-fg}Error: ${err.message}{/red-fg}`]);
    }
  }

  show() {
    this.container.show();
    this.localList.focus();
    this.refresh();
  }

  hide() {
    this.container.hide();
  }
}
