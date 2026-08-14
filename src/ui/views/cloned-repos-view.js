import blessed from 'blessed';
import { RepoStore } from '../../git/repo-store.js';

export class ClonedReposView {
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

    // Left Pane: Cloned Repositories List
    this.clonedList = blessed.list({
      parent: this.container,
      top: 0,
      left: 0,
      width: '50%',
      height: '100%',
      label: ' {bold}Cloned Repositories (Select & Enter to Open){/bold} ',
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

    // Right Pane: Details & Switch Action
    this.detailBox = blessed.box({
      parent: this.container,
      top: 0,
      left: '50%',
      width: '50%',
      height: '100%',
      label: ' {bold}Cloned Repository Details{/bold} ',
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

    this.openBtn = blessed.button({
      parent: this.detailBox,
      top: 10,
      left: 2,
      width: 24,
      height: 1,
      content: ' [Enter] Open Repo ',
      style: {
        bg: 'green',
        fg: 'black',
        bold: true,
        focus: { bg: 'yellow', fg: 'black' }
      }
    });

    this.clonedItems = [];

    this.setupEvents();
  }

  setupEvents() {
    this.clonedList.on('select item', (item, index) => {
      this.onItemSelected(index);
    });

    this.clonedList.key(['enter'], async () => {
      const idx = this.clonedList.selected;
      if (this.clonedItems[idx]) {
        await this.app.switchRepositoryPath(this.clonedItems[idx].path);
      }
    });

    this.openBtn.on('press', async () => {
      const idx = this.clonedList.selected;
      if (this.clonedItems[idx]) {
        await this.app.switchRepositoryPath(this.clonedItems[idx].path);
      }
    });
  }

  onItemSelected(index) {
    if (!this.clonedItems || !this.clonedItems[index]) return;
    const item = this.clonedItems[index];

    const content = [
      `{bold}Repository Name:{/bold} {magenta-fg}${item.name}{/magenta-fg}`,
      `{bold}Local Path:{/bold}      ${item.path}`,
      `{bold}Remote URL:{/bold}      ${item.url || 'GitHub Remote'}`,
      `{bold}Cloned Date:{/bold}     ${item.clonedAt ? new Date(item.clonedAt).toLocaleString() : 'Recent'}`,
      '',
      '{yellow-fg}{bold}Action:{/bold}{/yellow-fg}',
      ' • Press {cyan-fg}Enter{/cyan-fg} or click Open Repo to switch gd directly to this repository.'
    ].join('\n');

    this.infoText.setContent(content);
    this.screen.render();
  }

  refresh() {
    this.clonedItems = RepoStore.getCloned();

    if (this.clonedItems.length === 0) {
      this.clonedList.setItems(['{gray-fg}No cloned repositories recorded{/gray-fg}']);
      this.infoText.setContent('Repositories cloned via gd will automatically appear here for quick access.');
    } else {
      this.clonedList.setItems(this.clonedItems.map(item => {
        return `{bold}{magenta-fg}${item.name}{/magenta-fg}{/bold} {gray-fg}(${item.path}){/gray-fg}`;
      }));
      this.clonedList.select(0);
      this.onItemSelected(0);
    }
    this.screen.render();
  }

  show() {
    this.container.show();
    this.clonedList.focus();
    this.refresh();
  }

  hide() {
    this.container.hide();
  }
}
