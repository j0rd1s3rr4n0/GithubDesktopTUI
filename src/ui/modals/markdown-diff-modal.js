import blessed from 'blessed';
import { copyPathToClipboard } from '../../git/repo-store.js';

export class MarkdownDiffModal {
  constructor(screen) {
    this.screen = screen;

    this.box = blessed.box({
      parent: screen,
      top: 'center',
      left: 'center',
      width: '88%',
      height: '88%',
      label: ' {bold}{magenta-fg}📝 Interpreted Markdown Diff Viewer{/magenta-fg}{/bold} ',
      tags: true,
      hidden: true,
      border: { type: 'line' },
      style: {
        border: { fg: 'magenta' },
        bg: 'black'
      },
      keys: true,
      vi: true,
      mouse: true,
      scrollable: true,
      scrollbar: { ch: '█', style: { fg: 'magenta' } }
    });

    this.contentBox = blessed.box({
      parent: this.box,
      top: 0,
      left: 1,
      width: '100%-4',
      height: '100%-2',
      tags: true,
      scrollable: true,
      scrollbar: { ch: '█', style: { fg: 'magenta' } },
      mouse: true,
      keys: true,
      vi: true
    });

    this.helpText = blessed.text({
      parent: this.box,
      bottom: 0,
      left: 1,
      width: '100%-2',
      tags: true,
      content: '{cyan-fg}[↑/↓/j/k]{/cyan-fg} Scroll 1 line  {cyan-fg}[PgUp/PgDn]{/cyan-fg} 10 lines  {cyan-fg}[g/G]{/cyan-fg} Top/Bottom  {cyan-fg}[y]{/cyan-fg} Copy  {cyan-fg}[Esc/q]{/cyan-fg} Close'
    });

    this.currentFilePath = null;
    this.setupEvents();
  }

  setupEvents() {
    this.box.key(['escape', 'q'], () => this.hide());
    this.contentBox.key(['escape', 'q'], () => this.hide());

    const scrollUp = () => {
      this.contentBox.scroll(-1);
      this.screen.render();
    };

    const scrollDown = () => {
      this.contentBox.scroll(1);
      this.screen.render();
    };

    const scrollPgUp = () => {
      this.contentBox.scroll(-10);
      this.screen.render();
    };

    const scrollPgDn = () => {
      this.contentBox.scroll(10);
      this.screen.render();
    };

    const scrollTop = () => {
      if (typeof this.contentBox.setScroll === 'function') {
        this.contentBox.setScroll(0);
      } else {
        this.contentBox.scrollToTop();
      }
      this.screen.render();
    };

    const scrollBottom = () => {
      if (typeof this.contentBox.setScrollPerc === 'function') {
        this.contentBox.setScrollPerc(100);
      } else {
        this.contentBox.scrollToBottom();
      }
      this.screen.render();
    };

    this.box.key(['up', 'k'], scrollUp);
    this.contentBox.key(['up', 'k'], scrollUp);
    this.box.key(['down', 'j'], scrollDown);
    this.contentBox.key(['down', 'j'], scrollDown);

    this.box.key(['pageup'], scrollPgUp);
    this.contentBox.key(['pageup'], scrollPgUp);
    this.box.key(['pagedown'], scrollPgDn);
    this.contentBox.key(['pagedown'], scrollPgDn);

    this.box.key(['g'], scrollTop);
    this.contentBox.key(['g'], scrollTop);
    this.box.key(['G', 'S-g'], scrollBottom);
    this.contentBox.key(['G', 'S-g'], scrollBottom);

    const copyFilePath = () => {
      if (this.currentFilePath) {
        copyPathToClipboard(this.currentFilePath);
        this.screen.emit('notify', `✓ Copied markdown file path to clipboard: ${this.currentFilePath}`);
      }
    };

    this.box.key(['y', 'C-c'], copyFilePath);
    this.contentBox.key(['y', 'C-c'], copyFilePath);
  }

  escapeBlessed(str) {
    return str.replace(/\{/g, '{\\{').replace(/\}/g, '\\}');
  }

