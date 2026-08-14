import blessed from 'blessed';
import path from 'path';
import fs from 'fs';
import { RepoStore } from '../../git/repo-store.js';

export class ReposView {
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

    // Left Pane: Unified Repositories List
    this.repoList = blessed.list({
      parent: this.container,
      top: 0,
      left: 0,
      width: '50%',
      height: '100%-4',
      label: ' {bold}Repositories (Select & Enter to Switch){/bold} ',
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

    // Right Pane: Repository Metadata & Quick Switch Box
    this.detailBox = blessed.box({
      parent: this.container,
      top: 0,
      left: '50%',
      width: '50%',
      height: '100%-4',
      label: ' {bold}Repository Details & Switcher{/bold} ',
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

    this.switchBtn = blessed.button({
      parent: this.detailBox,
      top: 10,
      left: 2,
      width: 24,
      height: 1,
      content: ' [Enter] Switch Repo ',
      style: {
        bg: 'green',
        fg: 'black',
        bold: true,
        focus: { bg: 'yellow', fg: 'black' }
      },
      mouse: true,
      keys: true
    });

    // Bottom Path Input Form
    this.pathForm = blessed.form({
      parent: this.container,
      bottom: 0,
      left: 0,
      width: '100%',
      height: 4,
      label: ' {bold}Open Any Folder Path{/bold} ',
      border: { type: 'line' },
      style: {
        border: { fg: 'green' }
      },
      mouse: true
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
      inputOnFocus: true,
      keys: false,
      mouse: true
    });

    this.pathSwitchBtn = blessed.button({
      parent: this.pathForm,
      top: 0,
      right: 1,
      width: 14,
      height: 1,
      content: ' Open Path ',
      align: 'center',
      style: {
        bg: 'green',
        fg: 'black',
        bold: true,
        focus: { bg: 'yellow', fg: 'black' }
      },
      mouse: true,
      keys: true
    });

    this.combinedRepos = [];

    this.setupEvents();
  }

  setupEvents() {
    this.repoList.on('click', () => {
      this.repoList.focus();
    });

    this.pathInput.on('click', () => {
      this.pathInput.focus();
    });

    this.repoList.on('select item', (item, index) => {
      this.onItemSelected(index);
    });

    this.repoList.key(['enter'], async () => {
      const idx = this.repoList.selected;
      if (this.combinedRepos[idx]) {
        await this.app.switchRepositoryPath(this.combinedRepos[idx].path);
      }
    });

    const doSwitchSelected = async () => {
      const idx = this.repoList.selected;
      if (this.combinedRepos[idx]) {
        await this.app.switchRepositoryPath(this.combinedRepos[idx].path);
      }
    };

    this.switchBtn.on('press', doSwitchSelected);
    this.switchBtn.on('click', doSwitchSelected);

    const triggerPathSwitch = async () => {
      const target = this.pathInput.getValue().trim();
      if (target) {
        await this.app.switchRepositoryPath(target);
      }
    };

    this.pathInput.key(['enter'], triggerPathSwitch);
    this.pathSwitchBtn.on('press', triggerPathSwitch);
    this.pathSwitchBtn.on('click', triggerPathSwitch);
  }

  onItemSelected(index) {
    if (!this.combinedRepos || !this.combinedRepos[index]) return;
    const item = this.combinedRepos[index];

    const typeBadge = item.isCloned ? '{magenta-fg}Cloned GitHub Repo{/magenta-fg}' : '{cyan-fg}Local Directory Repo{/cyan-fg}';

    const content = [
      `{bold}Repository Name:{/bold} ${item.name}`,
      `{bold}Type:{/bold}            ${typeBadge}`,
      `{bold}Local Path:{/bold}      ${item.path}`,
      item.url ? `{bold}Remote URL:{/bold}      ${item.url}` : '',
      '',
      '{yellow-fg}{bold}Action:{/bold}{/yellow-fg}',
      ' • Press {cyan-fg}Enter{/cyan-fg} or click Switch Repo to jump directly to this repository.'
    ].filter(Boolean).join('\n');

    this.infoText.setContent(content);
    this.screen.render();
  }

  refresh() {
    const recent = RepoStore.getRecent();
    const cloned = RepoStore.getCloned();

    const clonedPaths = new Set(cloned.map(c => c.path));
    const combined = [];

    // First add all cloned repos
    cloned.forEach(c => {
      combined.push({
        name: c.name,
        path: c.path,
        url: c.url,
        isCloned: true
      });
    });

    // Then add non-cloned local repos
    recent.forEach(p => {
      if (!clonedPaths.has(p)) {
        combined.push({
          name: path.basename(p),
          path: p,
          url: '',
          isCloned: false
        });
      }
    });

    this.combinedRepos = combined;

    if (this.combinedRepos.length === 0) {
      this.repoList.setItems(['{gray-fg}No repositories recorded{/gray-fg}']);
      this.infoText.setContent('Type a path below or clone a repo to add repositories to this manager.');
    } else {
      this.repoList.setItems(this.combinedRepos.map(item => {
        const badge = item.isCloned ? '{magenta-fg}🌐{/magenta-fg} ' : '{cyan-fg}📁{/cyan-fg} ';
        return `${badge}{bold}${item.name}{/bold} {gray-fg}(${item.path}){/gray-fg}`;
      }));
      this.repoList.select(0);
      this.onItemSelected(0);
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
