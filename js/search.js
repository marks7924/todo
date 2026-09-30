/**
 * search.js \u2014 Search overlay
 */

const Search = (() => {

  let isOpen = false;

  function open() {
    const overlay = document.getElementById('search-overlay');
    overlay.classList.add('open');
    overlay.removeAttribute('aria-hidden');
    document.getElementById('search-input').value = '';
    document.getElementById('search-results').innerHTML = '';
    document.getElementById('search-input').focus();
    isOpen = true;
  }

  function close() {
    const overlay = document.getElementById('search-overlay');
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    isOpen = false;
  }

  function toggle() {
    if (isOpen) close();
    else open();
  }

  function search(query) {
    const q = query.trim().toLowerCase();
    const results = document.getElementById('search-results');
    results.innerHTML = '';

    if (!q) return;

    const tasks = Store.getTasks().filter(t =>
      t.title.toLowerCase().includes(q) ||
      (t.notes && t.notes.toLowerCase().includes(q))
    );

    const recs = Store.getRecurrences().filter(r =>
      r.title.toLowerCase().includes(q)
    );

    if (!tasks.length && !recs.length) {
      results.innerHTML = `<div class="search-no-results">No results for "${Utils.sanitizeHTML(query)}"</div>`;
      return;
    }

    const pattern = new RegExp(Utils.escapeRegExp(q), 'gi');

    tasks.slice(0, 10).forEach(task => {
      const item = document.createElement('li');
      item.className = 'search-result-item';
      item.setAttribute('role', 'option');

      const highlightedTitle = task.title.replace(pattern, m => `<mark>${m}</mark>`);
      const proj = task.projectId ? Store.getProject(task.projectId) : null;

      item.innerHTML = `
        <div class="search-result-title">${highlightedTitle}</div>
        <div class="search-result-meta">
          ${task.plannedDate ? Utils.formatDisplayDate(task.plannedDate) : 'Inbox'}
          ${proj ? ' \u00b7 ' + Utils.sanitizeHTML(proj.name) : ''}
        </div>
      `;
      item.addEventListener('click', () => {
        close();
        UI.openDetails(task.id);
        // Navigate to correct view
        if (task.plannedDate === Utils.todayStr()) App.navigate('today');
        else if (!task.plannedDate) App.navigate('inbox');
        else App.navigate('calendar');
      });
      results.appendChild(item);
    });

    recs.slice(0, 5).forEach(rec => {
      const item = document.createElement('li');
      item.className = 'search-result-item';
      item.setAttribute('role', 'option');
      const highlightedTitle = rec.title.replace(pattern, m => `<mark>${m}</mark>`);
      item.innerHTML = `
        <div class="search-result-title">${highlightedTitle}</div>
        <div class="search-result-meta">Recurring</div>
      `;
      results.appendChild(item);
    });
  }

  function init() {
    const input = document.getElementById('search-input');
    input.addEventListener('input', Utils.debounce(() => search(input.value), 180));

    document.getElementById('search-overlay').addEventListener('click', e => {
      if (e.target === e.currentTarget) close();
    });
  }

  return { open, close, toggle, init };
})();
