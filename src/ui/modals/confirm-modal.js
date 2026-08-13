import blessed from 'blessed';

export class ConfirmModal {
  constructor(screen) {
    this.screen = screen;
    this.box = blessed.box({
      parent: screen,
      top: 'center',
      left: 'center',
      width: 50,
      height: 9,
      label: ' {bold}Confirmation{/bold} ',
      tags: true,
      hidden: true,
      border: { type: 'line' },
      style: {
        border: { fg: 'red' },
        bg: 'black'
      },
      keys: true
    });

    this.text = blessed.text({
      parent: this.box,
      top: 1,
      left: 2,
      width: 44,
      tags: true,
      content: ''
    });

    this.yesBtn = blessed.button({
      parent: this.box,
      top: 5,
      left: 8,
      width: 12,
      height: 1,
      content: '  Yes  ',
      style: {
        bg: 'red',
        fg: 'white',
        focus: { bg: 'yellow', fg: 'black' }
      }
    });

    this.noBtn = blessed.button({
      parent: this.box,
      top: 5,
      left: 28,
      width: 12,
      height: 1,
      content: '  No  ',
      style: {
        bg: 'gray',
        fg: 'white',
        focus: { bg: 'blue', fg: 'white' }
      }
    });

    this.yesBtn.on('press', () => {
      this.hide();
      if (this.onConfirm) this.onConfirm();
    });

    this.noBtn.on('press', () => {
      this.hide();
      if (this.onCancel) this.onCancel();
    });

    this.box.key(['escape', 'n'], () => {
      this.hide();
      if (this.onCancel) this.onCancel();
    });

    this.box.key(['y', 'enter'], () => {
      this.hide();
      if (this.onConfirm) this.onConfirm();
    });
  }

  ask(message, onConfirm, onCancel = null) {
    this.text.setContent(message);
    this.onConfirm = onConfirm;
    this.onCancel = onCancel;
    this.box.show();
    this.yesBtn.focus();
    this.screen.render();
  }

  hide() {
    this.box.hide();
    this.screen.render();
  }
}
