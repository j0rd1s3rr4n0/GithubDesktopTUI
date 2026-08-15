import fs from 'fs';
import os from 'os';
import path from 'path';

const CONFIG_PATH = path.join(os.homedir(), '.gitu_config.json');

export class RemoteConfig {
  static defaults() {
    return {
      remoteType: 'github', // 'github' | 'gitlab' | 'custom'
      gitlabHost: 'gitlab.com',
      customRemoteUrl: ''
    };
  }

  static load() {
    const d = this.defaults();
    try {
      if (fs.existsSync(CONFIG_PATH)) {
        const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
        if (cfg.remoteType === 'gitlab' || cfg.remoteType === 'custom' || cfg.remoteType === 'github') {
          d.remoteType = cfg.remoteType;
        }
        if (typeof cfg.gitlabHost === 'string' && cfg.gitlabHost.trim()) {
          d.gitlabHost = cfg.gitlabHost.trim();
        }
        if (typeof cfg.customRemoteUrl === 'string') {
          d.customRemoteUrl = cfg.customRemoteUrl.trim();
        }
      }
    } catch {}
    return d;
  }

  static save(cfg) {
    try {
      const data = {
        remoteType: cfg.remoteType || 'github',
        gitlabHost: cfg.gitlabHost || 'gitlab.com',
        customRemoteUrl: cfg.customRemoteUrl || ''
      };
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch {
      return false;
    }
  }
}