import blessed from 'blessed';

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

    // Left Pane: Branch List
    this.branchList = blessed.list({
      parent: this.container,
      top: 0,
      left: 0,
      width: '45%',
      height: '100%',
      label: ' {bold}Branches (Local & Remote){/bold} ',
      tags: true,
      border: { type: 'line' },
      style: {
        border: { fg: 'green' },
        selected: { bg: 'blue', fg: 'white', bold: true },
        focus: { border: { fg: 'green' } }
      },
      keys: true,
      vi: true,
      mouse: true,
      scrollable: true,
      scrollbar: { ch: '█', style: { fg: 'green' } }
    });

    // Right Pane: Action Controls & Details
    this.detailBox = blessed.box({
      parent: this.container,
      top: 0,
      left: '45%',
      width: '55%',
      height: '100%',
      label: ' {bold}Branch Actions & Sync{/bold} ',
      tags: true,
      border: { type: 'line' },
      style: {
        border: { fg: 'yellow' }
      }
    });

    this.infoText = blessed.text({
      parent: this.detailBox,
      top: 1,
      left: 2,
      width: '100%-4',
      tags: true,
      content: ''
    });

    // Action buttons
    this.checkoutBtn = blessed.button({
      parent: this.detailBox,
      top: 8,
      left: 2,
      width: 24,
      height: 1,
      content: ' [Enter] Checkout Branch ',
      style: {
        bg: 'green',
        fg: 'black',
        focus: { bg: 'yellow', fg: 'black' }
      }
    });

    this.newBranchBtn = blessed.button({
      parent: this.detailBox,
      top: 10,
      left: 2,
      width: 24,
      height: 1,
      content: ' [b/n] Create New Branch ',
      style: {
        bg: 'blue',
        fg: 'white',
        focus: { bg: 'yellow', fg: 'black' }
      }
    });

    this.pushBtn = blessed.button({
      parent: this.detailBox,
      top: 12,
      left: 2,
      width: 24,
      height: 1,
      content: ' [P] Push to Remote ',
      style: {
        bg: 'magenta',
        fg: 'white',
        focus: { bg: 'yellow', fg: 'black' }
      }
    });

    this.pullBtn = blessed.button({
      parent: this.detailBox,
      top: 14,
      left: 2,
      width: 24,
      height: 1,
      content: ' [p] Pull from Remote ',
      style: {
        bg: 'cyan',
        fg: 'black',
        focus: { bg: 'yellow', fg: 'black' }
      }
    });

    this.branchesData = [];
    this.currentBranch = '';

    this.setupEvents();
  }

  setupEvents() {
    this.branchList.on('select item', (item, index) => {
      this.onBranchSelected(index);
    });

    this.branchList.key(['enter'], () => {
      const idx = this.branchList.selected;
      this.checkoutSelectedBranch(idx);
    });

    this.checkoutBtn.on('press', () => {
      const idx = this.branchList.selected;
      this.checkoutSelectedBranch(idx);
    });

    this.newBranchBtn.on('press', () => {
      this.screen.emit('open-branch-modal');
    });

    this.pushBtn.on('press', () => {
      this.screen.emit('execute-push');
    });

    this.pullBtn.on('press', () => {
      this.screen.emit('execute-pull');
    });
  }

  async refresh() {
    try {
      const res = await this.gitService.getBranches();
      this.currentBranch = res.current;
      this.branchesData = res.branches;

      const listItems = this.branchesData.map(b => {
        let prefix = '  ';
        let nameStr = b.displayName;

        if (b.isCurrent) {
          prefix = '{green-fg}* {/green-fg}';
          nameStr = `{bold}{green-fg}${b.displayName}{/green-fg}{/bold}`;
        } else if (b.isRemote) {
          nameStr = `{gray-fg}${b.displayName}{/gray-fg}`;
        }

        return `${prefix}${nameStr}`;
      });

      this.branchList.setItems(listItems);
      this.branchList.select(0);
      this.onBranchSelected(0);
    } catch (err) {
      this.branchList.setItems([`{red-fg}Error: ${err.message}{/red-fg}`]);
    }
  }

  onBranchSelected(index) {
    if (!this.branchesData || !this.branchesData[index]) return;
    const branch = this.branchesData[index];

    const content = [
      `{bold}Selected Branch:{/bold} ${branch.displayName}`,
      `{bold}Type:{/bold} ${branch.isRemote ? 'Remote Branch' : 'Local Branch'}`,
      `{bold}Is Active:{/bold} ${branch.isCurrent ? '{green-fg}YES (Currently checked out){/green-fg}' : 'No'}`,
      '',
      '{yellow-fg}{bold}Available Actions:{/bold}{/yellow-fg}',
      ' • Press {cyan-fg}Enter{/cyan-fg} or click Checkout to switch branch.',
      ' • Press {cyan-fg}b{/cyan-fg} to create a new branch based on current.',
      ' • Press {cyan-fg}P{/cyan-fg} to push commits to remote repository.',
      ' • Press {cyan-fg}p{/cyan-fg} to pull updates from remote repository.'
    ].join('\n');

    this.infoText.setContent(content);
    this.screen.render();
  }

  async checkoutSelectedBranch(index) {
    if (!this.branchesData || !this.branchesData[index]) return;
    const branch = this.branchesData[index];

    if (branch.isCurrent) {
      this.screen.emit('notify', `Already on branch "${branch.displayName}"`);
      return;
    }

    try {
      await this.gitService.checkoutBranch(branch.displayName);
      this.screen.emit('notify', `Checked out branch "${branch.displayName}"`);
      await this.refresh();
      if (this.onStatusChanged) this.onStatusChanged();
    } catch (err) {
      this.screen.emit('notify', `Checkout failed: ${err.message}`);
    }
  }

  show() {
    this.container.show();
    this.branchList.focus();
    this.refresh();
  }

  hide() {
    this.container.hide();
  }
}
