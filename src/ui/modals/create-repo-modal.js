import blessed from 'blessed';
import path from 'path';

export class CreateRepoModal {
  constructor(screen, ghService, gitService, onCreatedCallback) {
    this.screen = screen;
    this.ghService = ghService;
    this.gitService = gitService;
    this.onCreated = onCreatedCallback;

    this.box = blessed.box({
      parent: screen,
      top: 'center',
      left: 'center',
      width: 66,
      height: 18,
      label: ' {bold}{cyan-fg}🚀 Publish Repository to GitHub{/cyan-fg}{/bold} ',
      tags: true,
      hidden: true,
      border: { type: 'line' },
      style: {
        border: { fg: 'cyan' },
        bg: 'black'
      },
      keys: true
    });

    this.form = blessed.form({
      parent: this.box,
      top: 1,
      left: 1,
      width: '100%-4',
      height: '100%-3',
      keys: true
    });

    this.nameLabel = blessed.text({
      parent: this.form,
      top: 0,
      left: 1,
      content: '{bold}Repository Name:{/bold}',
      tags: true
    });

    this.nameInput = blessed.textbox({
      parent: this.form,
      top: 1,
      left: 1,
      width: '100%-2',
      height: 1,
      style: {
        bg: 'blue',
        fg: 'white',
        focus: { bg: 'yellow', fg: 'black' }
      },
      keys: true,
      mouse: true
    });

    this.visLabel = blessed.text({
      parent: this.form,
      top: 3,
      left: 1,
      content: '{bold}Visibility:{/bold}',
      tags: true
    });

    this.publicRadio = blessed.radiobutton({
      parent: this.form,
      top: 4,
      left: 2,
      name: 'visibility',
      content: ' Public (Everyone can see this repository)',
      checked: true,
      style: {
        focus: { fg: 'green', bold: true }
      },
      keys: true,
      mouse: true
    });

    this.privateRadio = blessed.radiobutton({
      parent: this.form,
      top: 5,
      left: 2,
      name: 'visibility',
      content: ' Private (Only you and invited collaborators)',
      checked: false,
      style: {
        focus: { fg: 'magenta', bold: true }
      },
      keys: true,
      mouse: true
    });

    this.createBtn = blessed.button({
      parent: this.form,
      top: 8,
      left: 2,
      width: 26,
      height: 1,
      content: ' [Enter] Create & Push ',
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

    this.cancelBtn = blessed.button({
      parent: this.form,
      top: 8,
      left: 32,
      width: 16,
      height: 1,
      content: ' [Esc] Cancel ',
      align: 'center',
      style: {
        bg: 'gray',
        fg: 'white',
        bold: true,
        focus: { bg: 'red', fg: 'white' }
      },
      mouse: true,
      keys: true
    });

    this.setupEvents();
  }

  setupEvents() {
    this.nameInput.on('focus', () => {
      if (!this.nameInput._reading) {
        this.nameInput.readInput();
      }
    });

    this.nameInput.key(['tab'], () => this.publicRadio.focus());
    this.publicRadio.key(['tab'], () => this.privateRadio.focus());
    this.privateRadio.key(['tab'], () => this.createBtn.focus());
    this.createBtn.key(['tab'], () => this.cancelBtn.focus());
    this.cancelBtn.key(['tab'], () => this.nameInput.focus());

    this.nameInput.key(['S-tab'], () => this.cancelBtn.focus());
    this.publicRadio.key(['S-tab'], () => this.nameInput.focus());
    this.privateRadio.key(['S-tab'], () => this.publicRadio.focus());
    this.createBtn.key(['S-tab'], () => this.privateRadio.focus());
    this.cancelBtn.key(['S-tab'], () => this.createBtn.focus());

    const submitForm = () => this.executeCreation();

    this.createBtn.on('press', submitForm);
    this.createBtn.on('click', submitForm);
    this.nameInput.key(['enter'], submitForm);

    this.cancelBtn.on('press', () => this.hide());
    this.cancelBtn.on('click', () => this.hide());
    this.box.key(['escape', 'q'], () => this.hide());
  }

  async prompt() {
    let defaultName = path.basename(this.gitService.repoPath);
    try {
      defaultName = await this.gitService.getRepoName();
    } catch {}

    this.nameInput.setValue(defaultName);
    this.publicRadio.check();
    this.privateRadio.uncheck();

    this.screen.append(this.box);
    this.box.setFront();
    this.box.show();
    this.nameInput.focus();

    if (this.screen.program) this.screen.program.clear();
    if (typeof this.screen.alloc === 'function') this.screen.alloc();
    this.screen.render();
  }

  async executeCreation() {
    const repoName = this.nameInput.getValue().trim();
    if (!repoName) {
      this.screen.emit('notify', 'Repository name is required!');
      this.nameInput.focus();
      return;
    }

    const isPrivate = this.privateRadio.checked;
    this.hide();

    if (this.onCreated) {
      await this.onCreated(repoName, isPrivate);
    }
  }

  hide() {
    this.box.hide();
    if (this.screen.program) this.screen.program.clear();
    if (typeof this.screen.alloc === 'function') this.screen.alloc();
    this.screen.render();
  }
}
