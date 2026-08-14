import blessed from 'blessed';
import path from 'path';
import { RepoStore } from '../../git/repo-store.js';
import { RepoScanner } from '../../git/repo-scanner.js';
import { I18nService } from '../../git/i18n-service.js';

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
      label: ` {bold}${I18nService.t('reposListLabelSel')}{/bold} `,
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
      label: ` {bold}${I18nService.t('reposDetailLabel')}{/bold} `,
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
      top: 9,
      left: 2,
      width: 24,
      height: 1,
      content: I18nService.t('switchRepoBtn'),
      style: {
        bg: 'green',
        fg: 'black',
        bold: true,
        focus: { bg: 'yellow', fg: 'black' }
      },
      mouse: true,
      keys: true
    });

    this.scanBtn = blessed.button({
      parent: this.detailBox,
      top: 12,
      left: 2,
      width: 34,
      height: 1,
      content: ' [s] Scan System for Repos (from /) ',
      style: {
        bg: 'magenta',
        fg: 'white',
        bold: true,
        focus: { bg: 'yellow', fg: 'black' }
      },
      mouse: true,
      keys: true
    });

    // Bottom Path Input Form
    this.pathForm = blessed.box({
      parent: this.container,
      bottom: 0,
      left: 0,
      width: '100%',
      height: 4,
      label: ` {bold}${I18nService.t('openPathLabel')}{/bold} `,
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
      keys: true,
      mouse: true
    });

    this.pathSwitchBtn = blessed.button({
      parent: this.pathForm,
      top: 0,
      right: 1,
      width: 14,
      height: 1,
      content: I18nService.t('openPathBtn'),
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

  updateI18nLabels() {
    this.repoList.setLabel(` {bold}${I18nService.t('reposListLabelSel')}{/bold} `);
    this.detailBox.setLabel(` {bold}${I18nService.t('reposDetailLabel')}{/bold} `);
    this.pathForm.setLabel(` {bold}${I18nService.t('openPathLabel')}{/bold} `);
    this.switchBtn.setContent(I18nService.t('switchRepoBtn'));
    this.pathSwitchBtn.setContent(I18nService.t('openPathBtn'));
    this.screen.render();
  }

  setupEvents() {
    this.pathInput.on('focus', () => {
      if (!this.pathInput._reading) {
        this.pathInput.readInput();
      }
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

    this.repoList.key(['s'], () => {
      this.startSystemScan();
    });

    const doSwitchSelected = async () => {
      const idx = this.repoList.selected;
      if (this.combinedRepos[idx]) {
        await this.app.switchRepositoryPath(this.combinedRepos[idx].path);
      }
    };

    this.switchBtn.on('press', doSwitchSelected);
    this.switchBtn.on('click', doSwitchSelected);

    this.scanBtn.on('press', () => this.startSystemScan());
    this.scanBtn.on('click', () => this.startSystemScan());

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

  startSystemScan() {
    if (RepoScanner.isScanning) {
      this.app.notify('System scan already running in background...');
      return;
    }

    this.app.notify('🔍 Scanning system from / for Git repositories...');
    this.scanBtn.setContent(' ⌛ Scanning System... ');

    RepoScanner.scanSystem('/', (foundPath, totalFound) => {
      this.app.notify(`🔍 [Scan] Found ${totalFound} Git repos so far (${path.basename(foundPath)})`);
      this.refresh();
    }, (foundRepos) => {
      this.scanBtn.setContent(' [s] Scan System for Repos (from /) ');
      this.app.notify(`✓ System scan complete! Discovered ${foundRepos.length} repositories.`);
      this.refresh();
    });
  }

  onItemSelected(index) {
    if (!this.combinedRepos || !this.combinedRepos[index]) return;
    const item = this.combinedRepos[index];

    const typeBadge = item.isCloned ? `{magenta-fg}${I18nService.t('clonedRepoBadge')}{/magenta-fg}` : `{cyan-fg}${I18nService.t('localRepoBadge')}{/cyan-fg}`;

    const content = [
      `{bold}${I18nService.t('repoNameLabel')}{/bold} ${item.name}`,
      `{bold}${I18nService.t('typeLabel')}{/bold}            ${typeBadge}`,
      `{bold}${I18nService.t('localPathLabel')}{/bold}      ${item.path}`,
      item.url ? `{bold}${I18nService.t('remoteUrlLabel')}{/bold}      ${item.url}` : '',
      '',
      '{yellow-fg}{bold}Action:{/bold}{/yellow-fg}',
      ' • Press {cyan-fg}Enter{/cyan-fg} or click Switch Repo to jump directly to this repository.',
      ' • Press {magenta-fg}s{/magenta-fg} or click Scan System to auto-discover all Git repos from /.'
    ].filter(Boolean).join('\n');

    this.infoText.setContent(content);
    this.screen.render();
  }

  refresh() {
    this.updateI18nLabels();
    const recent = RepoStore.getRecent();
    const cloned = RepoStore.getCloned();

    const clonedPaths = new Set(cloned.map(c => c.path));
    const combined = [];

    cloned.forEach(c => {
      combined.push({
        name: c.name,
        path: c.path,
        url: c.url,
        isCloned: true
      });
    });

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
