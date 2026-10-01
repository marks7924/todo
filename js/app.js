/**
 * app.js \u2014 Application bootstrap and orchestration
 */

const App = (() => {

  let currentView = 'today';

  // -- Navigation -----------------------------------------

  function navigate(view) {
    currentView = view;

    // Deactivate all views
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item[data-view]').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.mobile-nav-item[data-view]').forEach(b => b.classList.remove('active'));

    // Activate target
    const viewEl = document.getElementById(`view-${view === 'project-detail' ? 'project-detail' : view}`);
    if (viewEl) viewEl.classList.add('active');

    const navEl = document.querySelector(`[data-view="${view}"]`);
    if (navEl) navEl.classList.add('active');

    // Mobile nav
    const mobileEl = document.querySelector(`.mobile-nav-item[data-view="${view}"]`);
    if (mobileEl) mobileEl.classList.add('active');

    // Render the view
    renderView(view);
  }

  function renderView(view) {
    switch (view) {
      case 'today':
        UI.renderToday();
        break;
      case 'inbox':
        UI.renderInbox();
        break;
      case 'calendar':
        Calendar.render();
        DrawMode.renderDrawMarks();
        break;
      case 'projects':
        Projects.renderProjectsList();
        break;
      case 'project-detail':
        const projId = Projects.getCurrentProjectId();
        if (projId) Projects.renderProjectDetail(projId);
        break;
      case 'settings':
        Settings.render();
        break;
    }
  }

  function refresh() {
    // Re-render current view
    renderView(currentView);
    UI.updateSidebar();
    // Re-render details if open
    if (document.getElementById('app').classList.contains('details-open')) {
      UI.renderDetails();
    }
  }

  // -- Event bindings -------------------------------------

  function bindNav() {
    // Sidebar navigation
    document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
      btn.addEventListener('click', () => navigate(btn.dataset.view));
    });

    // Mobile navigation
    document.querySelectorAll('.mobile-nav-item[data-view]').forEach(btn => {
      btn.addEventListener('click', () => navigate(btn.dataset.view));
    });

    // Sidebar toggle
    document.getElementById('sidebar-toggle').addEventListener('click', () => {
      document.getElementById('app').classList.toggle('sidebar-collapsed');
    });

    // Study Hub cancel button
    document.getElementById('studyhub-cancel-btn')?.addEventListener('click', () => {
      navigate('today');
    });

    // Add task buttons
    document.getElementById('add-task-today').addEventListener('click', () => {
      Tasks.openCreateModal({ date: Utils.todayStr() });
    });
    document.getElementById('add-task-inbox').addEventListener('click', () => {
      Tasks.openCreateModal();
    });
    document.getElementById('mobile-add-btn').addEventListener('click', () => {
      const date = currentView === 'today' ? Utils.todayStr() :
                   currentView === 'calendar' ? Calendar.getSelectedDate() : null;
      Tasks.openCreateModal({ date });
    });

    // Create project button
    document.getElementById('create-project-btn').addEventListener('click', () => {
      Projects.openCreateModal();
    });

    // Back button from project detail
    document.getElementById('back-to-projects').addEventListener('click', () => {
      navigate('projects');
    });

    // Overdue actions
    document.getElementById('move-overdue-all').addEventListener('click', () => {
      const today = Utils.todayStr();
      Store.getOverdueTasks().forEach(t => Store.updateTask(t.id, { plannedDate: today }));
      refresh();
      UI.toast(`Tasks moved to today.`);
    });
    document.getElementById('dismiss-overdue').addEventListener('click', () => {
      document.getElementById('overdue-section').style.display = 'none';
    });
  }

  function bindKeyboard() {
    document.addEventListener('keydown', (e) => {
      // Ignore if typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

      // Ignore if modal is open
      if (document.getElementById('task-modal').classList.contains('open')) {
        if (e.key === 'Escape') Tasks.closeModal();
        return;
      }
      if (document.getElementById('project-modal').classList.contains('open')) {
        if (e.key === 'Escape') Projects.closeModal();
        return;
      }
      if (document.getElementById('event-modal')?.classList.contains('open') ||
          document.getElementById('event-detail-modal')?.classList.contains('open') ||
          document.getElementById('recur-scope-modal')?.classList.contains('open')) {
        if (e.key === 'Escape') Events.closeAllModals();
        return;
      }
      if (document.getElementById('draw-text-modal')?.classList.contains('open')) {
        if (e.key === 'Escape') { document.getElementById('draw-text-close').click(); }
        return;
      }
      if (document.getElementById('search-overlay').classList.contains('open')) {
        if (e.key === 'Escape') Search.close();
        return;
      }
      if (document.getElementById('shortcuts-panel').classList.contains('open')) {
        if (e.key === 'Escape') UI.closeShortcuts();
        return;
      }

      switch (e.key) {
        case 'n': case 'N':
          e.preventDefault();
          Tasks.openCreateModal({ date: currentView === 'today' ? Utils.todayStr() : null });
          break;
        case '/':
          e.preventDefault();
          Search.open();
          break;
        case 't': case 'T':
          navigate('today');
          break;
        case 'c': case 'C':
          navigate('calendar');
          break;
        case 'p': case 'P':
          navigate('projects');
          break;
        case 'i': case 'I':
          navigate('inbox');
          break;
        case 'Escape':
          UI.closeDetails();
          break;
        case '?':
          UI.openShortcuts();
          break;
      }
    });
  }

  // -- Passcode Auth --------------------------------------

  const PASSCODE = '7924';

  function checkAuth() {
    const overlay = document.getElementById('auth-lock-overlay');
    if (!overlay) return;

    const isAuthed = localStorage.getItem('planner_authenticated') === 'true';
    if (isAuthed) {
      overlay.classList.add('unlocked');
      overlay.style.display = 'none';
      return;
    }

    overlay.style.display = 'flex';
    overlay.classList.remove('unlocked');

    const form = document.getElementById('auth-lock-form');
    const input = document.getElementById('auth-pin-input');
    const errorEl = document.getElementById('auth-lock-error');
    const card = overlay.querySelector('.auth-lock-card');

    setTimeout(() => input?.focus(), 150);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = input.value.trim();
      if (val === PASSCODE) {
        localStorage.setItem('planner_authenticated', 'true');
        overlay.classList.add('unlocked');
        setTimeout(() => { overlay.style.display = 'none'; }, 300);
        UI.toast('Access Granted');
      } else {
        errorEl.style.display = 'block';
        card.classList.add('shake');
        setTimeout(() => card.classList.remove('shake'), 450);
        input.value = '';
        input.focus();
      }
    });
  }

  // -- Init -----------------------------------------------

  function init() {
    // Load persisted data
    Store.load();

    // Seed demo data on first launch
    SeedData.initIfNeeded();

    // Check passcode auth
    checkAuth();

    // Init theme
    Settings.initTheme();

    // Init modals
    Tasks.initModal();
    Projects.initModal();
    Events.initModal();
    UI.initShortcuts();

    // Init search
    Search.init();
    Calendar.init();
    DrawMode.init();

    // Bind navigation and events
    bindNav();
    bindKeyboard();

    // Initial render
    UI.updateSidebar();
    navigate('today');
  }

  // Expose
  return { init, navigate, refresh };
})();

// -- Boot ------------------------------------------------

document.addEventListener('DOMContentLoaded', () => App.init());
