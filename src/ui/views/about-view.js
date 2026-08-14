import blessed from 'blessed';

export class AboutView {
  constructor(screen, app, options = {}) {
    this.screen = screen;
    this.app = app;

    this.container = blessed.box({
      top: options.top || 6,
      left: 0,
      width: '100%',
      height: '100%-6',
      hidden: true
    });

    this.box = blessed.box({
      parent: this.container,
      top: 'center',
      left: 'center',
      width: 78,
      height: 24,
      label: ' {bold}{magenta-fg} 🐙 About GitHub Desktop TUI (gd) {/magenta-fg}{/bold} ',
      tags: true,
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
      '{yellow-fg}{bold}Descripción de la Aplicación:{/bold}{/yellow-fg}',
      'Una aplicación TUI moderna, ultrarrápida, completa y fluida para la terminal,',
      'inspirada en la experiencia de GitHub Desktop y potenciada por',
      'Git nativo y la herramienta oficial GitHub CLI ({cyan-fg}gh{/cyan-fg}).',
      '',
      '{yellow-fg}{bold}Creador & Desarrollador Principal:{/bold}{/yellow-fg}',
      '  👨‍💻 {bold}{magenta-fg}j0rd1s3rr4n0{/magenta-fg}{/bold}',
      '  🌐 Perfil de GitHub: {cyan-fg}https://github.com/j0rd1s3rr4n0{/cyan-fg}',
      '',
      '{yellow-fg}{bold}Secciones y Funcionalidades:{/bold}{/yellow-fg}',
      '  • {green-fg}[1] Changes{/green-fg}      - Checklist de cambios, staging ([x]/[ ]) y commit.',
      '  • {green-fg}[2] History{/green-fg}      - Cronología de commits y visualizador de parches diff.',
      '  • {green-fg}[3] Branches{/green-fg}     - Gestión de ramas locales/remotas, checkout, push y pull.',
      '  • {green-fg}[4] Stash{/green-fg}        - Cajón para guardar, aplicar y descartar stashes.',
      '  • {green-fg}[5] GitHub{/green-fg}       - Pull Requests, Issues y Repositorios remotos vía gh CLI.',
      '  • {green-fg}[6] Repositories{/green-fg} - Gestor unificado de repositorios locales y clonados.',
      '  • {green-fg}[7] About{/green-fg}        - Información del creador y de la aplicación.',
      '',
      '{center}{gray-fg}Usa la rueda del ratón o las flechas para desplazarte{/gray-fg}{/center}'
    ].join('\n');

    this.box.setContent(aboutContent);
  }

  show() {
    this.container.show();
    this.box.focus();
    this.screen.render();
  }

  hide() {
    this.container.hide();
  }
}
