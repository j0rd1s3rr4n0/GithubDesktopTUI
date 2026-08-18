import blessed from 'blessed';
import { DiffViewer } from '../components/diff-viewer.js';
import { I18nService } from '../../git/i18n-service.js';
import { copyPathToClipboard } from '../../git/repo-store.js';

export class ChangesView {
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

    // Left Column: File list + Commit box
    this.leftCol = blessed.box({
      parent: this.container,
      top: 0,
      left: 0,
      width: '35%',
      height: '100%'
    });

    // File List Widget
    this.fileList = blessed.list({
      parent: this.leftCol,
      top: 0,
      left: 0,
      width: '100%',
      height: '60%',
      label: ` {bold}${I18nService.t('changesLabel')}{/bold} `,
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

    // Commit Form Box
    this.commitBox = blessed.box({
      parent: this.leftCol,
      top: '60%',
      left: 0,
      width: '100%',
      height: '40%',
      label: ` {bold}${I18nService.t('commitPanelLabel')}{/bold} `,
      tags: true,
      border: { type: 'line' },
      style: {
        border: { fg: 'yellow' },
        focus: { border: { fg: 'yellow' } }
      }
    });

    this.summaryText = blessed.text({
      parent: this.commitBox,
      top: 0,
      left: 1,
      content: `{bold}${I18nService.t('summaryLabel')}{/bold}`,
      tags: true
    });

    this.summaryInput = blessed.textbox({
      parent: this.commitBox,
      top: 1,
      left: 1,
      width: '100%-4',
      height: 3,
      border: { type: 'line' },
      style: {
        border: { fg: 'gray' },
        focus: { border: { fg: 'green' }, bg: 'black' }
      },
      keys: true,
      mouse: true
    });

    this.descText = blessed.text({
      parent: this.commitBox,
      top: 4,
      left: 1,
      content: `{gray-fg}${I18nService.t('descriptionLabel')}{/gray-fg}`,
      tags: true
    });

    this.descInput = blessed.textbox({
      parent: this.commitBox,
      top: 5,
      left: 1,
      width: '100%-4',
      height: 3,
      border: { type: 'line' },
      style: {
        border: { fg: 'gray' },
        focus: { border: { fg: 'green' }, bg: 'black' }
      },
      keys: true,
      mouse: true
    });

    this.commitBtn = blessed.button({
      parent: this.commitBox,
      top: 8,
      left: 1,
      width: '100%-4',
      height: 1,
      content: I18nService.t('commitBtn'),
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

    // Right Column: Diff Viewer
    this.diffViewer = new DiffViewer({
      top: 0,
      left: '35%',
      width: '65%',
      height: '100%'
    });
    this.container.append(this.diffViewer.box);

    this.filesData = [];
    this.summaryDraft = '';
    this.descDraft = '';
    this.currentRawDiff = '';
    this.markedPaths = new Set();

    this.setupEvents();
  }

  updateI18nLabels() {
    this.fileList.setLabel(` {bold}${I18nService.t('changesLabel')}{/bold} `);
    this.commitBox.setLabel(` {bold}${I18nService.t('commitPanelLabel')}{/bold} `);
    this.summaryText.setContent(`{bold}${I18nService.t('summaryLabel')}{/bold}`);
    this.descText.setContent(`{gray-fg}${I18nService.t('descriptionLabel')}{/gray-fg}`);
    this.commitBtn.setContent(I18nService.t('commitBtn'));
    this.diffViewer.box.setLabel(` {bold}${I18nService.t('diffLabel')}{/bold} `);
    this.screen.render();
  }

  isInputFocused() {
    return Boolean((this.summaryInput && this.summaryInput.focused) || (this.descInput && this.descInput.focused));
  }

  isMarkdownFile(filePath) {
    if (!filePath) return false;
    const lower = filePath.toLowerCase();
    return lower.endsWith('.md') || lower.endsWith('.markdown') || lower.includes('readme');
  }

  setupEvents() {
    this.summaryInput.on('focus', () => {
      if (!this.summaryInput._reading) {
        this.summaryInput.readInput();
      }
    });

    this.descInput.on('focus', () => {
      if (!this.descInput._reading) {
        this.descInput.readInput();
      }
    });

    this.summaryInput.on('keypress', () => {
      this.summaryDraft = this.summaryInput.getValue();
    });

    this.descInput.on('keypress', () => {
      this.descDraft = this.descInput.getValue();
    });

    this.summaryInput.on('cancel', () => {
      this.summaryInput.setValue(this.summaryDraft || this.summaryInput.getValue());
      this.fileList.focus();
      this.screen.render();
    });

    this.descInput.on('cancel', () => {
      this.descInput.setValue(this.descDraft || this.descInput.getValue());
      this.fileList.focus();
      this.screen.render();
    });

    this.summaryInput.key(['tab'], () => {
      this.summaryDraft = this.summaryInput.getValue();
      this.descInput.focus();
    });

    this.summaryInput.key(['S-tab'], () => {
      this.summaryDraft = this.summaryInput.getValue();
      this.fileList.focus();
    });

    this.descInput.key(['tab'], () => {
      this.descDraft = this.descInput.getValue();
      this.commitBtn.focus();
    });

    this.descInput.key(['S-tab'], () => {
      this.descDraft = this.descInput.getValue();
      this.summaryInput.focus();
    });

    this.commitBtn.key(['tab'], () => {
      this.fileList.focus();
    });

    this.commitBtn.key(['S-tab'], () => {
      this.descInput.focus();
    });

    this.fileList.on('select item', (item, index) => {
      this.onFileSelected(index);
    });

    this.fileList.key(['y'], () => {
      const idx = this.fileList.selected;
      if (this.filesData && this.filesData[idx]) {
        const filePath = this.filesData[idx].path;
        copyPathToClipboard(filePath);
        this.screen.emit('notify', `✓ Copied file path to clipboard: ${filePath}`);
      }
    });

    this.fileList.key(['S-r', 'r'], () => {
      const idx = this.fileList.selected;
      if (this.filesData && this.filesData[idx]) {
        const file = this.filesData[idx];
        if (this.isMarkdownFile(file.path)) {
          this.screen.emit('open-markdown-diff', this.currentRawDiff, file.path);
        } else {
          this.screen.emit('notify', `File "${file.path}" is not a Markdown file (.md / .MD).`);
        }
      }
    });

    this.fileList.key(['space'], () => {
      const idx = this.fileList.selected;
      this.toggleStageFile(idx);
    });

    this.fileList.key(['a'], () => {
      this.stageAll();
    });

    this.fileList.key(['u'], () => {
      this.unstageAll();
    });

    this.fileList.key(['c'], () => {
      this.summaryInput.focus();
    });

    let lastCommitRun = 0;
    const commitShortcut = () => {
      const now = Date.now();
      if (now - lastCommitRun < 400) return;
      lastCommitRun = now;
      this.executeCommit();
    };

    this.summaryInput.key(['C-e', 'C-enter'], commitShortcut);
    this.descInput.key(['C-e', 'C-enter'], commitShortcut);

    // Ctrl+Enter arrives in the terminal as plain Enter (indistinguishable byte \r).
    // Bind Enter globally but only commit when an input field actually has focus.
    const commitOnEnter = () => {
      if (this.summaryInput.focused || this.descInput.focused) {
        commitShortcut();
      }
    };
    this.summaryInput.key(['enter'], commitOnEnter);
    this.descInput.key(['enter'], commitOnEnter);

    this.fileList.key(['x', 'm'], () => {
      this.toggleMarkSelected();
    });

    this.fileList.key(['S-u', 'D'], () => {
      this.requestUndoMarked();
    });

    this.commitBtn.on('press', () => {
      this.executeCommit();
    });

    this.commitBtn.on('click', () => {
      this.executeCommit();
    });
  }

  handleCtrlC() {
    const idx = this.fileList.selected;
    if (this.filesData && this.filesData[idx]) {
      const filePath = this.filesData[idx].path;
      copyPathToClipboard(filePath);
      this.screen.emit('notify', `✓ Copied file path to clipboard: ${filePath}`);
      return true;
    }
    return false;
  }

  async refresh() {
    this.updateI18nLabels();
    try {
      const status = await this.gitService.getStatus();
      this.filesData = status.files;

      if (this.filesData.length === 0) {
        this.fileList.setItems([`{gray-fg}${I18nService.t('noLocalChanges')}{/gray-fg}`]);
        this.diffViewer.setContent(I18nService.t('noChangesInWorkDir'));
        return;
      }

      const listItems = this.filesData.map(file => {
        const checkbox = file.staged ? '{green-fg}[x]{/green-fg}' : '{gray-fg}[ ]{/gray-fg}';
        const marked = this.markedPaths.has(file.path) ? '{red-fg}✗{/red-fg} ' : '  ';

        let badge = '{yellow-fg}M{/yellow-fg}';
        if (file.status === 'A') badge = '{green-fg}A{/green-fg}';
        else if (file.status === 'D') badge = '{red-fg}D{/red-fg}';
        else if (file.status === '?') badge = '{magenta-fg}?{/magenta-fg}';

        const mdBadge = this.isMarkdownFile(file.path) ? ' {magenta-fg}[R]{/magenta-fg}' : '';
        return `${checkbox} ${marked}${badge} ${file.path}${mdBadge}`;
      });

      // Prune marks pointing to files that no longer exist in the status.
      const validPaths = new Set(this.filesData.map(f => f.path));
      for (const p of [...this.markedPaths]) {
        if (!validPaths.has(p)) this.markedPaths.delete(p);
      }

      const currentIdx = Math.min(this.fileList.selected || 0, listItems.length - 1);
      this.fileList.setItems(listItems);
      this.fileList.select(currentIdx);
      this.onFileSelected(currentIdx);
    } catch (err) {
      this.fileList.setItems([`{red-fg}Error: ${err.message}{/red-fg}`]);
    }
  }

  async onFileSelected(index) {
    if (!this.filesData || !this.filesData[index]) return;
    const file = this.filesData[index];
    const diff = await this.gitService.getFileDiff(file.path, file.staged);
    this.currentRawDiff = diff;
    this.diffViewer.setContent(diff);

    if (this.isMarkdownFile(file.path)) {
      this.diffViewer.box.setLabel(` {bold}${I18nService.t('diffLabel')} {magenta-fg}[R] Read Interpreted MD{/magenta-fg}{/bold} `);
    } else {
      this.diffViewer.box.setLabel(` {bold}${I18nService.t('diffLabel')}{/bold} `);
    }
    this.screen.render();
  }

  async toggleStageFile(index) {
    if (!this.filesData || !this.filesData[index]) return;
    const file = this.filesData[index];
    if (file.staged) {
      await this.gitService.unstageFile(file.path);
    } else {
      await this.gitService.stageFile(file.path);
    }
    await this.refresh();
    if (this.onStatusChanged) this.onStatusChanged();
  }

  async stageAll() {
    await this.gitService.stageAll();
    await this.refresh();
    if (this.onStatusChanged) this.onStatusChanged();
  }

  async unstageAll() {
    await this.gitService.unstageAll();
    await this.refresh();
    if (this.onStatusChanged) this.onStatusChanged();
  }

  toggleMarkSelected() {
    const idx = this.fileList.selected;
    if (!this.filesData || !this.filesData[idx]) return;
    const file = this.filesData[idx];
    if (this.markedPaths.has(file.path)) {
      this.markedPaths.delete(file.path);
      this.screen.emit('notify', `Unmarked: ${file.path}`);
    } else {
      this.markedPaths.add(file.path);
      this.screen.emit('notify', `Marked for undo: ${file.path} (${this.markedPaths.size} marked)`);
    }
    this.refresh();
  }

  getMarkedFiles() {
    if (!this.markedPaths.size) return [];
    const statuses = this.filesData;
    return statuses.filter(f => this.markedPaths.has(f.path)).map(f => ({
      path: f.path,
      isUntracked: f.status === '?'
    }));
  }

  requestUndoMarked() {
    const marked = this.getMarkedFiles();
    if (!marked.length) {
      this.screen.emit('notify', 'No files marked for undo. Press [x] on a file to mark it first.');
      return;
    }
    const names = marked.slice(0, 5).map(f => f.path).join('\n');
    const more = marked.length > 5 ? `\n...and ${marked.length - 5} more` : '';
    const question =
      `{bold}{red-fg}Revert all changes in the following file(s)?{/red-fg}{/bold}\n\n` +
      `{yellow-fg}${names}${more}{/yellow-fg}\n\n` +
      `This discards unstaged AND staged modifications (they will be lost).`;
    this.screen.emit('confirm-undo-marked', question, marked);
  }

  async doUndoMarked(marked) {
    let success = 0;
    let failed = 0;
    for (const f of marked) {
      try {
        await this.gitService.undoChanges(f.path, f.isUntracked);
        success++;
      } catch {
        failed++;
      }
    }
    this.markedPaths.clear();
    await this.refresh();
    if (this.onStatusChanged) this.onStatusChanged();
    if (failed === 0) {
      this.screen.emit('notify', `✓ Reverted changes in ${success} file(s).`);
    } else {
      this.screen.emit('notify', `Reverted ${success} file(s), ${failed} failed.`);
    }
  }

  async executeCommit() {
    const summary = this.summaryInput.getValue().trim() || this.summaryDraft.trim();
    const description = this.descInput.getValue().trim() || this.descDraft.trim();

    if (!summary) {
      this.screen.emit('notify', I18nService.t('summaryRequired'));
      this.summaryInput.focus();
      return;
    }

    try {
      await this.gitService.commit(summary, description);
      this.summaryInput.setValue('');
      this.descInput.setValue('');
      this.summaryDraft = '';
      this.descDraft = '';
      this.fileList.focus();
      await this.refresh();
      if (this.onStatusChanged) this.onStatusChanged();
      this.screen.emit('notify', `${I18nService.t('committedMsg')}"${summary}"`);
    } catch (err) {
      this.screen.emit('notify', `Commit failed: ${err.message}`);
    }
  }

  show() {
    this.container.show();
    this.fileList.focus();
    this.refresh();
  }

  hide() {
    this.container.hide();
  }
}
