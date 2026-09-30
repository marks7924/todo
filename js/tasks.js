/**
 * tasks.js \u2014 Task rendering and task modal management
 */

const Tasks = (() => {

  // -- Task row builder -----------------------------------

  function buildTaskRow(task, opts = {}) {
    // opts: { showDate, showProject, isRecurrence, dateStr }
    const { showDate = false, showProject = true, isRecurrence = false, dateStr } = opts;

    const row = document.createElement('li');
    row.className = `task-row${task.status === 'completed' ? ' completed' : ''}`;
    row.dataset.id = task.id;
    row.dataset.recurrence = isRecurrence ? '1' : '0';
    if (isRecurrence) row.dataset.dateStr = dateStr;
    row.setAttribute('draggable', !isRecurrence);
    row.setAttribute('role', 'listitem');
    row.setAttribute('tabindex', '0');

    // Checkbox
    const check = document.createElement('button');
    check.className = `task-check${task.status === 'completed' ? ' done' : task.status === 'in-progress' ? ' in-progress' : ''}`;
    check.setAttribute('aria-label', task.status === 'completed' ? 'Mark incomplete' : 'Mark complete');
    check.setAttribute('role', 'checkbox');
    check.setAttribute('aria-checked', task.status === 'completed' ? 'true' : 'false');
    check.addEventListener('click', (e) => {
      e.stopPropagation();
      handleComplete(task.id, isRecurrence, dateStr, row, check);
    });

    // Body
    const body = document.createElement('div');
    body.className = 'task-body';

    const title = document.createElement('span');
    title.className = 'task-title';
    title.textContent = task.title;

    body.appendChild(title);

    // Meta
    const meta = document.createElement('div');
    meta.className = 'task-meta';

    // Subtask preview
    if (task.subtasks && task.subtasks.length > 0) {
      const done = task.subtasks.filter(s => s.completed).length;
      const preview = document.createElement('span');
      preview.className = 'task-subtask-preview';
      preview.textContent = `${done}/${task.subtasks.length}`;
      meta.appendChild(preview);
    }

    // Duration
    if (task.estimatedMinutes) {
      const dur = document.createElement('span');
      dur.className = 'task-duration';
      dur.textContent = Utils.formatDuration(task.estimatedMinutes);
      meta.appendChild(dur);
    }

    // Date (if showDate)
    if (showDate && task.plannedDate) {
      const dateEl = document.createElement('span');
      dateEl.className = `task-time${Utils.isOverdue(task.plannedDate) && task.status !== 'completed' ? ' overdue' : ''}`;
      dateEl.textContent = Utils.formatDisplayDate(task.plannedDate);
      meta.appendChild(dateEl);
    }

    // Time
    if (task.time) {
      const timeEl = document.createElement('span');
      timeEl.className = 'task-time';
      timeEl.textContent = Utils.formatTime(task.time);
      meta.appendChild(timeEl);
    }

    // Priority dot
    if (task.priority === 'important') {
      const dot = document.createElement('span');
      dot.className = 'task-priority-dot';
      dot.setAttribute('aria-label', 'Important');
      dot.title = 'Important';
      meta.appendChild(dot);
    }

    // Project tag
    if (showProject && task.projectId) {
      const proj = Store.getProject(task.projectId);
      if (proj) {
        const tag = document.createElement('span');
        tag.className = 'task-project-tag';
        tag.textContent = proj.name;
        meta.appendChild(tag);
      }
    }

    body.appendChild(meta);

    // Actions (hover)
    const actions = document.createElement('div');
    actions.className = 'task-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'task-action-btn';
    editBtn.setAttribute('aria-label', 'Edit task');
    editBtn.title = 'Edit';
    editBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M9.5 2L11 3.5 4 10.5H2.5V9L9.5 2z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>`;
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openEditModal(task.id);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'task-action-btn danger';
    deleteBtn.setAttribute('aria-label', 'Delete task');
    deleteBtn.title = 'Delete';
    deleteBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 3.5h9M4.5 3.5V2.5h4v1M5 5.5v4M8 5.5v4M3 3.5l.5 7h6l.5-7" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleDelete(task.id);
    });

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    row.appendChild(check);
    row.appendChild(body);
    row.appendChild(actions);

    // Click to open details
    row.addEventListener('click', () => {
      UI.openDetails(task.id, isRecurrence, dateStr);
    });

    // Keyboard
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (e.key === ' ') {
          handleComplete(task.id, isRecurrence, dateStr, row, check);
        } else {
          UI.openDetails(task.id, isRecurrence, dateStr);
        }
      }
    });

    // Drag
    if (!isRecurrence) {
      row.addEventListener('dragstart', onDragStart);
      row.addEventListener('dragover', onDragOver);
      row.addEventListener('dragleave', onDragLeave);
      row.addEventListener('drop', onDrop);
      row.addEventListener('dragend', onDragEnd);
    }

    return row;
  }

  function buildRecurrenceRow(rec, dateStr) {
    const isCompleted = rec.completions && rec.completions[dateStr];
    const fakeTask = {
      id: rec.id,
      title: rec.title,
      status: isCompleted ? 'completed' : 'pending',
      priority: rec.priority,
      time: rec.time,
      estimatedMinutes: rec.estimatedMinutes,
      projectId: rec.projectId,
      subtasks: [],
    };
    return buildTaskRow(fakeTask, { isRecurrence: true, dateStr });
  }

  // -- Complete handler -----------------------------------

  function handleComplete(taskId, isRecurrence, dateStr, rowEl, checkEl) {
    checkEl.classList.add('completing');
    setTimeout(() => checkEl.classList.remove('completing'), 220);

    if (isRecurrence) {
      Store.toggleRecurrenceCompletion(taskId, dateStr);
    } else {
      Store.completeTask(taskId);
    }
    App.refresh();
  }

  function handleDelete(taskId) {
    Store.deleteTask(taskId);
    UI.closeDetails();
    App.refresh();
    UI.toast('Task deleted.');
  }

  // -- Drag and drop --------------------------------------

  let dragId = null;

  function onDragStart(e) {
    dragId = e.currentTarget.dataset.id;
    e.currentTarget.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  }
  function onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('drag-over');
  }
  function onDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
  }
  function onDrop(e) {
    e.preventDefault();
    const targetRow = e.currentTarget;
    targetRow.classList.remove('drag-over');
    const targetId = targetRow.dataset.id;
    if (dragId && dragId !== targetId) {
      // Swap plannedDates
      const dragTask = Store.getTask(dragId);
      const targetTask = Store.getTask(targetId);
      if (dragTask && targetTask) {
        const dragDate = dragTask.plannedDate;
        Store.updateTask(dragId, { plannedDate: targetTask.plannedDate });
        Store.updateTask(targetId, { plannedDate: dragDate });
        App.refresh();
        UI.toast('Task moved.');
      }
    }
  }
  function onDragEnd(e) {
    e.currentTarget.classList.remove('dragging');
    dragId = null;
  }

  // -- Modal ----------------------------------------------

  let editingTaskId = null;
  let defaultDate = null;
  let defaultProjectId = null;

  function openCreateModal(opts = {}) {
    editingTaskId = null;
    defaultDate = opts.date || null;
    defaultProjectId = opts.projectId || null;

    const modal = document.getElementById('task-modal');
    const form = document.getElementById('task-form');
    const titleEl = document.getElementById('modal-title');
    const submitEl = document.getElementById('modal-submit-btn');

    titleEl.textContent = 'New task';
    submitEl.textContent = 'Add task';
    form.reset();

    // Pre-fill date
    if (defaultDate) {
      document.getElementById('task-date-input').value = defaultDate;
    }

    // Populate project select
    populateProjectSelect(defaultProjectId);

    // Hide recurrence extra
    document.getElementById('recurrence-days-wrap').style.display = 'none';

    modal.classList.add('open');
    modal.removeAttribute('aria-hidden');
    document.getElementById('task-title-input').focus();
  }

  function openEditModal(taskId) {
    const task = Store.getTask(taskId);
    if (!task) return;

    editingTaskId = taskId;
    const modal = document.getElementById('task-modal');
    const form = document.getElementById('task-form');
    const titleEl = document.getElementById('modal-title');
    const submitEl = document.getElementById('modal-submit-btn');

    titleEl.textContent = 'Edit task';
    submitEl.textContent = 'Save changes';
    form.reset();

    document.getElementById('task-title-input').value = task.title;
    document.getElementById('task-date-input').value = task.plannedDate || '';
    document.getElementById('task-time-input').value = task.time || '';
    document.getElementById('task-duration-select').value = task.estimatedMinutes || '';
    document.getElementById('task-notes-input').value = task.notes || '';

    const priorityRadios = form.querySelectorAll('input[name="task-priority"]');
    priorityRadios.forEach(r => { r.checked = r.value === task.priority; });

    populateProjectSelect(task.projectId);
    document.getElementById('task-recurrence-select').value = '';
    document.getElementById('recurrence-days-wrap').style.display = 'none';

    modal.classList.add('open');
    modal.removeAttribute('aria-hidden');
    document.getElementById('task-title-input').focus();
  }

  function closeModal() {
    const modal = document.getElementById('task-modal');
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    editingTaskId = null;
  }

  function populateProjectSelect(selectedId) {
    const sel = document.getElementById('task-project-select');
    const projects = Store.getProjects();
    sel.innerHTML = '<option value="">No project</option>';
    projects.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      if (selectedId && p.id === selectedId) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  function onFormSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('task-title-input').value.trim();
    if (!title) {
      document.getElementById('task-title-input').focus();
      return;
    }

    const date = document.getElementById('task-date-input').value || null;
    const time = document.getElementById('task-time-input').value || null;
    const projectId = document.getElementById('task-project-select').value || null;
    const duration = document.getElementById('task-duration-select').value;
    const notes = document.getElementById('task-notes-input').value.trim();
    const priority = document.querySelector('input[name="task-priority"]:checked')?.value || 'normal';
    const recurrenceType = document.getElementById('task-recurrence-select').value;

    if (editingTaskId) {
      Store.updateTask(editingTaskId, { title, plannedDate: date, time, projectId, estimatedMinutes: duration ? Number(duration) : null, notes, priority });
      UI.toast('Task updated.');
    } else {
      if (recurrenceType && recurrenceType !== '') {
        // Create recurrence
        const days = recurrenceType === 'custom'
          ? [...document.querySelectorAll('.day-chips input:checked')].map(i => i.value)
          : [];
        Store.addRecurrence({
          title, notes, priority, projectId,
          estimatedMinutes: duration ? Number(duration) : null,
          frequency: recurrenceType === 'custom' ? 'custom' : recurrenceType,
          daysOfWeek: days,
          startDate: date || Utils.todayStr(),
          time,
        });
        UI.toast('Recurring task created.');
      } else {
        Store.addTask({ title, plannedDate: date, time, projectId, estimatedMinutes: duration ? Number(duration) : null, notes, priority });
        UI.toast('Task added.');
      }
    }

    closeModal();
    App.refresh();
  }

  function initModal() {
    document.getElementById('task-form').addEventListener('submit', onFormSubmit);
    document.getElementById('modal-close-btn').addEventListener('click', closeModal);
    document.getElementById('modal-cancel-btn').addEventListener('click', closeModal);

    // Click outside to close
    document.getElementById('task-modal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeModal();
    });

    // Recurrence select
    document.getElementById('task-recurrence-select').addEventListener('change', (e) => {
      document.getElementById('recurrence-days-wrap').style.display =
        e.target.value === 'custom' ? 'block' : 'none';
    });
  }

  return {
    buildTaskRow,
    buildRecurrenceRow,
    openCreateModal,
    openEditModal,
    closeModal,
    handleDelete,
    initModal,
  };
})();
