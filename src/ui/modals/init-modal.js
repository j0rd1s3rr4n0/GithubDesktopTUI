import blessed from 'blessed';
import { RepoBrowserModal } from './repo-browser-modal.js';
import { CloneDestinationModal } from './clone-destination-modal.js';

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
      width: 70,
      height: 15,
      label: ' {bold}{yellow-fg}Not a Git Repository{/yellow-fg}{/bold} ',
      tags: true,
      hidden: true,
      border: { type: 'line' },
      style: {
        border: { fg: 'yellow' },
        bg: 'black'
      },
      keys: true,
      mouse: true
    });

    this.text = blessed.text({
      parent: this.box,
      top: 1,
      left: 2,
      width: 64,
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
      mouse: true,
      keys: true,
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
      mouse: true,
      keys: true,
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
      width: 19,
      height: 1,
      content: ' [c] Manual URL ',
      align: 'center',
      mouse: true,
      keys: true,
      style: {
        bg: 'cyan',
        fg: 'black',
        bold: true,
        focus: { bg: 'yellow', fg: 'black' }
      }
    });

    this.closeModalBtn = blessed.button({
      parent: this.box,
      top: 7,
      left: 12,
      width: 20,
      height: 1,
      content: ' [Esc/q] Close ',
      align: 'center',
      mouse: true,
      keys: true,
      style: {
        bg: 'gray',
        fg: 'white',
        bold: true,
        focus: { bg: 'yellow', fg: 'black' }
      }
    });

    this.quitAppBtn = blessed.button({
      parent: this.box,
      top: 7,
      left: 36,
      width: 20,
      height: 1,
      content: ' [Shift+Q] Quit App ',
      align: 'center',
      mouse: true,
      keys: true,
      style: {
        bg: 'red',
        fg: 'white',
        bold: true,
        focus: { bg: 'yellow', fg: 'black' }
      }
    });

    blessed.text({
      parent: this.box,
      top: 9,
      left: 2,
      width: 64,
      tags: true,
      content: '{cyan-fg}[L]{/cyan-fg} GitHub Auth / Login'
    });

    // Sub-form for Manual Clone input
    this.cloneInput = blessed.textbox({
      parent: this.box,
      top: 10,
      left: 2,
      width: 64,
      height: 3,
      label: ' GitHub Repo (e.g. owner/repo or URL): ',
      hidden: true,
      border: { type: 'line' },
      style: {
        border: { fg: 'cyan' },
        focus: { border: { fg: 'yellow' }, bg: 'blue' }
      },
      inputOnFocus: true,
      keys: false,
      mouse: true
    });

    // Destination Selector Modal
    this.cloneDestModal = new CloneDestinationModal(screen, async (repoTarget, destinationParentDir) => {
      await this.executeClone(repoTarget, destinationParentDir);
    });

    // Repo Browser Modal
    this.repoBrowserModal = new RepoBrowserModal(screen, ghService, (repoTarget) => {
      this.cloneDestModal.prompt(repoTarget, this.gitService.repoPath);
    });

    this.setupEvents();
  }

  setupEvents() {
    this.doInit = async () => {
      if (!this.box.visible) return;
      await this.gitService.initRepo();
      this.hide();
      if (this.onDone) this.onDone('initialized');
    };

    this.openBrowser = () => {
      if (!this.box.visible) return;
      this.repoBrowserModal.show();
    };

    this.showCloneInput = () => {
      if (!this.box.visible) return;
      this.cloneInput.show();
      this.cloneInput.setValue('');
      this.cloneInput.focus();
      this.screen.render();
    };

    this.triggerGhAuth = () => {
      if (!this.box.visible) return;
      this.screen.emit('trigger-gh-auth');
    };

    this.initBtn.on('press', () => this.doInit());
    this.initBtn.on('click', () => this.doInit());

    this.browseBtn.on('press', () => this.openBrowser());
    this.browseBtn.on('click', () => this.openBrowser());

    this.cloneBtn.on('press', () => this.showCloneInput());
    this.cloneBtn.on('click', () => this.showCloneInput());

    this.closeModalBtn.on('press', () => this.hide());
    this.closeModalBtn.on('click', () => this.hide());

    this.quitAppBtn.on('press', () => process.exit(0));
    this.quitAppBtn.on('click', () => process.exit(0));

    this.cloneInput.key(['enter'], () => {
      const repoTarget = this.cloneInput.getValue().trim();
      if (!repoTarget) return;
      this.cloneInput.hide();
      this.cloneDestModal.prompt(repoTarget, this.gitService.repoPath);
    });

    this.cloneInput.key(['escape'], () => {
      this.cloneInput.hide();
      this.screen.render();
    });
  }

  async executeClone(repoTarget, destinationParentDir) {
    this.text.setContent(`{cyan-fg}Cloning ${repoTarget} into ${destinationParentDir}... Please wait.{/cyan-fg}`);
    this.screen.render();

    const res = await this.ghService.cloneRepo(repoTarget, destinationParentDir);
    if (res.success) {
      this.hide();
      if (this.onDone) this.onDone('cloned', res.clonedPath);
    } else {
      this.screen.emit('show-error', 'Clone Repository Failed', res.error);
    }
  }

  bindScreenKeys() {
    if (this.keysBound) return;
    this.keysBound = true;

    this.keyHandler = (ch, key) => {
      if (!this.box.visible || (this.cloneInput && this.cloneInput.focused)) return;

      const k = key.name || ch;
      if (k === 'i') this.doInit();
      else if (k === 'b') this.openBrowser();
      else if (k === 'c') this.showCloneInput();
      else if (k === 'l' || k === 'L') this.triggerGhAuth();
      else if (k === 'q' || k === 'escape') this.hide();
      else if (key.full === 'S-q' || key.full === 'Q') process.exit(0);
    };

    this.screen.on('keypress', this.keyHandler);
  }

  unbindScreenKeys() {
    if (this.keyHandler) {
      this.screen.removeListener('keypress', this.keyHandler);
      this.keysBound = false;
    }
  }

  show() {
    this.screen.append(this.box);
    this.box.setFront();
    this.box.show();
    this.bindScreenKeys();
    this.initBtn.focus();
    this.screen.render();
  }

  hide() {
    this.unbindScreenKeys();
    this.box.hide();
    this.screen.render();
  }
}
