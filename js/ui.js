/**
 * ui.js \u2014 UI rendering: Today, Inbox, Details panel, Sidebar, Toasts
 */

const UI = (() => {

  let detailsTaskId = null;
  let detailsIsRec = false;
  let detailsDateStr = null;

  // -- Toast ----------------------------------------------

  function toast(message, duration = 2200) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    // Cap visible toasts to max 3
    while (container.children.length >= 3) {
      container.firstElementChild.remove();
    }

    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = message;

    let removed = false;
    function dismiss() {
      if (removed) return;
      removed = true;
      el.classList.add('fade-out');
      const cleanUp = () => { if (el.parentNode) el.remove(); };
      el.addEventListener('animationend', cleanUp, { once: true });
      setTimeout(cleanUp, 350);
    }

    el.addEventListener('click', dismiss);
    container.appendChild(el);

    setTimeout(dismiss, duration);
  }

  // -- Sidebar --------------------------------------------

  function updateSidebar() {
    // Badge: today
    const today = Utils.todayStr();
    const todayTasks = Store.getTasksForDate(today).filter(t => t.status !== 'completed');
    const todayRecs = Store.getRecurrencesForDate(today).filter(r => !r.completions?.[today]);
    const todayCount = todayTasks.length + todayRecs.length;
    const tb = document.getElementById('today-badge');
    tb.textContent = todayCount > 0 ? todayCount : '';

    // Badge: inbox
    const ib = document.getElementById('inbox-badge');
    const inboxCount = Store.getInboxTasks().length;
    ib.textContent = inboxCount > 0 ? inboxCount : '';

    // Recent projects
    const list = document.getElementById('recent-projects-list');
    list.innerHTML = '';
    const projects = Store.getProjects().slice(0, 5);
    projects.forEach(proj => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.className = 'nav-item';
      btn.innerHTML = `<span class="project-dot"></span><span>${Utils.sanitizeHTML(proj.name)}</span>`;
      btn.addEventListener('click', () => Projects.openProjectDetail(proj.id));
      li.appendChild(btn);
      list.appendChild(li);
    });
  }

  // -- Today page -----------------------------------------

  function renderToday() {
    const today = Utils.todayStr();
    const now = new Date();

    // Date heading
    document.getElementById('today-date-heading').textContent =
      now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    // Greeting
    document.getElementById('today-greeting').textContent = Utils.greeting();

    // Overdue
    renderOverdue();

    // Today tasks
    const tasks = Store.getTasksForDate(today);
    const recs = Store.getRecurrencesForDate(today);

    const important = tasks.filter(t => t.priority === 'important' && t.status !== 'completed');
    const normal = tasks.filter(t => t.priority !== 'important' && t.status !== 'completed');
    const completed = tasks.filter(t => t.status === 'completed');

    // Recurring \u2014 split by completion
    const activeRecs = recs.filter(r => !r.completions?.[today]);
    const completedRecs = recs.filter(r => r.completions?.[today]);

    const totalCount = tasks.length + recs.length;
    const completedCount = completed.length + completedRecs.length;

    // Section label
    const countLabel = document.getElementById('today-section-label');
    countLabel.textContent = 'Today';

    // Task count label
    const taskCountLabel = document.getElementById('today-task-count');
    if (totalCount > 0) {
      // Estimate total time
      const totalMin = [...tasks, ...recs].reduce((acc, t) => acc + (t.estimatedMinutes || 0), 0);
      let countText = `${totalCount} task${totalCount !== 1 ? 's' : ''}`;
      if (totalMin > 0) countText += ` \u00b7 ~${Utils.formatDuration(totalMin)}`;
      taskCountLabel.textContent = countText;
    } else {
      taskCountLabel.textContent = '';
    }

    // Important group
    const importantGroup = document.getElementById('important-group');
    const importantList = document.getElementById('important-list');
    importantList.innerHTML = '';
    if (important.length) {
      importantGroup.style.display = 'block';
      important.forEach(t => importantList.appendChild(Tasks.buildTaskRow(t, { showProject: true })));
    } else {
      importantGroup.style.display = 'none';
    }

    // Normal tasks + active recurrences
    const todayList = document.getElementById('today-list');
    todayList.innerHTML = '';
    normal.forEach(t => todayList.appendChild(Tasks.buildTaskRow(t, { showProject: true })));
    activeRecs.forEach(r => todayList.appendChild(Tasks.buildRecurrenceRow(r, today)));

    // Empty state
    const todayEmpty = document.getElementById('today-empty');
    const hasActive = important.length + normal.length + activeRecs.length;
    todayEmpty.style.display = hasActive === 0 && completedCount === 0 ? 'block' : 'none';

    // Completed group
    const completedGroup = document.getElementById('completed-group');
    const completedList = document.getElementById('completed-list');
    const completedCountLabel = document.getElementById('completed-count-label');
    completedList.innerHTML = '';
    if (completedCount > 0) {
      completedGroup.style.display = 'block';
      completedCountLabel.textContent = completedCount;
      completed.forEach(t => completedList.appendChild(Tasks.buildTaskRow(t, { showProject: true })));
      completedRecs.forEach(r => completedList.appendChild(Tasks.buildRecurrenceRow(r, today)));
    } else {
      completedGroup.style.display = 'none';
    }

    // Completed toggle
    const toggle = document.getElementById('completed-toggle');
    toggle.onclick = () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', !expanded);
      completedList.style.display = !expanded ? 'flex' : 'none';
    };

    // Progress bar
    const footer = document.getElementById('today-footer');
    const progressText = document.getElementById('progress-text');
    const fill = document.getElementById('progress-bar-fill');
    const wrap = document.getElementById('progress-bar-wrap');

    if (totalCount > 0) {
      footer.style.display = 'block';
      const pct = Math.round((completedCount / totalCount) * 100);
      progressText.textContent = completedCount === totalCount
        ? `All done. ${completedCount} of ${totalCount} completed.`
        : `${completedCount} of ${totalCount} completed`;
      fill.style.width = pct + '%';
      wrap.setAttribute('aria-valuenow', pct);
    } else {
      footer.style.display = 'none';
    }

    // Streak
    renderStreak();

    // Plan my day (chronological)
    renderPlanSection(tasks, recs, today);
  }

  function renderOverdue() {
    const overdueTasks = Store.getOverdueTasks();
    const section = document.getElementById('overdue-section');
    const list = document.getElementById('overdue-list');

    if (!overdueTasks.length) {
      section.style.display = 'none';
      return;
    }
    section.style.display = 'block';
    list.innerHTML = '';
    overdueTasks.forEach(t => {
      const row = Tasks.buildTaskRow(t, { showDate: true, showProject: true });
      list.appendChild(row);
    });
  }

  function renderStreak() {
    const footer = document.getElementById('today-footer');
    if (!footer) return;

    let streakEl = document.getElementById('streak-bar');
    if (!streakEl) {
      streakEl = document.createElement('div');
      streakEl.className = 'streak-bar';
      streakEl.id = 'streak-bar';
      footer.appendChild(streakEl);
    }

    const { days, streak } = Store.getStreakData();
    streakEl.innerHTML = `
      <span class="streak-label">This week</span>
      ${days.map(d => `
        <div class="streak-dot${d.done ? ' done' : ''}" title="${d.dateStr}">
          <span class="day-abbr">${d.abbr}</span>
        </div>
      `).join('')}
      ${streak > 0 ? `<span class="streak-count">${streak}d streak</span>` : ''}
    `;
  }

  function renderPlanSection(tasks, recs, today) {
    // Remove existing plan section
    let planSection = document.getElementById('plan-section');
    if (planSection) planSection.remove();

    // Collect timed tasks
    const timed = [
      ...tasks.filter(t => t.time && t.status !== 'completed'),
      ...recs.filter(r => r.time && !r.completions?.[today]).map(r => ({ ...r, _isRec: true }))
    ];
    if (timed.length < 2) return;

    timed.sort((a, b) => (a.time || '').localeCompare(b.time || ''));

    const main = document.getElementById('view-today').querySelector('.view-inner');
    planSection = document.createElement('div');
    planSection.id = 'plan-section';
    planSection.className = 'plan-section';

    const planHeader = document.createElement('div');
    planHeader.className = 'plan-section-header';
    planHeader.innerHTML = `<div class="section-label">Daily plan</div>`;
    planSection.appendChild(planHeader);

    const timeline = document.createElement('div');
    timeline.className = 'plan-timeline';

    timed.forEach((task, i) => {
      const slot = document.createElement('div');
      slot.className = 'plan-slot';
      slot.innerHTML = `
        <div class="plan-time">${Utils.formatTime(task.time)}</div>
        <div class="plan-slot-content">
          <div class="plan-slot-title">${Utils.sanitizeHTML(task.title)}</div>
          ${task.estimatedMinutes ? `<div class="plan-slot-duration">${Utils.formatDuration(task.estimatedMinutes)}</div>` : ''}
        </div>
      `;

      // Add break if gap > 1.5h
      if (i < timed.length - 1) {
        const [h1, m1] = task.time.split(':').map(Number);
        const [h2, m2] = timed[i+1].time.split(':').map(Number);
        const gap = (h2 * 60 + m2) - (h1 * 60 + m1) - (task.estimatedMinutes || 0);
        if (gap >= 90) {
          const breakSlot = document.createElement('div');
          breakSlot.className = 'plan-slot';
          breakSlot.innerHTML = `<div class="plan-time"></div><div class="plan-break">Break</div>`;
          timeline.appendChild(slot);
          timeline.appendChild(breakSlot);
          return;
        }
      }
      timeline.appendChild(slot);
    });

    planSection.appendChild(timeline);
    main.appendChild(planSection);
  }

  // -- Inbox ----------------------------------------------

  function renderInbox() {
    const list = document.getElementById('inbox-list');
    const empty = document.getElementById('inbox-empty');
    const tasks = Store.getInboxTasks();

    list.innerHTML = '';
    if (!tasks.length) {
      empty.style.display = 'block';
    } else {
      empty.style.display = 'none';
      tasks.forEach(t => list.appendChild(Tasks.buildTaskRow(t, { showDate: false, showProject: true })));
    }
  }

  // -- Details panel --------------------------------------

  function openDetails(taskId, isRec = false, dateStr = null) {
    detailsTaskId = taskId;
    detailsIsRec = isRec;
    detailsDateStr = dateStr || Utils.todayStr();

    document.getElementById('app').classList.add('details-open');
    document.getElementById('details-panel').removeAttribute('aria-hidden');
    renderDetails();
  }

  function closeDetails() {
    detailsTaskId = null;
    detailsIsRec = false;
    document.getElementById('app').classList.remove('details-open');
    document.getElementById('details-panel').setAttribute('aria-hidden', 'true');
    document.getElementById('details-inner').innerHTML = '';
  }

  function renderDetails() {
    if (!detailsTaskId) return;
    const inner = document.getElementById('details-inner');
    inner.innerHTML = '';

    if (detailsIsRec) {
      renderRecurrenceDetails(inner);
      return;
    }

    const task = Store.getTask(detailsTaskId);
    if (!task) { closeDetails(); return; }

    const proj = task.projectId ? Store.getProject(task.projectId) : null;

    // Header
    const header = document.createElement('div');
    header.className = 'detail-header';

    const titleWrap = document.createElement('div');
    titleWrap.className = 'detail-title-wrap';

    const titleEl = document.createElement('div');
    titleEl.className = `detail-task-title${task.status === 'completed' ? ' completed-title' : ''}`;
    titleEl.textContent = task.title;
    titleWrap.appendChild(titleEl);

    // Status selector
    const statusRow = document.createElement('div');
    statusRow.className = 'detail-status-row';
    const statusSelector = document.createElement('div');
    statusSelector.className = 'status-selector';
    ['pending','in-progress','completed'].forEach(s => {
      const btn = document.createElement('button');
      btn.className = `status-btn${task.status === s ? ' active-status' : ''}`;
      btn.textContent = s === 'pending' ? 'Not started' : s === 'in-progress' ? 'In progress' : 'Done';
      btn.addEventListener('click', () => {
        Store.updateTask(task.id, {
          status: s,
          completedAt: s === 'completed' ? new Date().toISOString() : null
        });
        App.refresh();
        renderDetails();
      });
      statusSelector.appendChild(btn);
    });
    statusRow.appendChild(statusSelector);
    titleWrap.appendChild(statusRow);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'icon-btn';
    closeBtn.setAttribute('aria-label', 'Close details');
    closeBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`;
    closeBtn.addEventListener('click', closeDetails);

    header.appendChild(titleWrap);
    header.appendChild(closeBtn);
    inner.appendChild(header);

    // Fields
    const fields = document.createElement('div');
    fields.className = 'detail-fields';

    if (task.plannedDate) {
      const isOver = Utils.isOverdue(task.plannedDate) && task.status !== 'completed';
      fields.appendChild(makeField('Due', Utils.formatDisplayDate(task.plannedDate), isOver ? 'danger' : ''));
    }
    if (task.time) {
      fields.appendChild(makeField('Time', Utils.formatTime(task.time)));
    }
    if (task.priority) {
      fields.appendChild(makeField('Priority', task.priority === 'important' ? 'Important' : 'Normal', task.priority === 'important' ? 'accent' : ''));
    }
    if (task.estimatedMinutes) {
      fields.appendChild(makeField('Estimated', Utils.formatDuration(task.estimatedMinutes)));
    }
    if (proj) {
      fields.appendChild(makeField('Project', proj.name));
    }
    if (task.completedAt) {
      const d = new Date(task.completedAt);
      fields.appendChild(makeField('Completed', d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })));
    }
    inner.appendChild(fields);

    // Notes
    const notesSection = document.createElement('div');
    notesSection.className = 'detail-notes';
    const notesLabel = document.createElement('div');
    notesLabel.className = 'detail-notes-label';
    notesLabel.textContent = 'Notes';
    
    const notesInput = document.createElement('textarea');
    notesInput.className = 'form-input form-textarea detail-notes-input';
    notesInput.placeholder = 'Add notes...';
    notesInput.rows = 3;
    notesInput.value = task.notes || '';
    notesInput.style.fontSize = 'var(--text-sm)';
    notesInput.style.marginTop = '6px';
    notesInput.style.resize = 'vertical';

    notesInput.addEventListener('change', () => {
      const updatedNotes = notesInput.value.trim();
      if (!isRecurrence) {
        Store.updateTask(task.id, { notes: updatedNotes });
        UI.toast('Notes saved.');
      }
    });

    notesSection.appendChild(notesLabel);
    notesSection.appendChild(notesInput);
    inner.appendChild(notesSection);

    // Subtasks
    renderSubtasks(inner, task);

    // Actions
    const actionsRow = document.createElement('div');
    actionsRow.className = 'detail-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn-ghost';
    editBtn.style.fontSize = 'var(--text-sm)';
    editBtn.style.padding = '7px 14px';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => Tasks.openEditModal(task.id));

    const moveBtn = document.createElement('button');
    moveBtn.className = 'btn-ghost';
    moveBtn.style.fontSize = 'var(--text-sm)';
    moveBtn.style.padding = '7px 14px';
    moveBtn.textContent = 'Move to today';
    moveBtn.addEventListener('click', () => {
      Store.updateTask(task.id, { plannedDate: Utils.todayStr() });
      App.refresh();
      UI.toast('Task moved to today.');
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-ghost';
    deleteBtn.style.fontSize = 'var(--text-sm)';
    deleteBtn.style.padding = '7px 14px';
    deleteBtn.style.color = 'var(--danger)';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => {
      Tasks.handleDelete(task.id);
    });

    actionsRow.appendChild(editBtn);
    if (task.plannedDate !== Utils.todayStr()) actionsRow.appendChild(moveBtn);
    actionsRow.appendChild(deleteBtn);
    inner.appendChild(actionsRow);
  }

  function renderRecurrenceDetails(inner) {
    const rec = Store.getRecurrences().find(r => r.id === detailsTaskId);
    if (!rec) { closeDetails(); return; }

    const isCompleted = rec.completions?.[detailsDateStr];
    const proj = rec.projectId ? Store.getProject(rec.projectId) : null;

    const header = document.createElement('div');
    header.className = 'detail-header';

    const titleWrap = document.createElement('div');
    titleWrap.className = 'detail-title-wrap';
    const titleEl = document.createElement('div');
    titleEl.className = `detail-task-title${isCompleted ? ' completed-title' : ''}`;
    titleEl.textContent = rec.title;
    titleWrap.appendChild(titleEl);

    const recBadge = document.createElement('div');
    recBadge.className = 'detail-status';
    const freqMap = { daily: 'Every day', weekdays: 'Every weekday', weekly: 'Weekly', custom: 'Custom days' };
    recBadge.textContent = `Recurring \u00b7 ${freqMap[rec.frequency] || rec.frequency}`;
    titleWrap.appendChild(recBadge);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'icon-btn';
    closeBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`;
    closeBtn.addEventListener('click', closeDetails);

    header.appendChild(titleWrap);
    header.appendChild(closeBtn);
    inner.appendChild(header);

    const fields = document.createElement('div');
    fields.className = 'detail-fields';
    if (rec.time) fields.appendChild(makeField('Time', Utils.formatTime(rec.time)));
    if (rec.estimatedMinutes) fields.appendChild(makeField('Estimated', Utils.formatDuration(rec.estimatedMinutes)));
    if (proj) fields.appendChild(makeField('Project', proj.name));
    fields.appendChild(makeField('Starts', Utils.formatDisplayDate(rec.startDate)));
    if (rec.endDate) fields.appendChild(makeField('Ends', Utils.formatDisplayDate(rec.endDate)));
    inner.appendChild(fields);

    if (rec.notes) {
      const notesSection = document.createElement('div');
      notesSection.className = 'detail-notes';
      notesSection.innerHTML = `<div class="detail-notes-label">Notes</div><div class="detail-notes-text">${Utils.sanitizeHTML(rec.notes)}</div>`;
      inner.appendChild(notesSection);
    }

    // Actions
    const actionsRow = document.createElement('div');
    actionsRow.className = 'detail-actions';
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-ghost';
    deleteBtn.style.color = 'var(--danger)';
    deleteBtn.style.fontSize = 'var(--text-sm)';
    deleteBtn.style.padding = '7px 14px';
    deleteBtn.textContent = 'Delete recurring task';
    deleteBtn.addEventListener('click', () => {
      if (confirm('Delete this recurring task entirely?')) {
        Store.deleteRecurrence(rec.id);
        closeDetails();
        App.refresh();
        UI.toast('Recurring task deleted.');
      }
    });
    actionsRow.appendChild(deleteBtn);
    inner.appendChild(actionsRow);
  }

  function renderSubtasks(inner, task) {
    const section = document.createElement('div');
    section.className = 'detail-subtasks';

    const header = document.createElement('div');
    header.className = 'detail-subtasks-header';

    const label = document.createElement('div');
    label.className = 'detail-subtasks-label';
    label.textContent = 'Subtasks';

    const subtasks = task.subtasks || [];
    const doneCount = subtasks.filter(s => s.completed).length;
    const progressText = document.createElement('span');
    progressText.className = 'subtask-progress-text';
    if (subtasks.length > 0) progressText.textContent = `${doneCount} / ${subtasks.length}`;

    header.appendChild(label);
    header.appendChild(progressText);
    section.appendChild(header);

    // Progress bar
    if (subtasks.length > 0) {
      const pct = Math.round((doneCount / subtasks.length) * 100);
      const bar = document.createElement('div');
      bar.className = 'subtask-progress-bar progress-bar-wrap';
      bar.innerHTML = `<div class="progress-bar-fill" style="width:${pct}%"></div>`;
      section.appendChild(bar);
    }

    // List
    const list = document.createElement('div');
    list.className = 'subtask-list';
    subtasks.forEach(sub => {
      const item = document.createElement('div');
      item.className = 'subtask-item';

      const check = document.createElement('button');
      check.className = `subtask-check${sub.completed ? ' done' : ''}`;
      check.setAttribute('role', 'checkbox');
      check.setAttribute('aria-checked', sub.completed ? 'true' : 'false');
      check.setAttribute('aria-label', sub.completed ? 'Mark incomplete' : 'Mark complete');
      check.addEventListener('click', () => {
        Store.toggleSubtask(task.id, sub.id);
        App.refresh();
        renderDetails();
      });

      const titleEl = document.createElement('span');
      titleEl.className = `subtask-title${sub.completed ? ' done-text' : ''}`;
      titleEl.textContent = sub.title;

      const delBtn = document.createElement('button');
      delBtn.className = 'subtask-delete-btn';
      delBtn.setAttribute('aria-label', 'Delete subtask');
      delBtn.innerHTML = `<svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1.5 1.5l8 8M9.5 1.5l-8 8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`;
      delBtn.addEventListener('click', () => {
        Store.deleteSubtask(task.id, sub.id);
        App.refresh();
        renderDetails();
      });

      item.appendChild(check);
      item.appendChild(titleEl);
      item.appendChild(delBtn);
      list.appendChild(item);
    });
    section.appendChild(list);

    // Add subtask input
    const addWrap = document.createElement('div');
    addWrap.className = 'add-subtask-input-wrap';
    const addInput = document.createElement('input');
    addInput.type = 'text';
    addInput.className = 'add-subtask-input';
    addInput.placeholder = 'Add subtask...';
    addInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = addInput.value.trim();
        if (val) {
          Store.addSubtask(task.id, val);
          App.refresh();
          renderDetails();
        }
      }
    });
    addWrap.appendChild(addInput);
    section.appendChild(addWrap);

    inner.appendChild(section);
  }

  function makeField(label, value, cls = '') {
    const f = document.createElement('div');
    f.className = 'detail-field';
    f.innerHTML = `
      <div class="detail-field-label">${Utils.sanitizeHTML(label)}</div>
      <div class="detail-field-value${cls ? ' ' + cls : ''}">${Utils.sanitizeHTML(String(value))}</div>
    `;
    return f;
  }

  // -- Shortcuts ------------------------------------------

  function openShortcuts() {
    const panel = document.getElementById('shortcuts-panel');
    panel.classList.add('open');
    panel.removeAttribute('aria-hidden');
    document.getElementById('shortcuts-close').focus();
  }

  function closeShortcuts() {
    const panel = document.getElementById('shortcuts-panel');
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
  }

  function initShortcuts() {
    document.getElementById('shortcuts-close').addEventListener('click', closeShortcuts);
    document.getElementById('shortcuts-panel').addEventListener('click', e => {
      if (e.target === e.currentTarget) closeShortcuts();
    });
  }

  return {
    toast,
    updateSidebar,
    renderToday,
    renderInbox,
    openDetails,
    closeDetails,
    renderDetails,
    openShortcuts,
    closeShortcuts,
    initShortcuts,
  };
})();
