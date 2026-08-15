import blessed from 'blessed';
import { RemoteConfig } from '../../git/remote-config.js';
import { I18nService, LANGUAGES } from '../../git/i18n-service.js';

const t = (key) => I18nService.t(key);

export class SettingsView {
  constructor(screen, app, options = {}) {
    this.screen = screen;
    this.app = app;
    this.ghService = app.ghService;
    this.config = RemoteConfig.load();

    this.container = blessed.box({
      top: options.top || 5,
      left: 0,
      width: '100%',
      height: '100%-6',
      hidden: true
    });

    // ---------- LEFT COLUMN: Remote Integration ----------
    this.remotePanel = blessed.box({
      parent: this.container,
      top: 0,
      left: 0,
      width: '44%',
      height: '100%',
      label: ` {bold}{cyan-fg}${t('settingsPanelLabel')}{/cyan-fg}{/bold} `,
      tags: true,
      border: { type: 'line' },
      style: { border: { fg: 'cyan' }, bg: 'black' },
      keys: true,
      mouse: true
    });

    this.statusText = blessed.text({
      parent: this.remotePanel,
      top: 0,
      left: 2,
      width: '100%-4',
      tags: true,
      content: `{gray-fg}${t('settingsStatusDefault')}{/gray-fg}`
    });

    const typeLabel = blessed.text({
      parent: this.remotePanel,
      top: 2,
      left: 2,
      tags: true,
      content: `{bold}${t('settingsRemoteType')}{/bold}`
    });

    this.radioSet = blessed.radioset({
      parent: this.remotePanel,
      top: 3,
      left: 2,
      width: 30,
      height: 4
    });

    this.githubRadio = blessed.radiobutton({
      parent: this.radioSet,
      top: 0,
      left: 0,
      width: 22,
      height: 1,
      content: ' GitHub (gh)',
      checked: this.config.remoteType === 'github',
      keys: true,
      mouse: true,
      style: { focus: { bg: 'blue' } }
    });

    this.gitlabRadio = blessed.radiobutton({
      parent: this.radioSet,
      top: 1,
      left: 0,
      width: 22,
      height: 1,
      content: ' GitLab (glab)',
      checked: this.config.remoteType === 'gitlab',
      keys: true,
      mouse: true,
      style: { focus: { bg: 'blue' } }
    });

    this.customRadio = blessed.radiobutton({
      parent: this.radioSet,
      top: 2,
      left: 0,
      width: 24,
      height: 1,
      content: ' Custom git server',
      checked: this.config.remoteType === 'custom',
      keys: true,
      mouse: true,
      style: { focus: { bg: 'blue' } }
    });

    this.gitlabHostLabel = blessed.text({
      parent: this.remotePanel,
      top: 7,
      left: 2,
      width: 12,
      tags: true,
      content: `{bold}${t('settingsGitlabHost')}{/bold}`
    });

    this.gitlabHostInput = blessed.textbox({
      parent: this.remotePanel,
      top: 7,
      left: 16,
      width: 30,
      height: 1,
      value: this.config.gitlabHost,
      style: { bg: 'black', fg: 'white', focus: { bg: 'blue', fg: 'white' } },
      keys: true,
      mouse: true,
      inputOnFocus: true
    });

    this.customUrlLabel = blessed.text({
      parent: this.remotePanel,
      top: 9,
      left: 2,
      width: 12,
      tags: true,
      content: `{bold}${t('settingsCustomUrl')}{/bold}`
    });

    this.customUrlInput = blessed.textbox({
      parent: this.remotePanel,
      top: 9,
      left: 16,
      width: 30,
      height: 1,
      value: this.config.customRemoteUrl,
      style: { bg: 'black', fg: 'white', focus: { bg: 'blue', fg: 'white' } },
      keys: true,
      mouse: true,
      inputOnFocus: true
    });

    this.saveBtn = blessed.button({
      parent: this.remotePanel,
      top: 12,
      left: 3,
      width: t('settingsSaveBtn').length,
      height: 1,
      content: t('settingsSaveBtn'),
      align: 'center',
      style: { bg: 'green', fg: 'black', bold: true, focus: { bg: 'yellow', fg: 'black' } },
      mouse: true,
      keys: true
    });

    this.applyCustomBtn = blessed.button({
      parent: this.remotePanel,
      top: 12,
      left: 3 + t('settingsSaveBtn').length + 2,
      width: t('settingsApplyBtn').length,
      height: 1,
      content: t('settingsApplyBtn'),
      align: 'center',
      style: { bg: 'magenta', fg: 'white', focus: { bg: 'yellow', fg: 'black' } },
      mouse: true,
      keys: true
    });

    this.remoteHint = blessed.text({
      parent: this.remotePanel,
      bottom: 1,
      left: 2,
      width: '100%-4',
      tags: true,
      content: '{gray-fg}Settings are saved globally (~/.gitu_config.json) and apply on every tab.{/gray-fg}'
    });

    // ---------- RIGHT COLUMN TOP: Language ----------
    this.langPanel = blessed.box({
      parent: this.container,
      top: 0,
      left: '44%',
      width: '56%',
      height: '50%',
      label: ` {bold}{magenta-fg}🌐 ${t('settingsLanguageLabel')}{/magenta-fg}{/bold} `,
      tags: true,
      border: { type: 'line' },
      style: { border: { fg: 'magenta' }, bg: 'black' },
      keys: true,
      mouse: true
    });

    this.languageList = blessed.list({
      parent: this.langPanel,
      top: 1,
      left: 2,
      width: '100%-4',
      height: '100%-3',
      keys: true,
      vi: true,
      mouse: true,
      tags: true,
      scrollable: true,
      scrollbar: { ch: '█', style: { fg: 'magenta' } },
      style: {
        selected: { bg: 'blue', fg: 'white', bold: true },
        border: { fg: 'magenta' },
        focus: { border: { fg: 'yellow' } }
      }
    });

    this.langHint = blessed.text({
      parent: this.langPanel,
      bottom: 0,
      left: 2,
      width: '100%-4',
      tags: true,
      content: `{gray-fg}${t('settingsHintBar')}{/gray-fg}`
    });

    // ---------- RIGHT COLUMN BOTTOM: Account / Auth ----------
    this.authPanel = blessed.box({
      parent: this.container,
      top: '50%',
      left: '44%',
      width: '56%',
      height: '50%',
      label: ` {bold}{green-fg}👤 ${t('settingsAuthLabel')}{/green-fg}{/bold} `,
      tags: true,
      border: { type: 'line' },
      style: { border: { fg: 'green' }, bg: 'black' },
      keys: true,
      mouse: true
    });

    this.authStatus = blessed.text({
      parent: this.authPanel,
      top: 1,
      left: 2,
      width: '100%-4',
      tags: true,
      content: `{gray-fg}${t('settingsAuthChecking')}{/gray-fg}`
    });

    this.loginBtn = blessed.button({
      parent: this.authPanel,
      top: 5,
      left: 3,
      width: 16,
      height: 1,
      content: t('settingsLoginBtn'),
      align: 'center',
      style: { bg: 'green', fg: 'black', bold: true, focus: { bg: 'yellow', fg: 'black' } },
      mouse: true,
      keys: true
    });

    this.logoutBtn = blessed.button({
      parent: this.authPanel,
      top: 5,
      left: 22,
      width: 16,
      height: 1,
      content: t('settingsLogoutBtn'),
      align: 'center',
      style: { bg: 'red', fg: 'white', bold: true, focus: { bg: 'yellow', fg: 'black' } },
      mouse: true,
      keys: true
    });

    this.authHint = blessed.text({
      parent: this.authPanel,
      bottom: 0,
      left: 2,
      width: '100%-4',
      tags: true,
      content: '{gray-fg}Login opens the interactive gh/glab auth flow. Logout is confirmed before running.{/gray-fg}'
    });

    this.setupEvents();
  }

