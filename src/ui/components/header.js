import blessed from 'blessed';
import { I18nService } from '../../git/i18n-service.js';

export class Header {
  constructor(options = {}) {
    this.box = blessed.box({
      top: 0,
      left: 0,
      width: '100%',
      height: 3,
      tags: true,
      border: { type: 'line' },
      style: {
        border: { fg: 'blue' },
        bg: 'black',
        fg: 'white'
      }
    });

    this.lastData = null;
  }

  update({ repoName, currentBranch, ahead = 0, behind = 0, ghUser = null, remoteType = 'github' } = {}) {
    if (arguments[0]) {
      this.lastData = arguments[0];
    }
    if (!this.lastData) return;

    const data = this.lastData;
    const repoText = `{bold}{white-fg} GitHub Desktop TUI{/white-fg}{/bold} | ${I18nService.t('headerRepo')} {green-fg}${data.repoName}{/green-fg}`;
    const branchBadge = `{bold}{black-bg}{yellow-fg}  ${data.currentBranch} {/yellow-fg}{/black-bg}{/bold}`;
    
    let syncText = '{green-fg}✓ Up to date{/green-fg}';
    if (data.ahead > 0 || data.behind > 0) {
      const aheadStr = data.ahead > 0 ? `{yellow-fg}↑${data.ahead}{/yellow-fg}` : '';
      const behindStr = data.behind > 0 ? `{magenta-fg}↓${data.behind}{/magenta-fg}` : '';
      syncText = `{bold}${aheadStr} ${behindStr}{/bold}`.trim();
    }

    let ghStatus = `{yellow-fg}${I18nService.t('headerUser')} ${I18nService.t('notLoggedIn')} [L]{/yellow-fg}`;
    if (data.ghUser) {
      ghStatus = `{cyan-fg}${I18nService.t('headerUser')} @${data.ghUser}{/cyan-fg}`;
    }
    if (data.remoteType === 'custom') {
      ghStatus = '{yellow-fg}Custom Remote{/yellow-fg}';
    } else if (data.remoteType === 'gitlab') {
      ghStatus = `{magenta-fg}GitLab{/magenta-fg} ${ghStatus}`;
    }

    const content = `${repoText}   ${I18nService.t('headerBranch')} ${branchBadge}   Sync: ${syncText}   ${ghStatus}`;
    this.box.setContent(content);
  }
}
