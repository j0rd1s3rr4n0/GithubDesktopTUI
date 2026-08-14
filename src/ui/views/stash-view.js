import blessed from 'blessed';
import { I18nService } from '../../git/i18n-service.js';

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

    this.stashList = blessed.list({
      parent: this.container,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      label: ` {bold}${I18nService.t('stashListLabel')}{/bold} `,
      tags: true,
      border: { type: 'line' },
      style: {
        border: { fg: 'magenta' },
        selected: { bg: 'blue', fg: 'white', bold: true },
        focus: { border: { fg: 'yellow' } }
      },
      keys: true,
      vi: true,
      mouse: true,
      scrollable: true,
      scrollbar: { ch: '█', style: { fg: 'magenta' } }
    });

    this.stashesData = [];

    this.setupEvents();
  }

  updateI18nLabels() {
    this.stashList.setLabel(` {bold}${I18nService.t('stashListLabel')}{/bold} `);
    this.screen.render();
  }

  setupEvents() {
    this.stashList.key(['s'], () => {
      this.screen.emit('open-stash-modal');
    });

    this.stashList.key(['a'], async () => {
      const idx = this.stashList.selected;
      if (this.stashesData[idx]) {
        await this.applyStash(this.stashesData[idx].index);
      }
    });

    this.stashList.key(['p'], async () => {
      const idx = this.stashList.selected;
      if (this.stashesData[idx]) {
        await this.popStash(this.stashesData[idx].index);
      }
    });

    this.stashList.key(['x'], async () => {
      const idx = this.stashList.selected;
      if (this.stashesData[idx]) {
        await this.dropStash(this.stashesData[idx].index);
      }
    });
  }

  async applyStash(index) {
    try {
      await this.gitService.applyStash(index);
      this.screen.emit('notify', I18nService.t('stashApplied'));
      await this.refresh();
      if (this.onStatusChanged) this.onStatusChanged();
    } catch (err) {
      this.screen.emit('notify', `Apply stash failed: ${err.message}`);
    }
  }

  async popStash(index) {
    try {
      await this.gitService.popStash(index);
      this.screen.emit('notify', I18nService.t('stashPopped'));
      await this.refresh();
      if (this.onStatusChanged) this.onStatusChanged();
    } catch (err) {
      this.screen.emit('notify', `Pop stash failed: ${err.message}`);
    }
  }

  async dropStash(index) {
    try {
      await this.gitService.dropStash(index);
      this.screen.emit('notify', I18nService.t('stashDropped'));
      await this.refresh();
    } catch (err) {
      this.screen.emit('notify', `Drop stash failed: ${err.message}`);
    }
  }

  async refresh() {
    this.updateI18nLabels();
    try {
      this.stashesData = await this.gitService.getStashes();

      if (this.stashesData.length === 0) {
        this.stashList.setItems(['{gray-fg}No stashes saved{/gray-fg}']);
        return;
      }

      const items = this.stashesData.map(s => {
        return `{magenta-fg}stash@{${s.index}}{/magenta-fg} {bold}${s.branch}{/bold}: ${s.message}`;
      });

      this.stashList.setItems(items);
      this.stashList.select(0);
      this.screen.render();
    } catch (err) {
      this.stashList.setItems([`{red-fg}Error: ${err.message}{/red-fg}`]);
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