  getFocusOrder() {
    return [
      this.githubRadio,
      this.gitlabRadio,
      this.customRadio,
      this.gitlabHostInput,
      this.customUrlInput,
      this.saveBtn,
      this.applyCustomBtn,
      this.languageList,
      this.loginBtn,
      this.logoutBtn
    ];
  }

  cycleFocus(dir) {
    if (this.container.hidden) return;
    const order = this.getFocusOrder();
    let idx = order.indexOf(this.screen.focused);
    if (idx === -1) idx = 0;
    const next = order[(idx + dir + order.length) % order.length];
    next.focus();
    this.screen.render();
  }

  setupEvents() {
    this.saveBtn.on('press', () => this.save());
    this.applyCustomBtn.on('press', () => this.applyCustomRemote());
    this.loginBtn.on('press', () => this.login());
    this.logoutBtn.on('press', () => this.logout());

    this.languageList.key(['enter', 'space'], () => {
      const lang = LANGUAGES[this.languageList.selected];
      if (lang) this.setLanguage(lang.code);
    });

    this.gitlabHostInput.on('focus', () => {
      if (!this.gitlabHostInput._reading) this.gitlabHostInput.readInput();
    });
    this.customUrlInput.on('focus', () => {
      if (!this.customUrlInput._reading) this.customUrlInput.readInput();
    });
    this.gitlabHostInput.key(['enter'], () => this.save());
    this.customUrlInput.key(['enter'], () => this.save());

    // Blessed only dispatches element.key() to the FOCUSED element, so key
    // navigation across the whole view is handled at the screen level.
    this.screen.key(['tab'], () => this.cycleFocus(1));
    this.screen.key(['S-tab', 'backtab'], () => this.cycleFocus(-1));

    this.screen.key(['a'], () => {
      if (this.container.hidden) return;
      const focused = this.screen.focused;
      if (focused && (focused === this.gitlabHostInput || focused === this.customUrlInput)) return;
      this.applyCustomRemote();
    });
  }

