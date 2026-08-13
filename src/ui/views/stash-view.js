import blessed from 'blessed';

export class StashView {
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

    // Left Pane: Stash list
    this.stashList = blessed.list({
      parent: this.container,
      top: 0,
      left: 0,
      width: '45%',
      height: '100%',
      label: ' {bold}Stash Drawer{/bold} ',
      tags: true,
      border: { type: 'line' },
      style: {
        border: { fg: 'magenta' },
        selected: { bg: 'blue', fg: 'white', bold: true },
        focus: { border: { fg: 'magenta' } }
      },
      keys: true,
      vi: true,
      mouse: true,
      scrollable: true,
      scrollbar: { ch: '█', style: { fg: 'magenta' } }
    });

    // Right Pane: Details & Controls
    this.detailBox = blessed.box({
      parent: this.container,
      top: 0,
      left: '45%',
      width: '55%',
      height: '100%',
      label: ' {bold}Stash Operations{/bold} ',
      tags: true,
      border: { type: 'line' },
      style: {
        border: { fg: 'blue' }
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

    this.createStashBtn = blessed.button({
      parent: this.detailBox,
      top: 7,
      left: 2,
      width: 22,
      height: 1,
      content: ' [s] Create Stash ',
      style: {
        bg: 'magenta',
        fg: 'white',
        focus: { bg: 'yellow', fg: 'black' }
      }
    });

    this.applyBtn = blessed.button({
      parent: this.detailBox,
      top: 9,
      left: 2,
      width: 22,
      height: 1,
      content: ' [a] Apply Stash ',
      style: {
        bg: 'green',
        fg: 'black',
        focus: { bg: 'yellow', fg: 'black' }
      }
    });

    this.popBtn = blessed.button({
      parent: this.detailBox,
      top: 11,
      left: 2,
      width: 22,
      height: 1,
      content: ' [p] Pop Stash ',
      style: {
        bg: 'cyan',
        fg: 'black',
        focus: { bg: 'yellow', fg: 'black' }
      }
    });

    this.dropBtn = blessed.button({
      parent: this.detailBox,
      top: 13,
      left: 2,
      width: 22,
      height: 1,
      content: ' [x] Drop Stash ',
      style: {
        bg: 'red',
        fg: 'white',
        focus: { bg: 'yellow', fg: 'black' }
      }
    });

    this.stashesData = [];

    this.setupEvents();
  }

  setupEvents() {
    this.stashList.on('select item', (item, index) => {
      this.onStashSelected(index);
    });

    this.stashList.key(['s'], () => {
      this.screen.emit('open-stash-modal');
    });

    this.stashList.key(['a'], () => {
      this.applySelected();
    });

    this.stashList.key(['p'], () => {
      this.popSelected();
    });

    this.stashList.key(['x'], () => {
      this.dropSelected();
    });

    this.createStashBtn.on('press', () => {
      this.screen.emit('open-stash-modal');
    });

    this.applyBtn.on('press', () => this.applySelected());
    this.popBtn.on('press', () => this.popSelected());
    this.dropBtn.on('press', () => this.dropSelected());
  }

  async refresh() {
    try {
      this.stashesData = await this.gitService.getStashes();

      if (this.stashesData.length === 0) {
        this.stashList.setItems(['{gray-fg}No stashes saved{/gray-fg}']);
        this.infoText.setContent('{gray-fg}No stashes available. Press "s" to stash current changes.{/gray-fg}');
        return;
      }

      const listItems = this.stashesData.map(s => {
        return `{magenta-fg}${s.name}{/magenta-fg} ${s.message}`;
      });

      this.stashList.setItems(listItems);
      this.stashList.select(0);
      this.onStashSelected(0);
    } catch (err) {
      this.stashList.setItems([`{red-fg}Error: ${err.message}{/red-fg}`]);
    }
  }

  onStashSelected(index) {
    if (!this.stashesData || !this.stashesData[index]) return;
    const stash = this.stashesData[index];

    const content = [
      `{bold}Selected Stash:{/bold} {magenta-fg}${stash.name}{/magenta-fg}`,
      `{bold}Commit Hash:{/bold}    ${stash.hash}`,
      `{bold}Description:{/bold}    ${stash.message}`,
      `{bold}Date:{/bold}           ${stash.date}`,
      '',
      '{yellow-fg}{bold}Actions:{/bold}{/yellow-fg}',
      ' • {green-fg}Apply{/green-fg} (a): Restore changes without removing stash.',
      ' • {cyan-fg}Pop{/cyan-fg} (p): Restore changes and remove stash.',
      ' • {red-fg}Drop{/red-fg} (x): Permanently delete stash entry.'
    ].join('\n');

    this.infoText.setContent(content);
    this.screen.render();
  }

  async applySelected() {
    const idx = this.stashList.selected;
    if (!this.stashesData || !this.stashesData[idx]) return;
    try {
      await this.gitService.applyStash(idx);
      this.screen.emit('notify', `Applied ${this.stashesData[idx].name}`);
      if (this.onStatusChanged) this.onStatusChanged();
    } catch (err) {
      this.screen.emit('notify', `Apply failed: ${err.message}`);
    }
  }

  async popSelected() {
    const idx = this.stashList.selected;
    if (!this.stashesData || !this.stashesData[idx]) return;
    try {
      await this.gitService.popStash(idx);
      this.screen.emit('notify', `Popped ${this.stashesData[idx].name}`);
      await this.refresh();
      if (this.onStatusChanged) this.onStatusChanged();
    } catch (err) {
      this.screen.emit('notify', `Pop failed: ${err.message}`);
    }
  }

  async dropSelected() {
    const idx = this.stashList.selected;
    if (!this.stashesData || !this.stashesData[idx]) return;
    try {
      await this.gitService.dropStash(idx);
      this.screen.emit('notify', `Dropped ${this.stashesData[idx].name}`);
      await this.refresh();
    } catch (err) {
      this.screen.emit('notify', `Drop failed: ${err.message}`);
    }
  }

  show() {
    this.container.show();
    this.stashList.focus();
    this.refresh();
  }

  hide() {
    this.container.hide();
  }
}
