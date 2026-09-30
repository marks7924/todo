/**
 * settings.js \u2014 Settings view renderer
 */

const Settings = (() => {

  function render() {
    const body = document.getElementById('settings-body');
    const settings = Store.getSettings();
    body.innerHTML = '';

    // -- Appearance ------------------------------------------
    const appearGroup = makeGroup('Appearance');

    const themeRow = makeRow('Theme', '');
    const themeOptions = document.createElement('div');
    themeOptions.className = 'theme-options settings-row-control';
    ['dark','light','system'].forEach(val => {
      const btn = document.createElement('button');
      btn.className = `theme-option${settings.theme === val ? ' active' : ''}`;
      btn.textContent = val.charAt(0).toUpperCase() + val.slice(1);
      btn.addEventListener('click', () => {
        Store.updateSettings({ theme: val });
        applyTheme(val);
        render(); // re-render to update active
      });
      themeOptions.appendChild(btn);
    });
    themeRow.querySelector('.settings-row-control').replaceWith(themeOptions);
    appearGroup.appendChild(themeRow);

    const weekRow = makeRow('Week starts on', 'First day of calendar week');
    const weekSelect = document.createElement('select');
    weekSelect.className = 'settings-select settings-row-control';
    [['Monday','1'],['Sunday','0']].forEach(([label, val]) => {
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = label;
      if (String(settings.weekStartsOn) === val) opt.selected = true;
      weekSelect.appendChild(opt);
    });
    weekSelect.addEventListener('change', () => {
      Store.updateSettings({ weekStartsOn: Number(weekSelect.value) });
    });
    weekRow.querySelector('.settings-row-control').replaceWith(weekSelect);
    appearGroup.appendChild(weekRow);

    body.appendChild(appearGroup);

    // -- Data ------------------------------------------------
    const dataGroup = makeGroup('Data');

    const exportRow = makeRow('Export data', 'Download a JSON backup of all your data');
    const exportBtn = document.createElement('button');
    exportBtn.className = 'text-btn settings-row-control';
    exportBtn.textContent = 'Export JSON';
    exportBtn.addEventListener('click', () => {
      const json = Store.exportData();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `planner-backup-${Utils.todayStr()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      UI.toast('Data exported.');
    });
    exportRow.querySelector('.settings-row-control').replaceWith(exportBtn);
    dataGroup.appendChild(exportRow);

    const importRow = makeRow('Import data', 'Restore from a JSON backup file');
    const importBtn = document.createElement('button');
    importBtn.className = 'text-btn settings-row-control';
    importBtn.textContent = 'Import JSON';
    importBtn.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.addEventListener('change', () => {
        const file = input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
          const ok = Store.importData(e.target.result);
          if (ok) {
            UI.toast('Data imported successfully.');
            App.refresh();
          } else {
            UI.toast('Import failed: invalid file.');
          }
        };
        reader.readAsText(file);
      });
      input.click();
    });
    importRow.querySelector('.settings-row-control').replaceWith(importBtn);
    dataGroup.appendChild(importRow);

    const clearCompRow = makeRow('Clear completed tasks', 'Remove all completed tasks permanently');
    const clearCompBtn = document.createElement('button');
    clearCompBtn.className = 'settings-danger-btn settings-row-control';
    clearCompBtn.textContent = 'Clear completed';
    clearCompBtn.addEventListener('click', () => {
      if (confirm('Delete all completed tasks permanently?')) {
        Store.clearCompleted();
        App.refresh();
        UI.toast('Completed tasks cleared.');
      }
    });
    clearCompRow.querySelector('.settings-row-control').replaceWith(clearCompBtn);
    dataGroup.appendChild(clearCompRow);

    const clearAllRow = makeRow('Clear all data', 'Delete all tasks and projects');
    const clearAllBtn = document.createElement('button');
    clearAllBtn.className = 'settings-danger-btn settings-row-control';
    clearAllBtn.textContent = 'Clear all data';
    clearAllBtn.addEventListener('click', () => {
      if (confirm('This will permanently delete ALL tasks, projects, and recurrences. Are you sure?')) {
        Store.clearAllData();
        App.refresh();
        UI.toast('All data cleared.');
      }
    });
    clearAllRow.querySelector('.settings-row-control').replaceWith(clearAllBtn);
    dataGroup.appendChild(clearAllRow);

    body.appendChild(dataGroup);

    // -- Shortcuts -------------------------------------------
    const shortcutsGroup = makeGroup('Keyboard shortcuts');
    const shortcutsRow = makeRow('View shortcuts', '');
    const shortcutsBtn = document.createElement('button');
    shortcutsBtn.className = 'text-btn settings-row-control';
    shortcutsBtn.textContent = 'Show shortcuts';
    shortcutsBtn.addEventListener('click', () => UI.openShortcuts());
    shortcutsRow.querySelector('.settings-row-control').replaceWith(shortcutsBtn);
    shortcutsGroup.appendChild(shortcutsRow);
    body.appendChild(shortcutsGroup);

    // -- About -----------------------------------------------
    const aboutGroup = makeGroup('About');
    const aboutRow = document.createElement('div');
    aboutRow.className = 'settings-row';
    aboutRow.innerHTML = `
      <div>
        <div class="settings-row-label">Planner</div>
        <div class="settings-row-desc">A calm daily productivity application. Version 1.0</div>
      </div>
    `;
    aboutGroup.appendChild(aboutRow);
    body.appendChild(aboutGroup);
  }

  function makeGroup(title) {
    const g = document.createElement('div');
    g.className = 'settings-group';
    const h = document.createElement('div');
    h.className = 'settings-group-title';
    h.textContent = title;
    g.appendChild(h);
    return g;
  }

  function makeRow(label, desc) {
    const row = document.createElement('div');
    row.className = 'settings-row';
    row.innerHTML = `
      <div>
        <div class="settings-row-label">${Utils.sanitizeHTML(label)}</div>
        ${desc ? `<div class="settings-row-desc">${Utils.sanitizeHTML(desc)}</div>` : ''}
      </div>
      <div class="settings-row-control"></div>
    `;
    return row;
  }

  function applyTheme(theme) {
    const html = document.documentElement;
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      html.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      html.setAttribute('data-theme', theme);
    }
    updateThemeToggle(html.getAttribute('data-theme'));
  }

  function updateThemeToggle(currentTheme) {
    const isDark = currentTheme === 'dark';
    document.getElementById('theme-icon-sun').style.display = isDark ? 'none' : 'block';
    document.getElementById('theme-icon-moon').style.display = isDark ? 'block' : 'none';
    document.getElementById('theme-label').textContent = isDark ? 'Light mode' : 'Dark mode';
  }

  function initTheme() {
    const settings = Store.getSettings();
    applyTheme(settings.theme || 'dark');

    document.getElementById('theme-toggle').addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      Store.updateSettings({ theme: next });
      applyTheme(next);
    });

    // System preference change
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (Store.getSettings().theme === 'system') applyTheme('system');
    });
  }

  return { render, applyTheme, initTheme };
})();
