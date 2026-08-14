import blessed from 'blessed';
import { DiffViewer } from '../components/diff-viewer.js';

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
      label: ' {bold}Changes & Staging{/bold} ',
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
    this.commitBox = blessed.form({
      parent: this.leftCol,
      top: '60%',
      left: 0,
      width: '100%',
      height: '40%',
      label: ' {bold}Commit Panel{/bold} ',
      tags: true,
      border: { type: 'line' },
      style: {
        border: { fg: 'yellow' },
        focus: { border: { fg: 'yellow' } }
      },
      keys: true,
      mouse: true
    });

    blessed.text({
      parent: this.commitBox,
      top: 0,
      left: 1,
      content: '{bold}Summary:{/bold}',
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
      inputOnFocus: true,
      mouse: true
    });

    blessed.text({
      parent: this.commitBox,
      top: 4,
      left: 1,
      content: '{gray-fg}Description (Optional):{/gray-fg}',
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
      inputOnFocus: true,
      mouse: true
    });

    this.commitBtn = blessed.button({
      parent: this.commitBox,
      top: 8,
      left: 1,
      width: '100%-4',
      height: 1,
      content: ' Commit Changes (Ctrl+Enter) ',
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

    // Bindings
    this.setupEvents();
  }

  isInputFocused() {
    return Boolean((this.summaryInput && this.summaryInput.focused) || (this.descInput && this.descInput.focused));
  }

  setupEvents() {
    this.fileList.on('click', () => {
      this.fileList.focus();
    });

    this.summaryInput.on('click', () => {
      this.summaryInput.focus();
    });

    this.descInput.on('click', () => {
      this.descInput.focus();
    });

    this.diffViewer.box.on('click', () => {
      this.diffViewer.box.focus();
    });

    this.fileList.on('select item', (item, index) => {
      this.onFileSelected(index);
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

    this.summaryInput.key(['C-e', 'C-enter'], () => {
      this.executeCommit();
    });

    this.descInput.key(['C-e', 'C-enter'], () => {
      this.executeCommit();
    });

    this.commitBtn.on('press', () => {
      this.executeCommit();
    });

    this.commitBtn.on('click', () => {
      this.executeCommit();
    });
  }

  async refresh() {
    try {
      const status = await this.gitService.getStatus();
      this.filesData = status.files;

      if (this.filesData.length === 0) {
        this.fileList.setItems(['{gray-fg}✓ No local changes{/gray-fg}']);
        this.diffViewer.setContent('(No changes in working directory)');
        return;
      }

      const listItems = this.filesData.map(file => {
        const checkbox = file.staged ? '{green-fg}[x]{/green-fg}' : '{gray-fg}[ ]{/gray-fg}';
        
        let badge = '{yellow-fg}M{/yellow-fg}';
        if (file.status === 'A') badge = '{green-fg}A{/green-fg}';
        else if (file.status === 'D') badge = '{red-fg}D{/red-fg}';
        else if (file.status === '?') badge = '{magenta-fg}?{/magenta-fg}';

        return `${checkbox} ${badge} ${file.path}`;
      });

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
    this.diffViewer.setContent(diff);
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

  async executeCommit() {
    const summary = this.summaryInput.getValue().trim();
    const description = this.descInput.getValue().trim();

    if (!summary) {
      this.screen.emit('notify', 'Commit summary is required!');
      this.summaryInput.focus();
      return;
    }

    try {
      await this.gitService.commit(summary, description);
      this.summaryInput.setValue('');
      this.descInput.setValue('');
      this.fileList.focus();
      await this.refresh();
      if (this.onStatusChanged) this.onStatusChanged();
      this.screen.emit('notify', `Committed: "${summary}"`);
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
