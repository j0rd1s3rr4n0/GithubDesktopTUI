import blessed from 'blessed';

export class StashModal {
  constructor(screen, onSubmitCallback) {
    this.screen = screen;
    this.onSubmit = onSubmitCallback;

    this.form = blessed.form({
      parent: screen,
      top: 'center',
      left: 'center',
      width: 50,
      height: 12,
      label: ' {bold}Stash Changes{/bold} ',
      tags: true,
      hidden: true,
      border: { type: 'line' },
      style: {
        border: { fg: 'magenta' },
        bg: 'black'
      },
      keys: true
    });

    blessed.text({
      parent: this.form,
      top: 1,
      left: 2,
      content: 'Stash Message (Optional):'
    });

    this.input = blessed.textbox({
      parent: this.form,
      top: 2,
      left: 2,
      width: 44,
      height: 3,
      border: { type: 'line' },
      style: {
        border: { fg: 'gray' },
        focus: { border: { fg: 'magenta' }, bg: 'blue' }
      },
      inputOnFocus: true
    });

    this.untrackedCheckbox = blessed.checkbox({
      parent: this.form,
      top: 5,
      left: 2,
      text: ' Include untracked files',
      checked: true
    });

    this.submitBtn = blessed.button({
      parent: this.form,
      top: 7,
      left: 10,
      width: 12,
      height: 1,
      content: ' Stash ',
      style: {
        bg: 'magenta',
        fg: 'white',
        focus: { bg: 'yellow', fg: 'black' }
      }
    });

    this.cancelBtn = blessed.button({
      parent: this.form,
      top: 7,
      left: 26,
      width: 12,
      height: 1,
      content: ' Cancel ',
      style: {
        bg: 'gray',
        fg: 'white',
        focus: { bg: 'red', fg: 'white' }
      }
    });

    this.input.key(['enter'], () => {
      this.submit();
    });

    this.submitBtn.on('press', () => this.submit());
    this.cancelBtn.on('press', () => this.hide());
    this.form.key(['escape'], () => this.hide());
  }

  submit() {
    const msg = this.input.getValue().trim();
    const untracked = this.untrackedCheckbox.checked;
    this.hide();
    if (this.onSubmit) this.onSubmit(msg, untracked);
  }

  show() {
    this.input.setValue('');
    this.form.show();
    this.input.focus();
    this.screen.render();
  }

  hide() {
    this.form.hide();
    this.screen.render();
  }
}
