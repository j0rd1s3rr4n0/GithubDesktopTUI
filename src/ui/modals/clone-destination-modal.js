import blessed from 'blessed';
import path from 'path';

export class CloneDestinationModal {
  constructor(screen, onConfirmCallback) {
    this.screen = screen;
    this.onConfirm = onConfirmCallback;

    this.box = blessed.box({
      parent: screen,
      top: 'center',
      left: 'center',
      width: 72,
      height: 14,
      label: ' {bold}Clone Repository - Select Target Destination{/bold} ',
      tags: true,
      hidden: true,
      border: { type: 'line' },
      style: {
        border: { fg: 'cyan' },
        bg: 'black'
      },
      keys: true,
      mouse: true
    });

    this.infoText = blessed.text({
      parent: this.box,
      top: 1,
      left: 2,
      width: 66,
      tags: true,
      content: ''
    });

    this.pathInput = blessed.textbox({
      parent: this.box,
      top: 4,
      left: 2,
      width: 66,
      height: 3,
      label: ' Destination Parent Directory (. = current path): ',
      border: { type: 'line' },
      style: {
        border: { fg: 'gray' },
        focus: { border: { fg: 'green' }, bg: 'blue' }
      },
      inputOnFocus: true,
      mouse: true
    });

    this.fullPathText = blessed.text({
      parent: this.box,
      top: 8,
      left: 2,
      width: 66,
      tags: true,
      content: ''
    });

    this.confirmBtn = blessed.button({
      parent: this.box,
      top: 10,
      left: 12,
      width: 20,
      height: 1,
      content: ' [Enter] Clone ',
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
      parent: this.box,
      top: 10,
      left: 38,
      width: 20,
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

    this.repoTarget = '';
    this.repoName = '';

    this.setupEvents();
  }

  setupEvents() {
    this.pathInput.on('click', () => this.pathInput.focus());

    this.pathInput.on('keypress', () => {
      setTimeout(() => this.updatePreview(), 50);
    });

    const executeConfirm = () => {
      const parentDir = this.pathInput.getValue().trim() || process.cwd();
      const resolvedParent = path.resolve(parentDir);
      this.hide();
      if (this.onConfirm) {
        this.onConfirm(this.repoTarget, resolvedParent);
      }
    };

    this.pathInput.key(['enter'], executeConfirm);
    this.confirmBtn.on('press', executeConfirm);
    this.confirmBtn.on('click', executeConfirm);

    this.cancelBtn.on('press', () => this.hide());
    this.cancelBtn.on('click', () => this.hide());
    this.box.key(['escape', 'q'], () => this.hide());
  }

  updatePreview() {
    const rawInput = this.pathInput.getValue().trim() || '.';
    const resolvedParent = path.resolve(rawInput);
    const fullPath = path.join(resolvedParent, this.repoName);
    this.fullPathText.setContent(`Will clone to: {bold}{cyan-fg}${fullPath}{/cyan-fg}{/bold}`);
    this.screen.render();
  }

  prompt(repoTarget, defaultBaseDir = process.cwd()) {
    this.repoTarget = repoTarget;
    const parts = repoTarget.split('/');
    this.repoName = parts[parts.length - 1].replace(/\.git$/, '');

    this.infoText.setContent(`Cloning repository {bold}{magenta-fg}${repoTarget}{/magenta-fg}{/bold}`);
    this.pathInput.setValue(defaultBaseDir);

    this.screen.append(this.box);
    this.box.setFront();
    this.box.show();
    this.updatePreview();
    this.pathInput.focus();
    this.screen.render();
  }

  hide() {
    this.box.hide();
    this.screen.render();
  }
}
