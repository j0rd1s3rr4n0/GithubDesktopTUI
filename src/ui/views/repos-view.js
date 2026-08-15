import blessed from 'blessed';
import path from 'path';
import { RepoStore, copyPathToClipboard } from '../../git/repo-store.js';
import { RepoScanner } from '../../git/repo-scanner.js';
import { I18nService } from '../../git/i18n-service.js';
import { RepoMeta } from '../../git/repo-meta.js';

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
      wordWrap: false,
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
      wordWrap: false,
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
      tags: true,
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
    this.metaMap = {};
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

    this.repoList.key(['y'], () => {
      const idx = this.repoList.selected;
      if (this.combinedRepos && this.combinedRepos[idx]) {
        const p = this.combinedRepos[idx].path;
        copyPathToClipboard(p);
        this.app.notify(`✓ Copied repository path to clipboard: ${p}`);
      }
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

  handleCtrlC() {
    const idx = this.repoList.selected;
    if (this.combinedRepos && this.combinedRepos[idx]) {
      const p = this.combinedRepos[idx].path;
      copyPathToClipboard(p);
      this.app.notify(`✓ Copied repository path to clipboard: ${p}`);
      return true;
    }
    return false;
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

  getListTextWidth() {
    const w = this.repoList.width;
    if (typeof w === 'number' && w > 0) return Math.max(10, w - 2);
    return Math.max(10, Math.floor(this.screen.width / 2) - 2);
  }

  getInfoTextWidth() {
    const w = this.infoText.width;
    if (typeof w === 'number' && w > 0) return Math.max(10, w - 2);
    return Math.max(10, Math.floor(this.screen.width / 2) - 4);
  }

  getInfoTextHeight() {
    const h = this.infoText.height;
    if (typeof h === 'number' && h > 0) return h;
    return Math.max(8, this.screen.height - 14);
  }

  fitText(s, max) {
    s = String(s || '');
    if (s.length <= max) return s;
    if (max <= 1) return '…';
    return s.slice(0, max - 1) + '…';
  }

  fitPath(s, max) {
    s = String(s || '');
    if (s.length <= max) return s;
    if (max <= 1) return '…';
    return '…' + s.slice(s.length - (max - 1));
  }

  padListRow(s, width) {
    s = String(s || '');
    const plain = s.replace(/\{\/?[a-z0-9]*(?:-[a-z0-9]+)*\}/gi, '');
    const len = plain.length;
    if (len >= width) return s;
    return s + '{/}' + ' '.repeat(width - len);
  }

  forkBadge(meta) {
    if (!meta) return '';
    if (meta.isFork === true) return '{magenta-fg}⑂{/magenta-fg} ';
    if (meta.isFork === false) return '{cyan-fg}◎{/cyan-fg} ';
    return '';
  }

  publishBadge(meta) {
    if (!meta) return '';
    switch (meta.remoteType) {
      case 'github': return '{blue-fg}[GH]{/blue-fg} ';
      case 'gitlab': return '{magenta-fg}[GL]{/magenta-fg} ';
      case 'custom': return '{green-fg}[SRV]{/green-fg} ';
      default: return '{red-fg}[—]{/red-fg} ';
    }
  }

  remoteName(remoteType) {
    if (remoteType === 'github') return I18nService.t('remoteGitHub');
    if (remoteType === 'gitlab') return I18nService.t('remoteGitLab');
    if (remoteType === 'custom') return I18nService.t('remoteCustom');
    return I18nService.t('notPublished');
  }

  onItemSelected(index) {
    if (!this.combinedRepos || !this.combinedRepos[index]) return;
    const item = this.combinedRepos[index];
    const meta = this.metaMap[path.resolve(item.path)];
    const tw = this.getInfoTextWidth();

    const typeBadge = item.isCloned ? `{magenta-fg}${I18nService.t('clonedRepoBadge')}{/magenta-fg}` : `{cyan-fg}${I18nService.t('localRepoBadge')}{/cyan-fg}`;
    const nameLabel = I18nService.t('repoNameLabel');
    const typeLabel = I18nService.t('typeLabel');
    const pathLabel = I18nService.t('localPathLabel');
    const urlLabel = I18nService.t('remoteUrlLabel');
    const remoteLabel = I18nService.t('repoRemoteLabel');
    const forkLabel = I18nService.t('forkStatusLabel');
    const pubLabel = I18nService.t('publishedStatusLabel');

    const name = this.fitText(item.name, Math.max(6, tw - nameLabel.length));
    const pathStr = this.fitPath(item.path, Math.max(6, tw - pathLabel.length));
    const remoteUrl = (meta && meta.remoteUrl) || item.url;
    const url = remoteUrl ? this.fitPath(remoteUrl, Math.max(6, tw - urlLabel.length)) : '';

    let remoteLine = '';
    let forkLine = '';
    let pubLine = '';
    if (meta) {
      remoteLine = `{bold}${remoteLabel}{/bold}      ${this.remoteName(meta.remoteType)}`;
      if (meta.remoteType) {
        pubLine = `{bold}${pubLabel}{/bold}     {green-fg}${this.remoteName(meta.remoteType)}{/green-fg}`;
      } else {
        pubLine = `{bold}${pubLabel}{/bold}     {red-fg}${I18nService.t('notPublished')}{/red-fg}`;
      }
      if (meta.isFork === true) {
        forkLine = `{bold}${forkLabel}{/bold}      {magenta-fg}${I18nService.t('forkYesValue')}${meta.parent || '?'}{/magenta-fg}`;
      } else if (meta.isFork === false) {
        forkLine = `{bold}${forkLabel}{/bold}      {cyan-fg}${I18nService.t('sourceValue')}{/cyan-fg}`;
      }
    }

    const metaLines = [
      `{bold}${nameLabel}{/bold} ${name}`,
      `{bold}${typeLabel}{/bold}            ${typeBadge}`,
      `{bold}${pathLabel}{/bold}      ${pathStr}`,
      url ? `{bold}${urlLabel}{/bold}      ${url}` : '',
      remoteLine,
      forkLine,
      pubLine
    ].filter(Boolean);

    const actionsLines = [
      '{yellow-fg}{bold}Actions:{/bold}{/yellow-fg}',
      ' • Press {cyan-fg}y / Ctrl+C{/cyan-fg} to copy this path to system clipboard.',
      ' • Press {cyan-fg}Enter{/cyan-fg} or click Switch Repo to jump directly to this repository.',
      ' • Press {magenta-fg}s{/magenta-fg} or click Scan System to auto-discover all Git repos from /.',
      ` • ${I18nService.t('refreshMetaHint')}`
    ];

    // Anchor the Actions block to the bottom of the info panel, well below the
    // Switch/Scan buttons, instead of leaving it right under the metadata.
    const total = metaLines.length + 1 + actionsLines.length;
    const pad = Math.max(0, this.getInfoTextHeight() - total);
    const content = [
      ...metaLines,
      ...Array(pad + 1).fill(''),
      ...actionsLines
    ].join('\n');

    this.infoText.setContent(content);
    this.screen.render();
  }

  renderList() {
    const listW = this.getListTextWidth();
    const keepSelected = this.repoList.selected >= 0 ? this.repoList.selected : 0;

    this.repoList.setItems(this.combinedRepos.map(item => {
      const badge = item.isCloned ? '{magenta-fg}🌐{/magenta-fg} ' : '{cyan-fg}📁{/cyan-fg} ';
      const meta = this.metaMap[path.resolve(item.path)];
      const forkB = this.forkBadge(meta);
      const pubB = this.publishBadge(meta);
      const nameLen = Math.min(item.name.length, Math.max(5, Math.floor(listW * 0.4)));
      const prefixLen = 2 + forkB.length + pubB.length;
      const pathBudget = Math.max(4, listW - (prefixLen + nameLen + 3));
      const namePart = this.fitText(item.name, nameLen);
      const pathPart = this.fitPath(item.path, pathBudget);
      const raw = `${badge}${forkB}${pubB}{bold}${namePart}{/bold} {gray-fg}(${pathPart}){/gray-fg}`;
      return this.padListRow(raw, listW);
    }));
    this.repoList.select(Math.min(keepSelected, this.combinedRepos.length - 1));
    this.onItemSelected(this.repoList.selected);
  }

  async refresh(forceMeta = false) {
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
      this.pathInput.setValue('');
      this.screen.render();
      return;
    }

    // Fast pass: local remote detection + cached fork info.
    const fast = await Promise.all(combined.map(r =>
      RepoMeta.getRepoMeta(r.path, { force: forceMeta, skipFork: true }).catch(() => ({
        remoteUrl: null, remoteType: null, isFork: null, parent: null, needsForkFetch: false
      }))
    ));
    const metaMap = {};
    combined.forEach((r, i) => { metaMap[path.resolve(r.path)] = fast[i]; });
    this.metaMap = metaMap;
    this.renderList();

    // Background pass: fetch fork status for repos with a GitHub/GitLab remote.
    const stale = [];
    combined.forEach((r, i) => {
      if (fast[i].needsForkFetch) stale.push({ repo: r, meta: fast[i] });
    });
    if (stale.length) {
      Promise.all(stale.map(async ({ repo, meta }) => RepoMeta.fetchForkFor(repo.path, meta)))
        .then(updated => {
          stale.forEach((entry, i) => {
            this.metaMap[path.resolve(entry.repo.path)] = updated[i];
          });
          this.renderList();
          this.screen.render();
        })
        .catch(() => {});
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
