/**
 * projects.js \u2014 Project views and project modal
 */

const Projects = (() => {

  // -- Project modal --------------------------------------

  let editingProjectId = null;

  function openCreateModal() {
    editingProjectId = null;
    document.getElementById('project-modal-title').textContent = 'New project';
    document.getElementById('project-form').reset();
    const modal = document.getElementById('project-modal');
    modal.classList.add('open');
    modal.removeAttribute('aria-hidden');
    document.getElementById('proj-name-input').focus();
  }

  function openEditModal(projectId) {
    const proj = Store.getProject(projectId);
    if (!proj) return;
    editingProjectId = projectId;
    document.getElementById('project-modal-title').textContent = 'Edit project';
    document.getElementById('proj-name-input').value = proj.name;
    document.getElementById('proj-desc-input').value = proj.description || '';
    document.getElementById('proj-start-input').value = proj.startDate || '';
    document.getElementById('proj-deadline-input').value = proj.deadline || '';
    const modal = document.getElementById('project-modal');
    modal.classList.add('open');
    modal.removeAttribute('aria-hidden');
    document.getElementById('proj-name-input').focus();
  }

  function closeModal() {
    const modal = document.getElementById('project-modal');
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    editingProjectId = null;
  }

  function onFormSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('proj-name-input').value.trim();
    if (!name) return;
    const description = document.getElementById('proj-desc-input').value.trim();
    const startDate = document.getElementById('proj-start-input').value || null;
    const deadline = document.getElementById('proj-deadline-input').value || null;

    if (editingProjectId) {
      Store.updateProject(editingProjectId, { name, description, startDate, deadline });
      UI.toast('Project updated.');
    } else {
      Store.addProject({ name, description, startDate, deadline });
      UI.toast('Project created.');
    }
    closeModal();
    App.refresh();
  }

  function initModal() {
    document.getElementById('project-form').addEventListener('submit', onFormSubmit);
    document.getElementById('project-modal-close').addEventListener('click', closeModal);
    document.getElementById('project-modal-cancel').addEventListener('click', closeModal);
    document.getElementById('project-modal').addEventListener('click', e => {
      if (e.target === e.currentTarget) closeModal();
    });
  }

  // -- Projects list view ---------------------------------

  function renderProjectsList() {
    const grid = document.getElementById('projects-grid');
    const empty = document.getElementById('projects-empty');
    const projects = Store.getProjects();
    grid.innerHTML = '';

    if (!projects.length) {
      empty.style.display = 'block';
      grid.style.display = 'none';
      return;
    }
    empty.style.display = 'none';
    grid.style.display = 'flex';

    projects.forEach(proj => {
      const card = buildProjectCard(proj);
      grid.appendChild(card);
    });
  }

  function buildProjectCard(proj) {
    const { total, completed, pct } = Store.getProjectProgress(proj.id);
    const card = document.createElement('div');
    card.className = 'project-card';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.dataset.id = proj.id;

    const daysLeft = proj.deadline ? Utils.daysUntil(proj.deadline) : null;
    let deadlineHtml = '';
    if (proj.deadline) {
      let cls = 'ok';
      let label = '';
      if (daysLeft < 0) { cls = ''; label = `Overdue by ${Math.abs(daysLeft)}d`; }
      else if (daysLeft === 0) { cls = 'soon'; label = 'Due today'; }
      else if (daysLeft <= 3) { cls = 'soon'; label = `${daysLeft}d left`; }
      else { cls = 'ok'; label = `${daysLeft}d left`; }
      deadlineHtml = `<span class="deadline-badge ${cls}">${label}</span>`;
    }

    let dateRange = '';
    if (proj.startDate && proj.deadline) {
      dateRange = `${Utils.formatShortDate(proj.startDate)} \u2014 ${Utils.formatShortDate(proj.deadline)}`;
    } else if (proj.deadline) {
      dateRange = `Due ${Utils.formatShortDate(proj.deadline)}`;
    }

    card.innerHTML = `
      <div class="project-card-header">
        <div>
          <div class="project-card-title">${Utils.sanitizeHTML(proj.name)}</div>
          ${proj.description ? `<div class="project-card-desc">${Utils.sanitizeHTML(proj.description)}</div>` : ''}
        </div>
        <div class="project-card-actions">
          <button class="task-action-btn proj-edit-btn" data-id="${proj.id}" aria-label="Edit project" title="Edit">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M9.5 2L11 3.5 4 10.5H2.5V9L9.5 2z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>
          </button>
          <button class="task-action-btn danger proj-delete-btn" data-id="${proj.id}" aria-label="Delete project" title="Delete">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 3.5h9M4.5 3.5V2.5h4v1M5 5.5v4M8 5.5v4M3 3.5l.5 7h6l.5-7" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
      </div>
      <div class="project-card-meta">
        ${dateRange ? `<span class="project-card-dates">${dateRange}</span>` : ''}
        <span>${total} task${total !== 1 ? 's' : ''}</span>
        ${deadlineHtml}
      </div>
      <div class="project-card-progress">
        <div class="project-card-bar">
          <div class="progress-bar-wrap">
            <div class="progress-bar-fill" style="width:${pct}%"></div>
          </div>
        </div>
        <span class="project-card-pct">${pct}%</span>
      </div>
    `;

    card.addEventListener('click', (e) => {
      if (e.target.closest('.proj-edit-btn')) {
        e.stopPropagation();
        openEditModal(proj.id);
        return;
      }
      if (e.target.closest('.proj-delete-btn')) {
        e.stopPropagation();
        if (confirm(`Delete project "${proj.name}"? Tasks will remain but be unlinked.`)) {
          Store.deleteProject(proj.id);
          App.refresh();
          UI.toast('Project deleted.');
        }
        return;
      }
      openProjectDetail(proj.id);
    });

    card.addEventListener('keydown', e => {
      if (e.key === 'Enter') openProjectDetail(proj.id);
    });

    return card;
  }

  // -- Project detail view --------------------------------

  let currentProjectId = null;

  function openProjectDetail(projectId) {
    currentProjectId = projectId;
    App.navigate('project-detail');
    renderProjectDetail(projectId);
  }

  function renderProjectDetail(projectId) {
    const proj = Store.getProject(projectId);
    if (!proj) return;

    const { total, completed, pct } = Store.getProjectProgress(projectId);
    const tasks = Store.getTasksForProject(projectId);

    // Header
    const header = document.getElementById('project-detail-header');
    const daysLeft = proj.deadline ? Utils.daysUntil(proj.deadline) : null;
    let deadlineStr = '';
    if (proj.deadline) {
      if (daysLeft < 0) deadlineStr = `Overdue by ${Math.abs(daysLeft)} days`;
      else if (daysLeft === 0) deadlineStr = 'Due today';
      else deadlineStr = `${daysLeft} days remaining`;
    }

    let dateRange = '';
    if (proj.startDate && proj.deadline) {
      dateRange = `${Utils.formatShortDate(proj.startDate)} \u2014 ${Utils.formatShortDate(proj.deadline)}`;
    } else if (proj.deadline) {
      dateRange = `Due ${Utils.formatShortDate(proj.deadline)}`;
    }

    header.innerHTML = `
      <div class="project-detail-name">${Utils.sanitizeHTML(proj.name)}</div>
      ${proj.description ? `<div class="project-card-desc" style="margin-bottom:12px">${Utils.sanitizeHTML(proj.description)}</div>` : ''}
      <div class="project-detail-meta">
        ${dateRange}${deadlineStr ? ` \u00b7 ${deadlineStr}` : ''}
      </div>
      <div class="project-detail-stats">
        <div>
          <div class="project-stat-val">${pct}%</div>
          <div class="project-stat-label">complete</div>
        </div>
        <div>
          <div class="project-stat-val">${completed}/${total}</div>
          <div class="project-stat-label">tasks done</div>
        </div>
        ${daysLeft !== null && daysLeft >= 0 ? `
        <div>
          <div class="project-stat-val">${daysLeft}</div>
          <div class="project-stat-label">days left</div>
        </div>` : ''}
      </div>
      <div class="project-detail-bar">
        <div class="progress-bar-wrap" style="height:3px">
          <div class="progress-bar-fill" style="width:${pct}%"></div>
        </div>
      </div>
    `;

    // Body \u2014 group tasks by date
    const body = document.getElementById('project-detail-body');
    body.innerHTML = '';

    // Sort tasks: dated first (by date), then undated
    const dated = tasks.filter(t => t.plannedDate).sort((a,b) => a.plannedDate.localeCompare(b.plannedDate));
    const undated = tasks.filter(t => !t.plannedDate);

    // Group by date
    const dateGroups = {};
    dated.forEach(t => {
      if (!dateGroups[t.plannedDate]) dateGroups[t.plannedDate] = [];
      dateGroups[t.plannedDate].push(t);
    });

    Object.entries(dateGroups).forEach(([date, dateTasks]) => {
      const group = document.createElement('div');
      group.className = 'project-date-group';
      const heading = document.createElement('div');
      heading.className = 'project-date-heading';
      heading.textContent = Utils.formatLongDate(date).toUpperCase();
      group.appendChild(heading);
      const list = document.createElement('ul');
      list.className = 'task-list';
      dateTasks.forEach(task => {
        list.appendChild(Tasks.buildTaskRow(task, { showProject: false }));
      });
      group.appendChild(list);
      body.appendChild(group);
    });

    if (undated.length) {
      const label = document.createElement('div');
      label.className = 'project-unscheduled-heading';
      label.textContent = 'Unscheduled';
      body.appendChild(label);
      const list = document.createElement('ul');
      list.className = 'task-list';
      undated.forEach(task => {
        list.appendChild(Tasks.buildTaskRow(task, { showProject: false, showDate: false }));
      });
      body.appendChild(list);
    }

    if (!tasks.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = `<p class="empty-title">No tasks yet.</p><p class="empty-sub">Add tasks to start tracking progress.</p>`;
      body.appendChild(empty);
    }

    // Add task button
    document.getElementById('add-task-project').onclick = () => {
      Tasks.openCreateModal({ projectId });
    };
  }

  function getCurrentProjectId() { return currentProjectId; }

  return {
    openCreateModal,
    openEditModal,
    closeModal,
    initModal,
    renderProjectsList,
    openProjectDetail,
    renderProjectDetail,
    getCurrentProjectId,
  };
})();
