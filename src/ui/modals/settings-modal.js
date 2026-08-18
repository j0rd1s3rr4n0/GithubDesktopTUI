import blessed from 'blessed';
import { RemoteConfig } from '../../git/remote-config.js';

export class SettingsModal {
  constructor(screen, ghService) {
    this.screen = screen;
    this.ghService = ghService;
    this.config = RemoteConfig.load();

    this.box = blessed.box({
      parent: screen,
      top: 'center',
      left: 'center',
      width: 68,
      height: 17,
      label: ' {bold}Settings — Remote Integration ( , ){/bold} ',
      tags: true,
      hidden: true,
      border: { type: 'line' },
      style: {
        border: { fg: 'cyan' },
        bg: 'black'
      },
      keys: true
    });

    this.statusText = blessed.text({
      parent: this.box,
      top: 0,
      left: 2,
      width: 62,
      tags: true,
      content: '{gray-fg}Select which git forge the TUI integrates with.{/gray-fg}'
    });

    const typeLabel = blessed.text({
      parent: this.box,
      top: 2,
      left: 2,
      content: '{bold}Remote type:{/bold}',
      tags: true
    });

    this.radioSet = blessed.radioset({
      parent: this.box,
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
      style: {
        focus: { bg: 'blue' }
      }
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
      style: {
        focus: { bg: 'blue' }
      }
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
      style: {
        focus: { bg: 'blue' }
      }
    });

    this.gitlabHostLabel = blessed.text({
      parent: this.box,
      top: 8,
      left: 2,
      content: '{bold}GitLab host:{/bold}',
      tags: true
    });

    this.gitlabHostInput = blessed.textbox({
      parent: this.box,
      top: 8,
      left: 16,
      width: 40,
      height: 1,
      value: this.config.gitlabHost,
      style: {
        bg: 'black',
        fg: 'white',
        focus: { bg: 'blue', fg: 'white' }
      },
      keys: true,
      mouse: true,
      inputOnFocus: true
    });

    this.customUrlLabel = blessed.text({
      parent: this.box,
      top: 10,
      left: 2,
      content: '{bold}Custom URL:{/bold}',
      tags: true
    });

    this.customUrlInput = blessed.textbox({
      parent: this.box,
      top: 10,
      left: 16,
      width: 40,
      height: 1,
      value: this.config.customRemoteUrl,
      style: {
        bg: 'black',
        fg: 'white',
        focus: { bg: 'blue', fg: 'white' }
      },
      keys: true,
      mouse: true,
      inputOnFocus: true
    });

    this.saveBtn = blessed.button({
      parent: this.box,
      top: 13,
      left: 4,
      width: 18,
      height: 1,
      content: ' [Enter] Save ',
      align: 'center',
      style: {
        bg: 'green',
        fg: 'black',
        bold: true,
        focus: { bg: 'yellow', fg: 'black' }
      }
    });

    this.applyCustomBtn = blessed.button({
      parent: this.box,
      top: 13,
      left: 25,
      width: 20,
      height: 1,
      content: ' [a] Apply URL as Origin ',
      align: 'center',
      style: {
        bg: 'magenta',
        fg: 'white',
        focus: { bg: 'yellow', fg: 'black' }
      }
    });

    this.closeBtn = blessed.button({
      parent: this.box,
      top: 13,
      left: 48,
      width: 15,
      height: 1,
      content: ' [Esc] Close ',
      align: 'center',
      style: {
        bg: 'gray',
        fg: 'white',
        focus: { bg: 'yellow', fg: 'black' }
      }
    });

    // Button to open update modal from settings
    this.updateAppBtn = blessed.button({
      parent: this.box,
      top: 13,
      left: 28,
      width: 18,
      height: 1,
      content: ' [u] Check / Update App ',
      align: 'center',
      style: {
        bg: 'blue',
        fg: 'white',
        focus: { bg: 'yellow', fg: 'black' }
      }
    });

    this.setupEvents();
  }

  setupEvents() {
    this.saveBtn.on('press', () => this.save());
    this.box.key(['enter'], () => this.save());

    this.applyCustomBtn.on('press', () => this.applyCustomRemote());
    this.box.key(['a'], () => this.applyCustomRemote());

    this.updateAppBtn.on('press', () => this.screen.emit('open-update-modal'));
    this.box.key(['u'], () => this.screen.emit('open-update-modal'));

    this.closeBtn.on('press', () => this.hide());
    this.box.key(['escape', 'q'], () => this.hide());

    this.gitlabHostInput.on('focus', () => {
      if (!this.gitlabHostInput._reading) this.gitlabHostInput.readInput();
    });
    this.customUrlInput.on('focus', () => {
      if (!this.customUrlInput._reading) this.customUrlInput.readInput();
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
      this.screen.emit('notify', `✓ Settings saved. Remote integration: ${type.toUpperCase()}`);
    } else {
      this.screen.emit('notify', 'Failed to save settings.');
    }
    this.hide();
  }

  async applyCustomRemote() {
    const url = this.customUrlInput.getValue().trim();
    if (!url) {
      this.statusText.setContent('{red-fg}Please enter a remote URL first (e.g. git@my-server:group/repo.git).{/red-fg}');
      this.screen.render();
      return;
    }
    const res = await this.ghService.setCustomRemote(url);
    if (res.success) {
      this.statusText.setContent(`{green-fg}✓ ${res.message}{/green-fg}`);
      this.screen.emit('notify', `✓ ${res.message}`);
    } else {
      this.statusText.setContent(`{red-fg}✗ ${res.error}{/red-fg}`);
      this.screen.emit('notify', `Failed to set remote: ${res.error}`);
    }
    this.screen.render();
  }

  show() {
    this.config = RemoteConfig.load();
    this.githubRadio.checked = this.config.remoteType === 'github';
    this.gitlabRadio.checked = this.config.remoteType === 'gitlab';
    this.customRadio.checked = this.config.remoteType === 'custom';
    this.gitlabHostInput.setValue(this.config.gitlabHost);
    this.customUrlInput.setValue(this.config.customRemoteUrl);
    this.statusText.setContent('{gray-fg}Select which git forge the TUI integrates with.{/gray-fg}');
    this.screen.append(this.box);
    this.box.setFront();
    this.box.show();
    this.githubRadio.focus();
    this.screen.render();
  }

  hide() {
    this.box.hide();
    this.screen.render();
  }
}