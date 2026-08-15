import blessed from 'blessed';
import { I18nService, LANGUAGES } from '../../git/i18n-service.js';

export class LanguageModal {
  constructor(screen, onSelect) {
    this.screen = screen;
    this.onSelect = onSelect;

    this.box = blessed.box({
      parent: screen,
      top: 'center',
      left: 'center',
      width: 44,
      height: 15,
      label: ' {bold}Select Language / Idioma / Llengua{/bold} ',
      tags: true,
      hidden: true,
      border: { type: 'line' },
      style: {
        border: { fg: 'cyan' },
        bg: 'black'
      },
      keys: true
    });

    this.list = blessed.list({
      parent: this.box,
      top: 1,
      left: 2,
      width: '100%-4',
      height: 12,
      keys: true,
      vi: true,
      mouse: true,
      tags: true,
      scrollable: true,
      scrollbar: { ch: '█', style: { fg: 'cyan' } },
      style: {
        selected: { bg: 'blue', fg: 'white', bold: true },
        border: { fg: 'cyan' },
        focus: { border: { fg: 'yellow' } }
      }
    });

    this.setupEvents();
  }

  setupEvents() {
    this.list.key(['enter', 'space'], () => {
      const idx = this.list.selected;
      const lang = LANGUAGES[idx];
      if (!lang) return;
      this.hide();
      if (this.onSelect) this.onSelect(lang.code);
    });

    this.list.key(['escape', 'q'], () => {
      this.hide();
    });
  }

  show() {
    const current = I18nService.getLanguage();
    const items = LANGUAGES.map(l =>
      (l.code === current ? '{green-fg}✓{/green-fg} ' : '  ') +
      `{bold}${l.name}{/bold} {gray-fg}(${l.code.toUpperCase()}){/gray-fg}`
    );
    this.list.setItems(items);
    const idx = Math.max(0, LANGUAGES.findIndex(l => l.code === current));
    this.list.select(idx);

    this.screen.append(this.box);
    this.box.setFront();
    this.box.show();
    this.list.focus();
    this.screen.render();
  }

  hide() {
    this.box.hide();
    this.screen.render();
  }
}