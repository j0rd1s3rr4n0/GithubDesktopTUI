import blessed from 'blessed';
import fs from 'fs';
import path from 'path';
import { copyPathToClipboard } from '../../git/repo-store.js';

export class ReadmeModal {
  constructor(screen, gitService) {
    this.screen = screen;
    this.gitService = gitService;

    this.box = blessed.box({
      parent: screen,
      top: 'center',
      left: 'center',
      width: '85%',
      height: '85%',
      label: ' {bold}{cyan-fg}📖 Interpreted Markdown README Viewer{/cyan-fg}{/bold} ',
      tags: true,
      hidden: true,
      border: { type: 'line' },
      style: {
        border: { fg: 'cyan' },
        bg: 'black'
      },
      keys: true,
      vi: true,
      mouse: true,
      scrollable: true,
      scrollbar: { ch: '█', style: { fg: 'cyan' } }
    });

    this.contentBox = blessed.box({
      parent: this.box,
      top: 0,
      left: 1,
      width: '100%-4',
      height: '100%-2',
      tags: true,
      scrollable: true,
      scrollbar: { ch: '█', style: { fg: 'cyan' } },
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

    this.currentReadmePath = null;
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

    const copyReadme = () => {
      if (this.currentReadmePath) {
        copyPathToClipboard(this.currentReadmePath);
        this.screen.emit('notify', `✓ Copied README path to clipboard: ${this.currentReadmePath}`);
      }
    };

    this.box.key(['y', 'C-c'], copyReadme);
    this.contentBox.key(['y', 'C-c'], copyReadme);
  }

  interpretMarkdown(rawText) {
    const lines = rawText.split(/\r?\n/);
    const resultLines = [];
    let inCodeBlock = false;
    let codeBlockLang = '';

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];

      // Code block toggle (```js)
      if (line.trim().startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeBlockLang = line.trim().slice(3).trim();
          const langTag = codeBlockLang ? ` [${codeBlockLang}]` : '';
          resultLines.push(`{blue-fg}┌── Code Block${langTag} ──────────────────────────────────────────┐{/blue-fg}`);
        } else {
          inCodeBlock = false;
          resultLines.push('{blue-fg}└──────────────────────────────────────────────────────────┘{/blue-fg}');
        }
        continue;
      }

      if (inCodeBlock) {
        resultLines.push(`{blue-fg}│{/blue-fg} {cyan-fg}${this.escapeBlessed(line)}{/cyan-fg}`);
        continue;
      }

      // Headers (# Header 1, ## Header 2, ### Header 3)
      if (line.startsWith('# ')) {
        const title = line.slice(2).trim();
        resultLines.push('');
        resultLines.push(`{bold}{cyan-fg}============================================================{/cyan-fg}{/bold}`);
        resultLines.push(`{bold}{cyan-fg}  ${this.escapeBlessed(title)}{/cyan-fg}{/bold}`);
        resultLines.push(`{bold}{cyan-fg}============================================================{/cyan-fg}{/bold}`);
        resultLines.push('');
        continue;
      }

      if (line.startsWith('## ')) {
        const title = line.slice(3).trim();
        resultLines.push('');
        resultLines.push(`{bold}{yellow-fg}── ${this.escapeBlessed(title)} ──────────────────────────────────────────{/yellow-fg}{/bold}`);
        resultLines.push('');
        continue;
      }

      if (line.startsWith('### ')) {
        const title = line.slice(4).trim();
        resultLines.push('');
        resultLines.push(`{bold}{magenta-fg}▶ ${this.escapeBlessed(title)}{/magenta-fg}{/bold}`);
        continue;
      }

      if (line.startsWith('#### ')) {
        const title = line.slice(5).trim();
        resultLines.push(`{bold}{green-fg}• ${this.escapeBlessed(title)}{/green-fg}{/bold}`);
        continue;
      }

      // Horizontal Rule (---, ***)
      if (line.trim() === '---' || line.trim() === '***' || line.trim() === '___') {
        resultLines.push('{gray-fg}────────────────────────────────────────────────────────────{/gray-fg}');
        continue;
      }

      // Blockquotes (> quote)
      if (line.startsWith('> ')) {
        const quote = line.slice(2).trim();
        resultLines.push(`  {gray-fg}│ ${this.formatInlineStyles(quote)}{/gray-fg}`);
        continue;
      }

      // Bullet lists (* item, - item, + item)
      if (line.trim().match(/^[*+-]\s+/)) {
        const item = line.trim().replace(/^[*+-]\s+/, '');
        resultLines.push(`  {green-fg}•{/green-fg} ${this.formatInlineStyles(item)}`);
        continue;
      }

      // Numbered lists (1. item)
      if (line.trim().match(/^\d+\.\s+/)) {
        const numMatch = line.trim().match(/^(\d+\.)\s+(.*)/);
        if (numMatch) {
          resultLines.push(`  {yellow-fg}${numMatch[1]}{/yellow-fg} ${this.formatInlineStyles(numMatch[2])}`);
          continue;
        }
      }

      // Table rows (| col | col |)
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        if (line.includes('---')) {
          resultLines.push('{gray-fg}├──────────────────────────────────────────────────────────┤{/gray-fg}');
        } else {
          const cells = line.split('|').slice(1, -1).map(c => this.formatInlineStyles(c.trim())).join('  │  ');
          resultLines.push(`{cyan-fg}│{/cyan-fg} ${cells}`);
        }
        continue;
      }