  getSelectedType() {
    if (this.gitlabRadio.checked) return 'gitlab';
    if (this.customRadio.checked) return 'custom';
    return 'github';
  }

  save() {
    const type = this.getSelectedType();
    const cfg = {
      remoteType: type,
      gitlabHost: this.gitlabHostInput.getValue().trim() || 'gitlab.com',
      customRemoteUrl: this.customUrlInput.getValue().trim()
    };
    if (RemoteConfig.save(cfg)) {
      this.ghService.reload();
      this.screen.emit('settings-saved', cfg);
      this.screen.emit('notify', `${t('settingsSavedMsg')}${type.toUpperCase()}`);
    } else {
      this.screen.emit('notify', t('settingsSaveFailed'));
    }
  }

  async applyCustomRemote() {
    const url = this.customUrlInput.getValue().trim();
    if (!url) {
      this.statusText.setContent(`{red-fg}${t('settingsApplyEmpty')}{/red-fg}`);
      this.screen.render();
      return;
    }
    const res = await this.ghService.setCustomRemote(url);
    if (res.success) {
      this.statusText.setContent(`{green-fg}${t('settingsApplyOk')}${res.message}{/green-fg}`);
      this.screen.emit('notify', `${t('settingsApplyOk')}${res.message}`);
    } else {
      this.statusText.setContent(`{red-fg}✗ ${res.error}{/red-fg}`);
      this.screen.emit('notify', `${t('settingsApplyFail')}${res.error}`);
    }
    this.screen.render();
  }

  setLanguage(code) {
    I18nService.setLanguage(code);
    this.renderLanguageItems();
    this.app.notify(`Language changed to: ${code.toUpperCase()}`);
    this.app.updateI18nLabels();
    this.screen.render();
  }

  renderLanguageItems() {
    const current = I18nService.getLanguage();
    const items = LANGUAGES.map(l =>
      (l.code === current ? '{green-fg}✓{/green-fg} ' : '  ') +
      `{bold}${l.name}{/bold} {gray-fg}(${l.code.toUpperCase()}){/gray-fg}`
    );
    this.languageList.setItems(items);
    const idx = Math.max(0, LANGUAGES.findIndex(l => l.code === current));
    this.languageList.select(idx);
  }

