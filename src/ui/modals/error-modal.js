import blessed from 'blessed';
import fs from 'fs';
import path from 'path';
import os from 'os';

export class ErrorModal {
  constructor(screen) {
    this.screen = screen;

    this.box = blessed.box({
      parent: screen,
      top: 'center',
      left: 'center',
      width: 78,
      height: 20,
      label: ' {bold}{red-fg}Error Details & Output{/red-fg}{/bold} ',
      tags: true,
      hidden: true,
      border: { type: 'line' },
      style: {
        border: { fg: 'red' },
        bg: 'black'
      },
      keys: true,
      mouse: true
    });

    this.errorText = blessed.box({
      parent: this.box,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%-3',
      tags: true,
      scrollable: true,
      alwaysScroll: true,
      scrollbar: { ch: '█', style: { fg: 'red' } },
      keys: true,
      vi: true,
      mouse: true,
      content: ''
    });

    this.helpBar = blessed.text({
      parent: this.box,
      bottom: 0,
      left: 1,
      width: '100%-2',
      tags: true,
      content: '{yellow-fg}Logged to ~/.gitu_error.log{/yellow-fg}  |  {cyan-fg}[↑/↓/j/k]{/cyan-fg} Scroll  |  {cyan-fg}[Esc/q]{/cyan-fg} Close'
    });

    this.box.key(['escape', 'q'], () => this.hide());
    this.errorText.key(['escape', 'q'], () => this.hide());
  }

  showError(title, errDetail) {
    this.screen.append(this.box);
    this.box.setFront();
    this.box.show();

    const fullMsg = typeof errDetail === 'string' ? errDetail : (errDetail.stack || errDetail.message || String(errDetail));

    // Log error to ~/.gitu_error.log
    try {
      const logLine = `\n[${new Date().toISOString()}] ${title}:\n${fullMsg}\n----------------------------------------\n`;
      fs.appendFileSync(path.join(os.homedir(), '.gitu_error.log'), logLine);
    } catch {}

    const formattedContent = `{bold}{red-fg}${title}{/red-fg}{/bold}\n\n${this.escapeTags(fullMsg)}`;
    this.errorText.setContent(formattedContent);
    if (typeof this.errorText.setScroll === 'function') {
      this.errorText.setScroll(0);
    }
    this.errorText.focus();
    this.screen.render();
  }

  escapeTags(text) {
    return text.replace(/[{}]/g, '');
  }

  hide() {
    this.box.hide();
    this.screen.render();
  }
}
