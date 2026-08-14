import blessed from 'blessed';

export class BranchModal {
  constructor(screen, onSubmitCallback) {
    this.screen = screen;
    this.onSubmit = onSubmitCallback;

    this.form = blessed.form({
      parent: screen,
      top: 'center',
      left: 'center',
      width: 50,
      height: 12,
      label: ' {bold}Create New Branch{/bold} ',
      tags: true,
      hidden: true,
      border: { type: 'line' },
      style: {
        border: { fg: 'green' },
        bg: 'black'
      },
      keys: true
    });

    blessed.text({
      parent: this.form,
      top: 1,
      left: 2,
      content: 'Branch Name:'
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
        focus: { border: { fg: 'yellow' }, bg: 'blue' }
      },
      inputOnFocus: true
    });

    this.checkoutCheckbox = blessed.checkbox({
      parent: this.form,
      top: 5,
      left: 2,
      text: ' Checkout after creation',
      checked: true
    });

    this.submitBtn = blessed.button({
      parent: this.form,
      top: 7,
      left: 10,
      width: 12,
      height: 1,
      content: ' Create ',
      style: {
        bg: 'green',
        fg: 'black',
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

    this.input.key(['escape'], () => {
      this.hide();
    });

    this.submitBtn.on('press', () => this.submit());
    this.cancelBtn.on('press', () => this.hide());
    
    this.form.key(['escape'], () => this.hide());
  }

  submit() {
    const branchName = this.input.getValue().trim();
    const checkout = this.checkoutCheckbox.checked;
    if (branchName) {
      this.hide();
      if (this.onSubmit) this.onSubmit(branchName, checkout);
    }
  }

  show() {
    this.screen.append(this.form);
    this.form.setFront();
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
