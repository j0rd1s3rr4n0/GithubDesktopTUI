import blessed from 'blessed';
import { RepoBrowserModal } from './repo-browser-modal.js';

export class InitModal {
  constructor(screen, gitService, ghService, onDoneCallback) {
    this.screen = screen;
    this.gitService = gitService;
    this.ghService = ghService;
    this.onDone = onDoneCallback;

    this.box = blessed.box({
      parent: screen,
      top: 'center',
      left: 'center',
      width: 68,
      height: 14,
      label: ' {bold}{yellow-fg}Not a Git Repository{/yellow-fg}{/bold} ',
      tags: true,
      hidden: true,
      border: { type: 'line' },
      style: {
        border: { fg: 'yellow' },
        bg: 'black'
      },
      keys: true
    });

    this.text = blessed.text({
      parent: this.box,
      top: 1,
      left: 2,
      width: 62,
      tags: true,
      content: `The directory {cyan-fg}${this.gitService.repoPath}{/cyan-fg} is not a Git repository.\n\nChoose an action to proceed:`
    });

    this.initBtn = blessed.button({
      parent: this.box,
      top: 5,
      left: 3,
      width: 19,
      height: 1,
      content: ' [i] Init Git ',
      align: 'center',
      style: {
        bg: 'green',
        fg: 'black',
        bold: true,
        focus: { bg: 'yellow', fg: 'black' }
      }
    });

    this.browseBtn = blessed.button({
      parent: this.box,
      top: 5,
      left: 24,
      width: 21,
      height: 1,
      content: ' [b] Browse Repos ',
      align: 'center',
      style: {
        bg: 'magenta',
        fg: 'white',
        bold: true,
        focus: { bg: 'yellow', fg: 'black' }
      }
    });

    this.cloneBtn = blessed.button({
      parent: this.box,
      top: 5,
      left: 47,
      width: 18,
      height: 1,
      content: ' [c] Manual URL ',
      align: 'center',
      style: {
        bg: 'cyan',
        fg: 'black',
        bold: true,
        focus: { bg: 'yellow', fg: 'black' }
      }
    });

    this.quitBtn = blessed.button({
      parent: this.box,
      top: 7,
      left: 24,
      width: 21,
      height: 1,
      content: ' [q] Quit ',
      align: 'center',
      style: {
        bg: 'red',
        fg: 'white',
        bold: true,
        focus: { bg: 'yellow', fg: 'black' }
      }
    });

    // Sub-form for Manual Clone input
    this.cloneInput = blessed.textbox({
      parent: this.box,
      top: 9,
      left: 2,
      width: 62,
      height: 3,
      label: ' GitHub Repo (e.g. owner/repo or URL): ',
      hidden: true,
      border: { type: 'line' },
      style: {
        border: { fg: 'cyan' },
        focus: { border: { fg: 'yellow' }, bg: 'blue' }
      },
      inputOnFocus: true
    });

    // Repo Browser Modal
    this.repoBrowserModal = new RepoBrowserModal(screen, ghService, async (repoTarget) => {
      await this.executeClone(repoTarget);
    });

    this.setupEvents();
  }

  setupEvents() {
    const doInit = async () => {
      await this.gitService.initRepo();
      this.hide();
      if (this.onDone) this.onDone('initialized');
    };

    const openBrowser = () => {
      this.repoBrowserModal.show();
    };

    const showCloneInput = () => {
      this.cloneInput.show();
      this.cloneInput.setValue('');
      this.cloneInput.focus();
      this.screen.render();
    };

    this.initBtn.on('press', doInit);
    this.browseBtn.on('press', openBrowser);
    this.cloneBtn.on('press', showCloneInput);
    this.quitBtn.on('press', () => process.exit(0));

    this.box.key(['i'], doInit);
    this.box.key(['b'], openBrowser);
    this.box.key(['c'], showCloneInput);
    this.box.key(['q'], () => process.exit(0));

    this.cloneInput.key(['enter'], async () => {
      const repoTarget = this.cloneInput.getValue().trim();
      if (!repoTarget) return;
      await this.executeClone(repoTarget);
    });
  }

  async executeClone(repoTarget) {
    this.text.setContent(`{cyan-fg}Cloning ${repoTarget}... Please wait.{/cyan-fg}`);
    this.cloneInput.hide();
    this.screen.render();

    const res = await this.ghService.cloneRepo(repoTarget, this.gitService.repoPath);
    if (res.success) {
      this.hide();
      if (this.onDone) this.onDone('cloned');
    } else {
      this.text.setContent(`{red-fg}Clone failed: ${res.error}{/red-fg}\n\nPress [b] to browse repos, [c] for URL, or [i] to initialize.`);
      this.screen.render();
    }
  }

  show() {
    this.box.show();
    this.initBtn.focus();
    this.screen.render();
  }

  hide() {
    this.box.hide();
    this.screen.render();
  }
}