  login() {
    this.app.handleGhAuthDirect();
  }

  async logout() {
    this.app.confirmModal.ask('Logout from GitHub/GitLab CLI?', async () => {
      this.authStatus.setContent(`{cyan-fg}${t('settingsAuthChecking')}{/cyan-fg}`);
      this.screen.render();
      const res = await this.ghService.logout();
      if (res.success) {
        this.app.notify(t('settingsLoggedOut'));
      } else {
        this.app.notify(`${t('settingsLogoutFailed')}${res.error}`);
      }
      await this.app.refreshGlobalHeader();
      this.refreshAuth();
    });
  }

  async refreshAuth() {
    const tool = this.ghService.getTool();
    if (!tool) {
      this.authStatus.setContent(`{yellow-fg}${t('settingsAuthCustom')}{/yellow-fg}`);
      this.screen.render();
      return;
    }
    this.authStatus.setContent(`{gray-fg}${t('settingsAuthChecking')}{/gray-fg}`);
    this.screen.render();
    const auth = await this.ghService.getAuthStatus();
    if (auth.isLoggedIn) {
      const host = auth.host || (tool === 'glab' ? this.ghService.getGitlabHost() : 'github.com');
      const msg = t('settingsAuthOk').replace('{user}', auth.user).replace('{host}', host);
      this.authStatus.setContent(`{green-fg}${msg}{/green-fg}`);
    } else {
      this.authStatus.setContent(`{yellow-fg}${t('settingsAuthNo').replace('{tool}', tool)}{/yellow-fg}`);
    }
    this.screen.render();
  }

  refresh() {
    this.config = RemoteConfig.load();
    this.githubRadio.checked = this.config.remoteType === 'github';
    this.gitlabRadio.checked = this.config.remoteType === 'gitlab';
    this.customRadio.checked = this.config.remoteType === 'custom';
    this.gitlabHostInput.setValue(this.config.gitlabHost);
    this.customUrlInput.setValue(this.config.customRemoteUrl);
    this.statusText.setContent(`{gray-fg}${t('settingsStatusDefault')}{/gray-fg}`);
    this.renderLanguageItems();
    this.screen.render();
    this.refreshAuth();
  }

  updateI18nLabels() {
    this.remotePanel.setLabel(` {bold}{cyan-fg}${t('settingsPanelLabel')}{/cyan-fg}{/bold} `);
    this.langPanel.setLabel(` {bold}{magenta-fg}🌐 ${t('settingsLanguageLabel')}{/magenta-fg}{/bold} `);
    this.authPanel.setLabel(` {bold}{green-fg}👤 ${t('settingsAuthLabel')}{/green-fg}{/bold} `);
    this.statusText.setContent(`{gray-fg}${t('settingsStatusDefault')}{/gray-fg}`);
    this.gitlabHostLabel.setContent(`{bold}${t('settingsGitlabHost')}{/bold}`);
    this.customUrlLabel.setContent(`{bold}${t('settingsCustomUrl')}{/bold}`);
    this.saveBtn.setContent(t('settingsSaveBtn'));
    this.applyCustomBtn.setContent(t('settingsApplyBtn'));
    this.saveBtn.width = t('settingsSaveBtn').length;
    this.applyCustomBtn.width = t('settingsApplyBtn').length;
    this.applyCustomBtn.position.left = 3 + t('settingsSaveBtn').length + 2;
    this.loginBtn.setContent(t('settingsLoginBtn'));
    this.logoutBtn.setContent(t('settingsLogoutBtn'));
    this.langHint.setContent(`{gray-fg}${t('settingsHintBar')}{/gray-fg}`);
    this.renderLanguageItems();
    this.screen.render();
  }

  show() {
    this.container.show();
    this.refresh();
    this.githubRadio.focus();
    this.screen.render();
  }

  hide() {
    this.container.hide();
  }
}