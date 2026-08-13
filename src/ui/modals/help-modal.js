import blessed from 'blessed';

export class HelpModal {
  constructor(screen) {
    this.screen = screen;
    this.modal = blessed.box({
      parent: screen,
      top: 'center',
      left: 'center',
      width: 70,
      height: 24,
      label: ' {bold}GitHub Desktop TUI - Keyboard Shortcuts{/bold} ',
      tags: true,
      hidden: true,
      border: { type: 'line' },
      style: {
        border: { fg: 'yellow' },
        bg: 'black'
      },
      keys: true,
      vi: true,
      scrollable: true,
      scrollbar: { ch: '█', style: { fg: 'yellow' } }
    });

    const helpContent = [
      '{yellow-fg}{bold}Navigation & Views{/bold}{/yellow-fg}',
      '  {cyan-fg}1 - 4{/cyan-fg}        Switch Tab (1: Changes, 2: History, 3: Branches, 4: Stash)',
      '  {cyan-fg}Tab / S-Tab{/cyan-fg}  Switch focus between panels',
      '  {cyan-fg}j / k / Up / Down{/cyan-fg} Navigate items in list / scroll diff',
      '  {cyan-fg}r{/cyan-fg}            Refresh current Git status',
      '  {cyan-fg}? / F1{/cyan-fg}       Toggle this Help window',
      '  {cyan-fg}q / Esc{/cyan-fg}      Close Modal / Quit application',
      '',
      '{yellow-fg}{bold}Tab 1: Changes (Stage & Commit){/bold}{/yellow-fg}',
      '  {cyan-fg}Space{/cyan-fg}        Stage / Unstage selected file',
      '  {cyan-fg}a{/cyan-fg}            Stage ALL files',
      '  {cyan-fg}u{/cyan-fg}            Unstage ALL files',
      '  {cyan-fg}d{/cyan-fg}            Discard changes in selected file',
      '  {cyan-fg}c{/cyan-fg}            Focus Commit Summary input box',
      '  {cyan-fg}Ctrl+Enter{/cyan-fg}   Execute Commit (from Summary or Description)',
      '',
      '{yellow-fg}{bold}Tab 2: History{/bold}{/yellow-fg}',
      '  {cyan-fg}Enter / Click{/cyan-fg} Inspect selected commit details and patch diff',
      '',
      '{yellow-fg}{bold}Tab 3: Branches & Remote Actions{/bold}{/yellow-fg}',
      '  {cyan-fg}Enter{/cyan-fg}        Checkout selected branch',
      '  {cyan-fg}b / n{/cyan-fg}        Create new local branch modal',
      '  {cyan-fg}P{/cyan-fg}            Git Push (Shift+P)',
      '  {cyan-fg}p{/cyan-fg}            Git Pull',
      '',
      '{yellow-fg}{bold}Tab 4: Stash Drawer{/bold}{/yellow-fg}',
      '  {cyan-fg}s{/cyan-fg}            Create new Stash modal',
      '  {cyan-fg}a{/cyan-fg}            Apply selected stash',
      '  {cyan-fg}p{/cyan-fg}            Pop selected stash',
      '  {cyan-fg}x{/cyan-fg}            Drop selected stash',
      '',
      '{gray-fg}Press Esc, q, or ? to close this menu{/gray-fg}'
    ].join('\n');

    this.modal.setContent(helpContent);

    this.modal.key(['escape', 'q', 'f1', '?'], () => {
      this.hide();
    });
  }

  show() {
    this.modal.show();
    this.modal.focus();
    this.screen.render();
  }

  hide() {
    this.modal.hide();
    this.screen.render();
  }

  toggle() {
    if (this.modal.visible) {
      this.hide();
    } else {
      this.show();
    }
  }
}