  formatInlineMarkdown(str) {
    let output = this.escapeBlessed(str);

    // Links: [text](url)
    output = output.replace(/\[(.*?)\]\((.*?)\)/g, '{blue-fg}{underline}$1{/underline}{/blue-fg} ($2)');

    // Bold: **text** or __text__
    output = output.replace(/(\*\*|__)(.*?)\1/g, '{bold}$2{/bold}');

    // Italic: *text* or _text_
    output = output.replace(/(\*|_)(.*?)\1/g, '$2');

    // Inline Code: `code`
    output = output.replace(/`(.*?)`/g, '[code: $1]');

    return output;
  }

  interpretMarkdownDiff(rawDiffText, filePath) {
    const lines = rawDiffText.split(/\r?\n/);
    const resultLines = [];

    resultLines.push(`{bold}{cyan-fg}📄 Interpreted Markdown Diff: ${filePath}{/cyan-fg}{/bold}`);
    resultLines.push('{gray-fg}Diff Colors: {green-fg}+ Added (Green){/green-fg}  |  {red-fg}- Deleted (Red){/red-fg}  |  {white-fg}  Unchanged (White){/white-fg}{/gray-fg}');
    resultLines.push('{gray-fg}────────────────────────────────────────────────────────────────────────────{/gray-fg}');

    let inHunk = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('diff --git') || line.startsWith('index ') || line.startsWith('--- ') || line.startsWith('+++ ')) {
        continue;
      }

      if (line.startsWith('@@')) {
        inHunk = true;
        resultLines.push('');
        resultLines.push(`{yellow-fg}{bold}${this.escapeBlessed(line)}{/bold}{/yellow-fg}`);
        continue;
      }

      if (!inHunk) continue;

      let prefix = '  ';
      let colorTag = 'white-fg';
      let content = line;

      if (line.startsWith('+')) {
        prefix = '+ ';
        colorTag = 'green-fg';
        content = line.slice(1);
      } else if (line.startsWith('-')) {
        prefix = '- ';
        colorTag = 'red-fg';
        content = line.slice(1);
      } else if (line.startsWith(' ')) {
        prefix = '  ';
        colorTag = 'white-fg';
        content = line.slice(1);
      }

      const formattedContent = this.formatInlineMarkdown(content);

      // Format markdown structure headers (# Header 1, ## Header 2, ### Header 3)
      if (content.startsWith('# ')) {
        const title = content.slice(2).trim();
        resultLines.push(`{${colorTag}}{bold}${prefix}========================================{/bold}{/${colorTag}}`);
        resultLines.push(`{${colorTag}}{bold}${prefix}  ${this.escapeBlessed(title)}{/bold}{/${colorTag}}`);
        resultLines.push(`{${colorTag}}{bold}${prefix}========================================{/bold}{/${colorTag}}`);
        continue;
      }

      if (content.startsWith('## ')) {
        const title = content.slice(3).trim();
        resultLines.push(`{${colorTag}}{bold}${prefix}── ${this.escapeBlessed(title)} ──────────────────────────────{/bold}{/${colorTag}}`);
        continue;
      }

      if (content.startsWith('### ')) {
        const title = content.slice(4).trim();
        resultLines.push(`{${colorTag}}{bold}${prefix}▶ ${this.escapeBlessed(title)}{/bold}{/${colorTag}}`);
        continue;
      }

      if (content.trim().startsWith('* ') || content.trim().startsWith('- ')) {
        const item = content.trim().slice(2);
        resultLines.push(`{${colorTag}}${prefix}  • ${this.formatInlineMarkdown(item)}{/${colorTag}}`);
        continue;
      }

      resultLines.push(`{${colorTag}}${prefix}${formattedContent}{/${colorTag}}`);
    }

    return resultLines.join('\n');
  }

  show(rawDiffText, filePath) {
    this.currentFilePath = filePath;
    this.box.setLabel(` {bold}{magenta-fg}📝 Interpreted Markdown Diff (${path.basename(filePath)}){/magenta-fg}{/bold} `);

    const interpreted = this.interpretMarkdownDiff(rawDiffText, filePath);
    this.contentBox.setContent(interpreted);

    this.screen.append(this.box);
    this.box.setFront();
    this.box.show();
    this.contentBox.focus();

    if (this.screen.program) this.screen.program.clear();
    if (typeof this.screen.alloc === 'function') this.screen.alloc();
    this.screen.render();
  }

  hide() {
    this.box.hide();
    if (this.screen.program) this.screen.program.clear();
    if (typeof this.screen.alloc === 'function') this.screen.alloc();
    this.screen.render();
  }
}
