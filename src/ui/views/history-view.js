import blessed from 'blessed';
import { DiffViewer } from '../components/diff-viewer.js';
import { I18nService } from '../../git/i18n-service.js';
import { copyPathToClipboard } from '../../git/repo-store.js';

export class HistoryView {
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

    // Left Column: Commit List
    this.commitList = blessed.list({
      parent: this.container,
      top: 0,
      left: 0,
      width: '40%',
      height: '100%',
      label: ` {bold}${I18nService.t('commitLogLabel')}{/bold} `,
      tags: true,
      border: { type: 'line' },
      style: {
        border: { fg: 'yellow' },
        selected: { bg: 'blue', fg: 'white', bold: true },
        focus: { border: { fg: 'green' } }
      },
      keys: true,
      vi: true,
      mouse: true,
      scrollable: true,
      scrollbar: { ch: '█', style: { fg: 'yellow' } }
    });

    // Right Column: Commit Details + Patch Diff
    this.rightCol = blessed.box({
      parent: this.container,
      top: 0,
      left: '40%',
      width: '60%',
      height: '100%'
    });

    this.metaBox = blessed.box({
      parent: this.rightCol,
      top: 0,
      left: 0,
      width: '100%',
      height: 7,
      label: ' {bold}Commit Metadata{/bold} ',
      tags: true,
      border: { type: 'line' },
      style: {
        border: { fg: 'blue' }
      }
    });

    this.patchViewer = new DiffViewer({
      top: 7,
      left: 0,
      width: '100%',
      height: '100%-7',
      label: ` {bold}${I18nService.t('commitPatchLabel')}{/bold} `
    });
    this.rightCol.append(this.patchViewer.box);

    this.commitsData = [];
    this.currentPatch = '';
    this.currentMdFile = null;

    this.setupEvents();
  }

  updateI18nLabels() {
    this.commitList.setLabel(` {bold}${I18nService.t('commitLogLabel')}{/bold} `);
    if (this.currentMdFile) {
      this.patchViewer.box.setLabel(` {bold}${I18nService.t('commitPatchLabel')} {magenta-fg}[R] Read Interpreted MD (${this.currentMdFile}){/magenta-fg}{/bold} `);
    } else {
      this.patchViewer.box.setLabel(` {bold}${I18nService.t('commitPatchLabel')}{/bold} `);
    }
    this.screen.render();
  }

  detectMarkdownFileInPatch(patchText) {
    if (!patchText) return null;
    const matches = patchText.match(/(?:diff --git a\/[^\s]*?([^\s\/]+\.(?:md|MD|markdown)|README[^\s]*))/i);
    if (matches && matches[1]) {
      return matches[1];
    }
    const lines = patchText.split('\n');
    for (const line of lines) {
      if (line.includes('.md') || line.includes('.MD') || line.toLowerCase().includes('readme')) {
        const parts = line.split(/[\s\/]/);
        for (const p of parts) {
          const lower = p.toLowerCase();
          if (lower.endsWith('.md') || lower.endsWith('.markdown') || lower.includes('readme')) {
            return p;
          }
        }
      }
    }
    return null;
  }

  setupEvents() {
    this.commitList.on('select item', (item, index) => {
      this.onCommitSelected(index);
    });

    this.commitList.key(['y', 'C-c'], () => {
      const idx = this.commitList.selected;
      if (this.commitsData && this.commitsData[idx]) {
        const commit = this.commitsData[idx];
        copyPathToClipboard(commit.hash);
        this.screen.emit('notify', `✓ Copied commit hash to clipboard: ${commit.hash}`);
      }
    });

    this.commitList.key(['S-r', 'r'], () => {
      if (this.currentMdFile && this.currentPatch) {
        this.screen.emit('open-markdown-diff', this.currentPatch, this.currentMdFile);
      } else {
        this.screen.emit('notify', 'No Markdown file (.md / .MD / README) modified in this commit diff.');
      }
    });
  }

  async refresh() {
    this.updateI18nLabels();
    try {
      this.commitsData = await this.gitService.getCommitHistory(60);

      if (this.commitsData.length === 0) {
        this.commitList.setItems([`{gray-fg}${I18nService.t('noCommitsFound')}{/gray-fg}`]);
        this.metaBox.setContent(I18nService.t('noCommitsFound'));
        this.patchViewer.setContent('');
        return;
      }

      const listItems = this.commitsData.map(commit => {
        return `{yellow-fg}${commit.shortHash}{/yellow-fg} ${commit.summary} {gray-fg}(${commit.author}){/gray-fg}`;
      });

      this.commitList.setItems(listItems);
      this.commitList.select(0);
      this.onCommitSelected(0);
    } catch (err) {
      this.commitList.setItems([`{red-fg}Error: ${err.message}{/red-fg}`]);
    }
  }

  async onCommitSelected(index) {
    if (!this.commitsData || !this.commitsData[index]) return;
    const commit = this.commitsData[index];

    const metaContent = [
      `{bold}Commit:{/bold} {yellow-fg}${commit.hash}{/yellow-fg}`,
      `{bold}Author:{/bold} ${commit.author} <${commit.email}>`,
      `{bold}Date:{/bold}   ${commit.date}`,
      `{bold}Message:{/bold} ${commit.summary}`
    ].join('\n');

    this.metaBox.setContent(metaContent);

    const details = await this.gitService.getCommitDetails(commit.hash);
    this.currentPatch = details.patch;
    this.currentMdFile = this.detectMarkdownFileInPatch(details.patch);

    this.patchViewer.setContent(details.patch);

    if (this.currentMdFile) {
      this.patchViewer.box.setLabel(` {bold}${I18nService.t('commitPatchLabel')} {magenta-fg}[R] Read Interpreted MD (${this.currentMdFile}){/magenta-fg}{/bold} `);
    } else {
      this.patchViewer.box.setLabel(` {bold}${I18nService.t('commitPatchLabel')}{/bold} `);
    }

    this.screen.render();
  }

  show() {
    this.container.show();
    this.commitList.focus();
    this.refresh();
  }

  hide() {
    this.container.hide();
  }
}
