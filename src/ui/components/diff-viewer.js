import blessed from 'blessed';

export class DiffViewer {
  constructor(options = {}) {
    this.box = blessed.box({
      top: options.top || 0,
      left: options.left || 0,
      width: options.width || '100%',
      height: options.height || '100%',
      label: options.label || ' {bold}Diff Preview (↑/↓ 1 line | PgUp/PgDn 10 lines){/bold} ',
      tags: true,
      border: { type: 'line' },
      style: {
        border: { fg: 'cyan' },
        focus: { border: { fg: 'green' } }
      },
      scrollable: true,
      alwaysScroll: true,
      scrollbar: {
        ch: '█',
        style: { fg: 'blue' }
      },
      keys: true,
      vi: true,
      mouse: true
    });

    this.setupScrollEvents();
  }

  setupScrollEvents() {
    // Mouse Wheel strictly 1 line per tick
    this.box.on('wheelup', () => {
      this.box.scroll(-1);
      this.box.screen.render();
    });

    this.box.on('wheeldown', () => {
      this.box.scroll(1);
      this.box.screen.render();
    });

    // Keyboard 1 line per keypress
    this.box.key(['up', 'k'], () => {
      this.box.scroll(-1);
      this.box.screen.render();
    });

    this.box.key(['down', 'j'], () => {
      this.box.scroll(1);
      this.box.screen.render();
    });

    // PageUp / PageDown 10 lines
    this.box.key(['pageup'], () => {
      this.box.scroll(-10);
      this.box.screen.render();
    });

    this.box.key(['pagedown'], () => {
      this.box.scroll(10);
      this.box.screen.render();
    });

    // Top / Bottom shortcuts
    this.box.key(['g'], () => {
      if (typeof this.box.setScroll === 'function') {
        this.box.setScroll(0);
        this.box.screen.render();
      }
    });

    this.box.key(['S-g'], () => {
      if (typeof this.box.setScroll === 'function') {
        this.box.setScroll(this.box.getScrollHeight());
        this.box.screen.render();
      }
    });
  }

  setContent(rawDiff) {
    if (!rawDiff || rawDiff === '(No changes)') {
      this.box.setContent('{gray-fg}No changes to display.{/gray-fg}');
      return;
    }

    const lines = rawDiff.split('\n');
    const formattedLines = [];
    let oldLineNum = 0;
    let newLineNum = 0;

    for (const line of lines) {
      if (line.startsWith('diff --git') || line.startsWith('index ')) {
        formattedLines.push(`{bold}{cyan-fg}${this.escapeTags(line)}{/cyan-fg}{/bold}`);
      } else if (line.startsWith('--- ') || line.startsWith('+++ ')) {
        formattedLines.push(`{bold}{yellow-fg}${this.escapeTags(line)}{/yellow-fg}{/bold}`);
      } else if (line.startsWith('@@')) {
        // Hunk header e.g. @@ -10,5 +10,7 @@
        const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
        if (match) {
          oldLineNum = parseInt(match[1], 10);
          newLineNum = parseInt(match[2], 10);
        }
        formattedLines.push(`{bold}{magenta-fg}${this.escapeTags(line)}{/magenta-fg}{/bold}`);
      } else if (line.startsWith('+')) {
        const lineNumStr = String(newLineNum).padStart(4, ' ');
        newLineNum++;
        formattedLines.push(`{green-fg}+ ${lineNumStr} | ${this.escapeTags(line.slice(1))}{/green-fg}`);
      } else if (line.startsWith('-')) {
        const lineNumStr = String(oldLineNum).padStart(4, ' ');
        oldLineNum++;
        formattedLines.push(`{red-fg}- ${lineNumStr} | ${this.escapeTags(line.slice(1))}{/red-fg}`);
      } else {
        const oStr = oldLineNum ? String(oldLineNum).padStart(4, ' ') : '    ';
        const nStr = newLineNum ? String(newLineNum).padStart(4, ' ') : '    ';
        if (oldLineNum) oldLineNum++;
        if (newLineNum) newLineNum++;
        formattedLines.push(`{gray-fg}  ${oStr} ${nStr} |{/gray-fg} ${this.escapeTags(line)}`);
      }
    }

    this.box.setContent(formattedLines.join('\n'));
    if (typeof this.box.setScroll === 'function') {
      this.box.setScroll(0);
    }
  }

  escapeTags(text) {
    return text.replace(/[{}]/g, '');
  }

  focus() {
    this.box.focus();
  }
}
