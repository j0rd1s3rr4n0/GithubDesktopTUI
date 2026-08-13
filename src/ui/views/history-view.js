import blessed from 'blessed';
import { DiffViewer } from '../components/diff-viewer.js';

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
      label: ' {bold}Commit History{/bold} ',
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
      label: ' {bold}Commit Patch Diff{/bold} '
    });
    this.rightCol.append(this.patchViewer.box);

    this.commitsData = [];

    this.setupEvents();
  }

  setupEvents() {
    this.commitList.on('select item', (item, index) => {
      this.onCommitSelected(index);
    });
  }

  async refresh() {
    try {
      this.commitsData = await this.gitService.getCommitHistory(60);

      if (this.commitsData.length === 0) {
        this.commitList.setItems(['{gray-fg}No commit history{/gray-fg}']);
        this.metaBox.setContent('No commits found.');
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
    this.patchViewer.setContent(details.patch);
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
