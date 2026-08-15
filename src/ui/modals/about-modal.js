import blessed from 'blessed';

export class AboutModal {
  constructor(screen) {
    this.screen = screen;

    this.modal = blessed.box({
      parent: screen,
      top: 'center',
      left: 'center',
      width: 72,
      height: 22,
      label: ' {bold}Acerca de GitHub Desktop TUI (gd){/bold} ',
      tags: true,
      hidden: true,
      border: { type: 'line' },
      style: {
        border: { fg: 'magenta' },
        bg: 'black'
      },
      keys: true,
      mouse: true,
      scrollable: true,
      scrollbar: { ch: '█', style: { fg: 'magenta' } }
    });

    const aboutContent = [
      '{center}{bold}{cyan-fg}🐙 GITHUB DESKTOP TUI (gitu / gd){/cyan-fg}{/bold}{/center}',
      '{center}{gray-fg}Versión 1.0.0 — Interfaz de Terminal para Git & GitHub CLI{/gray-fg}{/center}',
      '',
      '{yellow-fg}{bold}Descripción:{/bold}{/yellow-fg}',
      'Una aplicación TUI moderna, ultrarrápida y fluida para la terminal,',
      'inspirada en la experiencia de GitHub Desktop y potenciada por',
      'Git nativo y la herramienta oficial GitHub CLI ({cyan-fg}gh{/cyan-fg}).',
      '',
      '{yellow-fg}{bold}Desarrollador & Creador:{/bold}{/yellow-fg}',
      '  👨‍💻 {bold}{magenta-fg}j0rd1s3rr4n0{/magenta-fg}{/bold}',
      '  🌐 GitHub: {cyan-fg}https://github.com/j0rd1s3rr4n0{/cyan-fg}',
      '',
      '{yellow-fg}{bold}Características principales:{/bold}{/yellow-fg}',
      '  • {green-fg}1: Changes{/green-fg}   - Checklist de archivos, diff en tiempo real y commits.',
      '  • {green-fg}2: History{/green-fg}   - Cronología de commits y parches detallados.',
      '  • {green-fg}3: Branches{/green-fg}  - Control de ramas locales/remotas, checkout, push y pull.',
      '  • {green-fg}4: Stash{/green-fg}     - Cajón para guardar, aplicar y descartar stashes.',
      '  • {green-fg}5: GitHub{/green-fg}    - Listado de Pull Requests, Issues y Repositorios.',
      '  • {green-fg}6: Repos{/green-fg}     - Gestor unificado de repositorios locales y clonados.',
      '  • {green-fg}9: Settings{/green-fg}   - Integración remota (gh / glab / custom).',
      '',
      '{center}{gray-fg}Pulsa Esc o q para cerrar esta ventana{/gray-fg}{/center}'
    ].join('\n');

    this.modal.setContent(aboutContent);

    this.modal.key(['escape', 'q'], () => {
      this.hide();
    });
  }

  show() {
    this.screen.append(this.modal);
    this.modal.setFront();
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
