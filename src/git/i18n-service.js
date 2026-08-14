import { RepoStore } from './repo-store.js';

const translations = {
  en: {
    // Tabs
    tabChanges: '[1] Changes',
    tabHistory: '[2] History',
    tabBranches: '[3] Branches',
    tabStash: '[4] Stash',
    tabGithub: '[5] GitHub',
    tabRepos: '[6] Repositories',
    tabAbout: '[7] About',

    // Bottom hints
    bottomHint: ' Click Tabs or press 1-7 | [?] Help | [F3] Lang: EN | [L] Auth | [S-q] Quit',
    refreshedNotice: 'Refreshed Git & GitHub status',

    // Changes View
    changesLabel: 'Changes & Staging',
    commitPanelLabel: 'Commit Panel',
    summaryLabel: 'Summary:',
    descriptionLabel: 'Description (Optional):',
    commitBtn: ' Commit Changes (Ctrl+Enter) ',
    diffLabel: ' Diff Preview (↑/↓ 1 line | PgUp/PgDn 10 lines) ',
    noLocalChanges: '✓ No local changes',
    noChangesInWorkDir: '(No changes in working directory)',
    summaryRequired: 'Commit summary is required!',
    committedMsg: 'Committed: ',

    // History View
    commitLogLabel: 'Commit Log Timeline',
    commitPatchLabel: 'Commit Patch & Details',
    noCommitsFound: 'No commits found in repository',

    // Branches View
    localBranchesLabel: 'Local Branches',
    remoteBranchesLabel: 'Remote Branches',
    checkoutSuccess: 'Switched to branch: ',

    // Stash View
    stashListLabel: 'Stash List Drawer',
    stashApplied: 'Applied stash successfully',
    stashPopped: 'Popped stash successfully',

    // GitHub View
    prListLabel: 'Pull Requests',
    issuesListLabel: 'Issues',
    reposListLabel: 'Remote Repositories',

    // Repositories View
    reposListLabel: 'Repositories (Select & Enter to Switch)',
    reposDetailLabel: 'Repository Details & Switcher',
    openPathLabel: 'Open Any Folder Path',
    switchRepoBtn: ' [Enter] Switch Repo ',
    openPathBtn: ' Open Path ',

    // About View
    aboutTitle: '🐙 About GitHub Desktop TUI (gd)',
    aboutVersion: 'Version 1.0.0 — Terminal Interface for Git & GitHub CLI',
    aboutAppDesc: 'A modern, feature-packed Terminal User Interface (TUI) for Linux & macOS inspired by GitHub Desktop, powered by Node.js and GitHub CLI (gh).',
    creatorTitle: 'Creator & Lead Developer:',
    creatorName: 'Jordi Serrano (j0rd1s3rr4n0)',
    githubProfile: 'GitHub Profile:',
    featuresTitle: 'Main Features:',
    langLabel: 'Language / Idioma / Idioma:'
  },
  es: {
    // Tabs
    tabChanges: '[1] Cambios',
    tabHistory: '[2] Historial',
    tabBranches: '[3] Ramas',
    tabStash: '[4] Stash',
    tabGithub: '[5] GitHub',
    tabRepos: '[6] Repositorios',
    tabAbout: '[7] Acerca de',

    // Bottom hints
    bottomHint: ' Clic en pestañas o pulsa 1-7 | [?] Ayuda | [F3] Idioma: ES | [L] Auth | [S-q] Salir',
    refreshedNotice: 'Estado de Git y GitHub actualizado',

    // Changes View
    changesLabel: 'Cambios y Staging',
    commitPanelLabel: 'Panel de Commit',
    summaryLabel: 'Resumen:',
    descriptionLabel: 'Descripción (Opcional):',
    commitBtn: ' Confirmar Cambios (Ctrl+Enter) ',
    diffLabel: ' Vista Previa Diff (↑/↓ 1 línea | PgUp/PgDn 10 líneas) ',
    noLocalChanges: '✓ Sin cambios locales',
    noChangesInWorkDir: '(Sin cambios en el directorio de trabajo)',
    summaryRequired: '¡El resumen del commit es obligatorio!',
    committedMsg: 'Commit realizado: ',

    // History View
    commitLogLabel: 'Cronología de Commits',
    commitPatchLabel: 'Detalles del Parche y Diff',
    noCommitsFound: 'No se encontraron commits en el repositorio',

    // Branches View
    localBranchesLabel: 'Ramas Locales',
    remoteBranchesLabel: 'Ramas Remotas',
    checkoutSuccess: 'Cambiado a la rama: ',

    // Stash View
    stashListLabel: 'Cajón de Stashes',
    stashApplied: 'Stash aplicado con éxito',
    stashPopped: 'Stash liberado (pop) con éxito',

    // GitHub View
    prListLabel: 'Pull Requests',
    issuesListLabel: 'Issues',
    reposListLabel: 'Repositorios Remotos',

    // Repositories View
    reposListLabel: 'Repositorios (Selecciona y Enter para Cambiar)',
    reposDetailLabel: 'Detalles del Repositorio y Selector',
    openPathLabel: 'Abrir cualquier carpeta del sistema',
    switchRepoBtn: ' [Enter] Cambiar Repo ',
    openPathBtn: ' Abrir Ruta ',

    // About View
    aboutTitle: '🐙 Acerca de GitHub Desktop TUI (gd)',
    aboutVersion: 'Versión 1.0.0 — Interfaz de Terminal para Git & GitHub CLI',
    aboutAppDesc: 'Una aplicación TUI moderna, ultrarrápida y completa para la terminal, inspirada en GitHub Desktop y potenciada por Git y GitHub CLI (gh).',
    creatorTitle: 'Creador & Desarrollador Principal:',
    creatorName: 'Jordi Serrano (j0rd1s3rr4n0)',
    githubProfile: 'Perfil de GitHub:',
    featuresTitle: 'Características principales:',
    langLabel: 'Idioma / Language / Idioma:'
  },
  ca: {
    // Tabs
    tabChanges: '[1] Canvis',
    tabHistory: '[2] Historial',
    tabBranches: '[3] Branques',
    tabStash: '[4] Stash',
    tabGithub: '[5] GitHub',
    tabRepos: '[6] Repositoris',
    tabAbout: '[7] Sobre',

    // Bottom hints
    bottomHint: ' Clic a pestanyes o prem 1-7 | [?] Ajuda | [F3] Idioma: CA | [L] Auth | [S-q] Sortir',
    refreshedNotice: 'Estat de Git i GitHub actualitzat',

    // Changes View
    changesLabel: 'Canvis i Staging',
    commitPanelLabel: 'Panell de Commit',
    summaryLabel: 'Resum:',
    descriptionLabel: 'Descripció (Opcional):',
    commitBtn: ' Confirmar Canvis (Ctrl+Enter) ',
    diffLabel: ' Vista Prèvia Diff (↑/↓ 1 línia | PgUp/PgDn 10 línies) ',
    noLocalChanges: '✓ Sense canvis locals',
    noChangesInWorkDir: '(Sense canvis al directori de treball)',
    summaryRequired: 'El resum del commit és obligatori!',
    committedMsg: 'Commit realitzat: ',

    // History View
    commitLogLabel: 'Cronologia de Commits',
    commitPatchLabel: 'Detalls del Patró i Diff',
    noCommitsFound: 'No s\'han trobat commits al repositori',

    // Branches View
    localBranchesLabel: 'Branques Locals',
    remoteBranchesLabel: 'Branques Remotes',
    checkoutSuccess: 'Canviat a la branca: ',

    // Stash View
    stashListLabel: 'Caixó de Stashes',
    stashApplied: 'Stash aplicat amb èxit',
    stashPopped: 'Stash alliberat (pop) amb èxit',

    // GitHub View
    prListLabel: 'Pull Requests',
    issuesListLabel: 'Issues',
    reposListLabel: 'Repositoris Remots',

    // Repositories View
    reposListLabel: 'Repositoris (Selecciona i Enter per Canviar)',
    reposDetailLabel: 'Detalls del Repositori i Selector',
    openPathLabel: 'Obrir qualsevol carpeta del sistema',
    switchRepoBtn: ' [Enter] Canviar Repo ',
    openPathBtn: ' Obrir Ruta ',

    // About View
    aboutTitle: '🐙 Sobre GitHub Desktop TUI (gd)',
    aboutVersion: 'Versió 1.0.0 — Interfície de Terminal per a Git & GitHub CLI',
    aboutAppDesc: 'Una aplicació TUI moderna, ultraràpida i completa per a la terminal, inspirada en GitHub Desktop i impulsada per Git i GitHub CLI (gh).',
    creatorTitle: 'Creador & Desenvolupador Principal:',
    creatorName: 'Jordi Serrano (j0rd1s3rr4n0)',
    githubProfile: 'Perfil de GitHub:',
    featuresTitle: 'Característiques principals:',
    langLabel: 'Idioma / Language / Idioma:'
  }
};

export class I18nService {
  static getLanguage() {
    const data = RepoStore.load();
    return data.language || 'en'; // Default is English!
  }

  static setLanguage(lang) {
    const data = RepoStore.load();
    data.language = lang;
    RepoStore.save(data);
  }

  static cycleLanguage() {
    const current = this.getLanguage();
    const order = ['en', 'es', 'ca'];
    const nextIdx = (order.indexOf(current) + 1) % order.length;
    const nextLang = order[nextIdx];
    this.setLanguage(nextLang);
    return nextLang;
  }

  static t(key) {
    const lang = this.getLanguage();
    const dict = translations[lang] || translations.en;
    return dict[key] || translations.en[key] || key;
  }
}