      // Regular paragraph line
      resultLines.push(this.formatInlineStyles(line));
    }

    return resultLines.join('\n');
  }

  formatInlineStyles(str) {
    let output = this.escapeBlessed(str);

    // Links: [text](url) -> {blue-fg}{underline}text{/underline}{/blue-fg} (url)
    output = output.replace(/\[(.*?)\]\((.*?)\)/g, '{blue-fg}{underline}$1{/underline}{/blue-fg} {gray-fg}($2){/gray-fg}');

    // Bold: **text** or __text__
    output = output.replace(/(\*\*|__)(.*?)\1/g, '{bold}$2{/bold}');

    // Italic: *text* or _text_
    output = output.replace(/(\*|_)(.*?)\1/g, '{gray-fg}$2{/gray-fg}');

    // Inline Code: `code`
    output = output.replace(/`(.*?)`/g, '{magenta-fg}$1{/magenta-fg}');

    return output;
  }

  escapeBlessed(str) {
    return str.replace(/\{/g, '{\\{').replace(/\}/g, '\\}');
  }

  findReadmeFile() {
    const candidates = [
      'README.md',
      'README',
      'README.txt',
      'README.markdown',
      'readme.md',
      'Readme.md',
      'docs/README.md'
    ];

    const repoPath = this.gitService.repoPath;
    for (const file of candidates) {
      const fullPath = path.join(repoPath, file);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
    return null;
  }

  showContent(rawText, title = 'README') {
    this.currentReadmePath = title;
    this.box.setLabel(` {bold}{cyan-fg}📖 Interpreted Markdown (${title}){/cyan-fg}{/bold} `);

    const interpreted = this.interpretMarkdown(rawText);
    this.contentBox.setContent(interpreted);

    this.screen.append(this.box);
    this.box.setFront();
    this.box.show();
    this.contentBox.focus();

    if (this.screen.program) this.screen.program.clear();
    if (typeof this.screen.alloc === 'function') this.screen.alloc();
    this.screen.render();
  }

  show() {
    const readmePath = this.findReadmeFile();
    this.currentReadmePath = readmePath;

    if (!readmePath) {
      this.box.setLabel(' {bold}{yellow-fg}📖 README Viewer - No README Found{/yellow-fg}{/bold} ');
      this.contentBox.setContent([
        '{yellow-fg}{bold}No README file found in this repository.{/bold}{/yellow-fg}',
        '',
        `Checked directory: ${this.gitService.repoPath}`,
        'Searched: README.md, README, README.txt, README.markdown',
        '',
        'Press {cyan-fg}[Esc]{/cyan-fg} or {cyan-fg}[q]{/cyan-fg} to close.'
      ].join('\n'));
    } else {
      const fileName = path.basename(readmePath);
      this.box.setLabel(` {bold}{cyan-fg}📖 Interpreted Markdown README (${fileName}){/cyan-fg}{/bold} `);
      try {
        const rawContent = fs.readFileSync(readmePath, 'utf8');
        const interpreted = this.interpretMarkdown(rawContent);
        this.contentBox.setContent(interpreted);
      } catch (err) {
        this.contentBox.setContent(`{red-fg}Failed to read README: ${err.message}{/red-fg}`);
      }
    }

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

  toggle() {
    if (this.box.visible) {
      this.hide();
    } else {
      this.show();
    }
  }
}
