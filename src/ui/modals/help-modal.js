import blessed from 'blessed';

export class HelpModal {
  constructor(screen) {
    this.screen = screen;
    this.modal = blessed.box({
      parent: screen,
      top: 'center',
      left: 'center',
      width: 74,
      height: 28,
      label: ' {bold}GitHub Desktop TUI - Atajos de Teclado{/bold} ',
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
      '{yellow-fg}{bold}Navegación & Repositorios{/bold}{/yellow-fg}',
      '  {cyan-fg}1 - 7{/cyan-fg}        Cambiar Pestaña (1: Changes, 2: History, 3: Branches, 4: Stash, 5: GitHub, 6: Repos, 7: About)',
      '  {cyan-fg}6{/cyan-fg}            Gestor Unificado de Repositorios (Locales + Clonados + Abrir Ruta)',
      '  {cyan-fg}7 / F2{/cyan-fg}       Pestaña Acerca de (About j0rd1s3rr4n0)',
      '  {cyan-fg}o / Ctrl+O{/cyan-fg}   Explorar y Clonar Repositorios de GitHub (Perfil y Orgs)',
      '  {cyan-fg}i{/cyan-fg}            Diálogo de Iniciar Git o Clonar',
      '  {cyan-fg}Tab / S-Tab{/cyan-fg}  Alternar foco entre paneles',
      '  {cyan-fg}j / k / ↑ / ↓{/cyan-fg} Navegar elementos en listas y desplazamiento de diffs',
      '  {cyan-fg}r{/cyan-fg}            Refrescar estado de Git y GitHub',
      '  {cyan-fg}? / F1{/cyan-fg}       Abrir / Cerrar esta ventana de Ayuda',
      '  {cyan-fg}Esc / q{/cyan-fg}      Cerrar ventana o modal activa',
      '  {cyan-fg}Shift+Q / C-c{/cyan-fg} Salir de la aplicación',
      '',
      '{yellow-fg}{bold}Integración con GitHub CLI (gh){/bold}{/yellow-fg}',
      '  {cyan-fg}L{/cyan-fg}            Estado de Login y Autenticación en GitHub',
      '  {cyan-fg}5{/cyan-fg}            Pestaña GitHub (Pull Requests, Issues y Repositorios Remotos)',
      '',
      '{yellow-fg}{bold}Pestaña 1: Changes (Staging y Commit){/bold}{/yellow-fg}',
      '  {cyan-fg}Espacio{/cyan-fg}      Stagelar / Des-stagelar el archivo seleccionado',
      '  {cyan-fg}a / u{/cyan-fg}        Stagelar TODO / Des-stagelar TODO',
      '  {cyan-fg}d{/cyan-fg}            Descartar cambios del archivo seleccionado',
      '  {cyan-fg}c{/cyan-fg}            Enfocar casilla de Resumen de Commit',
      '  {cyan-fg}Ctrl+Enter{/cyan-fg}   Ejecutar Commit (desde Resumen o Descripción)',
      '',
      '{yellow-fg}{bold}Pestañas 2 y 3: History & Branches{/bold}{/yellow-fg}',
      '  {cyan-fg}Enter{/cyan-fg}        Inspeccionar commit / Cambiar a la rama seleccionada',
      '  {cyan-fg}b / n{/cyan-fg}        Modal para crear nueva rama local',
      '  {cyan-fg}P / p{/cyan-fg}        Git Push (Shift+P) / Git Pull',
      '',
      '{yellow-fg}{bold}Pestaña 4: Stash Drawer{/bold}{/yellow-fg}',
      '  {cyan-fg}s / a / p / x{/cyan-fg} Crear / Aplicar / Pop / Eliminar stash',
      '',
      '{gray-fg}Pulsa Esc, q o ? para cerrar este menú{/gray-fg}'
    ].join('\n');

    this.modal.setContent(helpContent);

    this.modal.key(['escape', 'q', 'f1', '?'], () => {
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
