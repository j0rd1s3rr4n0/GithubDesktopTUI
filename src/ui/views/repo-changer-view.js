import blessed from 'blessed';
import path from 'path';
import fs from 'fs';
import { RepoStore } from '../../git/repo-store.js';

export class RepoChangerView {
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

    // Left Pane: Recent Local Repos List
    this.repoList = blessed.list({
      parent: this.container,
      top: 0,
      left: 0,
      width: '50%',
      height: '100%-4',
      label: ' {bold}Recent Local Repositories (Select & Enter){/bold} ',
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

    // Right Pane: Info & Quick Switch Box
    this.detailBox = blessed.box({
      parent: this.container,
      top: 0,
      left: '50%',
      width: '50%',
      height: '100%-4',
      label: ' {bold}Repository Info & Switcher{/bold} ',
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
      content: 'Select a repository from the list or type a path below to switch.'
    });

    // Bottom Path Input Form
    this.pathForm = blessed.form({
      parent: this.container,
      bottom: 0,
      left: 0,
      width: '100%',
      height: 4,
      label: ' {bold}Open Any Local Path{/bold} ',
      border: { type: 'line' },
      style: {
        border: { fg: 'green' }
      }
    });

    this.pathInput = blessed.textbox({
      parent: this.pathForm,
      top: 0,
      left: 1,
      width: '100%-18',
      height: 1,
      style: {
        bg: 'black',
        fg: 'white',
        focus: { bg: 'blue', fg: 'white' }
      },
      inputOnFocus: true
    });

    this.switchBtn = blessed.button({
      parent: this.pathForm,
      top: 0,
      right: 1,
      width: 14,
      height: 1,
      content: ' Switch Repo ',
      align: 'center',
      style: {
        bg: 'green',
        fg: 'black',
        bold: true,
        focus: { bg: 'yellow', fg: 'black' }
      }
    });

    this.recentPaths = [];

    this.setupEvents();
  }

  setupEvents() {
    this.repoList.on('select item', (item, index) => {
      if (this.recentPaths[index]) {
        this.infoText.setContent(`{bold}Selected Path:{/bold}\n${this.recentPaths[index]}\n\nPress {cyan-fg}Enter{/cyan-fg} to switch gd to this repository.`);
        this.screen.render();
      }
    });

    this.repoList.key(['enter'], async () => {
      const idx = this.repoList.selected;
      if (this.recentPaths[idx]) {
        await this.app.switchRepositoryPath(this.recentPaths[idx]);
      }
    });

    const triggerPathSwitch = async () => {
      const target = this.pathInput.getValue().trim();
      if (target) {
        await this.app.switchRepositoryPath(target);
      }
    };

    this.pathInput.key(['enter'], triggerPathSwitch);
    this.switchBtn.on('press', triggerPathSwitch);
  }

  refresh() {
    this.recentPaths = RepoStore.getRecent();

    if (this.recentPaths.length === 0) {
      this.repoList.setItems(['{gray-fg}No recent repositories{/gray-fg}']);
      this.infoText.setContent('Type a path below to open any local repository.');
    } else {
      this.repoList.setItems(this.recentPaths.map(p => {
        const repoName = path.basename(p);
        return `{bold}{cyan-fg}${repoName}{/cyan-fg}{/bold} {gray-fg}(${p}){/gray-fg}`;
      }));
      this.repoList.select(0);
      this.infoText.setContent(`{bold}Selected Path:{/bold}\n${this.recentPaths[0]}\n\nPress {cyan-fg}Enter{/cyan-fg} to switch gd to this repository.`);
    }

    this.pathInput.setValue('');
    this.screen.render();
  }

  show() {
    this.container.show();
    this.repoList.focus();
    this.refresh();
  }

  hide() {
    this.container.hide();
  }
}
