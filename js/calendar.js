/**
 * calendar.js \u2013 Advanced Calendar: Month view, Week view, Day detail
 */

const Calendar = (() => {

  // -- State ----------------------------------------------
  let currentDate  = new Date();
  let selectedDate = Utils.todayStr();
  let viewMode     = 'month'; // 'month' | 'week'
  let filters      = { events: true, deadlines: true, tasks: true, recurring: true };

  // Cached event map for the visible range: { dateStr: event[] }
  let _eventCache = {};

  // -- Public API -----------------------------------------

  function init() {
    // Navigation
    document.getElementById('cal-prev').addEventListener('click', prev);
    document.getElementById('cal-next').addEventListener('click', next);

    // Go to today
    document.getElementById('cal-today-btn')?.addEventListener('click', () => {
      currentDate = new Date();
      selectedDate = Utils.todayStr();
      render();
    });

    // View mode switcher
    document.querySelectorAll('.view-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => setViewMode(btn.dataset.mode));
    });

    // Filter toggles
    document.querySelectorAll('.cal-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const f = btn.dataset.filter;
        filters[f] = !filters[f];
        btn.classList.toggle('active', filters[f]);
        render(); // use render() not renderCurrentView() \u2013 ensures draw marks are repainted
      });
    });

    // Add event button (header)
    document.getElementById('add-event-btn').addEventListener('click', () => {
      Events.openCreateModal({ date: selectedDate });
    });

    // Add task button in day detail
    document.getElementById('cal-add-task-btn').addEventListener('click', () => {
      Tasks.openCreateModal({ date: selectedDate });
    });

    // Add event button in day detail
    document.getElementById('cal-add-event-btn').addEventListener('click', () => {
      Events.openCreateModal({ date: selectedDate });
    });
  }

  function render() {
    _refreshEventCache();
    renderCurrentView();
    renderDayDetail(selectedDate);
    // Re-paint drawn marks after grid is rebuilt
    if (typeof DrawMode !== 'undefined') DrawMode.renderDrawMarks();
  }

  // -- Cache ----------------------------------------------

  function _refreshEventCache() {
    let fromDate, toDate;
    if (viewMode === 'month') {
      const y = currentDate.getFullYear(), m = currentDate.getMonth();
      // Include prev/next month overflow
      fromDate = Utils.formatDateKey(new Date(y, m - 1, 1));
      toDate   = Utils.formatDateKey(new Date(y, m + 2, 0));
    } else {
      const ws = _getWeekStart();
      fromDate = Utils.formatDateKey(ws);
      const we = new Date(ws); we.setDate(ws.getDate() + 6);
      toDate = Utils.formatDateKey(we);
    }
    _eventCache = Store.getEventsForDateRange(fromDate, toDate);
  }

  // -- Navigation -----------------------------------------

  function prev() {
    if (viewMode === 'month') {
      currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    } else {
      currentDate.setDate(currentDate.getDate() - 7);
    }
    render();
  }

  function next() {
    if (viewMode === 'month') {
      currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    } else {
      currentDate.setDate(currentDate.getDate() + 7);
    }
    render();
  }

  function setViewMode(mode) {
    viewMode = mode;
    document.querySelectorAll('.view-mode-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.mode === mode);
    });
    render();
  }

  function selectDate(dateStr) {
    selectedDate = dateStr;
    // Update visual selection
    document.querySelectorAll('.cal-day.selected, .cal-week-col.selected')
      .forEach(el => el.classList.remove('selected'));
    const cell = document.querySelector(`[data-date="${dateStr}"]`);
    if (cell) {
      cell.classList.add('selected');
      // If in week view, mark col
      const col = cell.closest?.('.cal-week-col');
      if (col) col.classList.add('selected');
    }
    renderDayDetail(dateStr);
  }

  function getSelectedDate() { return selectedDate; }

  // -- Render current view --------------------------------

  function renderCurrentView() {
    if (viewMode === 'month') renderMonth();
    else renderWeek();
  }

  // -- Month view -----------------------------------------

  function renderMonth() {
    const wrap = document.getElementById('cal-grid-wrap');
    if (!wrap) return;

    let weekdays = document.getElementById('cal-weekdays');
    let grid = document.getElementById('cal-grid');

    if (!weekdays || !grid) {
      wrap.innerHTML = `
        <div class="calendar-weekdays" id="cal-weekdays" role="row"></div>
        <div class="calendar-grid" id="cal-grid" role="grid" aria-label="Calendar"></div>
      `;
      weekdays = document.getElementById('cal-weekdays');
      grid = document.getElementById('cal-grid');
    }

    const settings = Store.getSettings();
    const weekStart = settings.weekStartsOn ?? 1;
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();

    // Heading
    const monthHeading = document.getElementById('cal-month-heading');
    if (monthHeading) {
      monthHeading.textContent = Utils.formatMonthYear(currentDate);
    }

    // Weekday headers
    weekdays.innerHTML = '';
    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    for (let i = 0; i < 7; i++) {
      const idx = (weekStart + i) % 7;
      const wd = document.createElement('div');
      wd.className = 'cal-weekday';
      wd.textContent = dayNames[idx];
      weekdays.appendChild(wd);
    }

    // Grid
    grid.innerHTML = '';

    const firstDay = new Date(y, m, 1);
    const lastDay  = new Date(y, m + 1, 0);
    const todayStr = Utils.todayStr();

    const offset = (firstDay.getDay() - weekStart + 7) % 7;

    // Prev-month filler
    for (let i = 0; i < offset; i++) {
      const d = new Date(y, m, 1 - (offset - i));
      const cell = _buildMonthCell(d, todayStr, false);
      cell.classList.add('other-month');
      grid.appendChild(cell);
    }

    // Current month days
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const d = new Date(y, m, day);
      const cell = _buildMonthCell(d, todayStr, true);
      grid.appendChild(cell);
    }

    // Next-month filler
    const totalCells = Math.ceil((offset + lastDay.getDate()) / 7) * 7;
    const filled = offset + lastDay.getDate();
    for (let i = 1; i <= totalCells - filled; i++) {
      const d = new Date(y, m + 1, i);
      const cell = _buildMonthCell(d, todayStr, false);
      cell.classList.add('other-month');
      grid.appendChild(cell);
    }
  }

  function _buildMonthCell(d, todayStr, inMonth) {
    const dateStr = Utils.formatDateKey(d);
    const isToday    = dateStr === todayStr;
    const isSelected = dateStr === selectedDate;

    const cell = document.createElement('div');
    cell.className = 'cal-day';
    cell.setAttribute('role', 'gridcell');
    cell.setAttribute('tabindex', '0');
    cell.setAttribute('data-date', dateStr);
    cell.setAttribute('aria-label', Utils.formatLongDate(d));
    if (isToday)    cell.classList.add('today');
    if (isSelected) cell.classList.add('selected');

    // Date number
    const num = document.createElement('div');
    num.className = 'cal-day-num';
    num.textContent = d.getDate();
    cell.appendChild(num);

    if (inMonth) {
      // Event chips
      _renderChips(cell, dateStr);

      // Task indicator dots
      if (filters.tasks || filters.recurring) {
        const tasks = filters.tasks ? Store.getTasksForDate(dateStr) : [];
        const recs  = filters.recurring ? Store.getRecurrencesForDate(dateStr) : [];
        const taskCount = tasks.length + recs.length;
        if (taskCount > 0) {
          const indicator = document.createElement('div');
          indicator.className = 'cal-task-indicator';
          const dotsToShow = Math.min(taskCount, 3);
          for (let i = 0; i < dotsToShow; i++) {
            const dot = document.createElement('div');
            dot.className = 'cal-task-dot';
            indicator.appendChild(dot);
          }
          cell.appendChild(indicator);
        }
      }
    }

    cell.addEventListener('click', () => selectDate(dateStr));
    cell.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectDate(dateStr); }
      if (e.key === 'ArrowRight') { const next = Utils.addDays(dateStr, 1); selectDate(next); }
      if (e.key === 'ArrowLeft')  { const prev = Utils.addDays(dateStr, -1); selectDate(prev); }
      if (e.key === 'ArrowDown')  { const next = Utils.addDays(dateStr, 7); selectDate(next); }
      if (e.key === 'ArrowUp')    { const prev = Utils.addDays(dateStr, -7); selectDate(prev); }
    });

    return cell;
  }

  /**
   * Renders event chips + project deadlines into a month/week cell.
   */
  function _renderChips(container, dateStr) {
    const MAX_VISIBLE = 3;
    const chips = _getChipsForDate(dateStr);

    const visible  = chips.slice(0, MAX_VISIBLE);
    const overflow = chips.length - MAX_VISIBLE;

    visible.forEach(chip => {
      if (chip.type === 'event') {
        const el = Events.buildEventChip(chip.data, dateStr);
        container.appendChild(el);
      } else if (chip.type === 'deadline') {
        const el = _buildDeadlineChip(chip);
        container.appendChild(el);
      }
    });

    if (overflow > 0) {
      const more = document.createElement('div');
      more.className = 'cal-more';
      more.textContent = `+ ${overflow} more`;
      container.appendChild(more);
    }
  }

  function _getChipsForDate(dateStr) {
    const chips = [];

    // Calendar events
    if (filters.events) {
      const events = _eventCache[dateStr] || Store.getEventsForDate(dateStr);
      events.forEach(ev => {
        chips.push({ type: 'event', data: ev, time: ev.startTime || '' });
      });
    }

    // Project deadlines
    if (filters.deadlines) {
      Store.getProjects()
        .filter(p => p.deadline === dateStr)
        .forEach(proj => {
          chips.push({ type: 'deadline', data: proj, time: '99:99' });
        });
    }

    // Sort: events by time, deadlines last
    chips.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    return chips;
  }

  function _buildDeadlineChip(chip) {
    const proj = chip.data;
    const el = document.createElement('div');
    el.className = 'cal-event-chip cal-chip-amber';
    el.title = `${proj.name} \u2013 Deadline`;
    el.innerHTML = `<span class="cal-event-mark">\u00e2\u2014\u2020</span><span class="cal-event-title">${Utils.sanitizeHTML(proj.name)}</span>`;
    el.addEventListener('click', e => {
      e.stopPropagation();
      Projects.openProjectDetail(proj.id);
    });
    return el;
  }

  // -- Week view ------------------------------------------

  function _getWeekStart() {
    const settings = Store.getSettings();
    const weekStart = settings.weekStartsOn ?? 1;
    const d = new Date(currentDate);
    const dow = d.getDay();
    const diff = (dow - weekStart + 7) % 7;
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function renderWeek() {
    // Replace month grid with week grid
    const wrap = document.getElementById('cal-grid-wrap');
    wrap.innerHTML = '';

    const weekGrid = document.createElement('div');
    weekGrid.className = 'cal-week-grid';
    weekGrid.id = 'cal-week-grid';

    const ws = _getWeekStart();
    const todayStr = Utils.todayStr();

    // Update heading to show week range
    const we = new Date(ws); we.setDate(ws.getDate() + 6);
    document.getElementById('cal-month-heading').textContent =
      `${Utils.formatShortDate(Utils.formatDateKey(ws))} \u2013 ${Utils.formatShortDate(Utils.formatDateKey(we))}`;

    // Build 7 columns
    for (let i = 0; i < 7; i++) {
      const d = new Date(ws);
      d.setDate(ws.getDate() + i);
      const dateStr = Utils.formatDateKey(d);

      const col = document.createElement('div');
      col.className = 'cal-week-col';
      col.setAttribute('data-date', dateStr);
      if (dateStr === todayStr)    col.classList.add('today');
      if (dateStr === selectedDate) col.classList.add('selected');

      // Column header
      const header = document.createElement('div');
      header.className = 'cal-week-col-header';
      const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      header.innerHTML = `
        <div class="cal-week-day-name">${dayNames[d.getDay()]}</div>
        <div class="cal-week-day-num">${d.getDate()}</div>
      `;
      header.addEventListener('click', () => selectDate(dateStr));
      col.appendChild(header);

      // Column body
      const body = document.createElement('div');
      body.className = 'cal-week-col-body';
      body.addEventListener('click', () => selectDate(dateStr));

      // Events
      if (filters.events) {
        const events = _eventCache[dateStr] || Store.getEventsForDate(dateStr);
        events.forEach(ev => {
          const evEl = _buildWeekEvent(ev, dateStr);
          body.appendChild(evEl);
        });
      }

      // Project deadlines
      if (filters.deadlines) {
        Store.getProjects()
          .filter(p => p.deadline === dateStr)
          .forEach(proj => {
            const dl = _buildWeekDeadline(proj);
            body.appendChild(dl);
          });
      }

      // Tasks
      const MAX_TASKS = 4;
      if (filters.tasks || filters.recurring) {
        const tasks = filters.tasks ? Store.getTasksForDate(dateStr) : [];
        const recs  = filters.recurring ? Store.getRecurrencesForDate(dateStr) : [];
        const allTasks = [...tasks, ...recs];

        allTasks.slice(0, MAX_TASKS).forEach(t => {
          const taskEl = _buildWeekTask(t, dateStr);
          body.appendChild(taskEl);
        });

        const overflow = allTasks.length - MAX_TASKS;
        if (overflow > 0) {
          const more = document.createElement('div');
          more.className = 'cal-week-more';
          more.textContent = `+ ${overflow} more`;
          body.appendChild(more);
        }
      }

      const hasContent = body.children.length > 0;
      if (!hasContent) {
        const empty = document.createElement('div');
        empty.className = 'cal-week-empty';
        empty.textContent = '\u2013';
        body.appendChild(empty);
      }

      col.appendChild(body);
      weekGrid.appendChild(col);
    }

    wrap.appendChild(weekGrid);
  }

  function _buildWeekEvent(event, dateStr) {
    const el = document.createElement('div');
    el.className = `cal-week-event cal-color-${event.color || 'muted'}`;

    const header = document.createElement('div');
    header.className = 'cal-week-event-header';

    const mark = document.createElement('span');
    mark.className = 'cal-week-event-mark';
    mark.textContent = Events.getMarkSymbol(event.mark);

    const title = document.createElement('span');
    title.className = 'cal-week-event-title';
    title.textContent = event.title;

    header.appendChild(mark);
    header.appendChild(title);
    el.appendChild(header);

    if (!event.allDay && event.startTime) {
      const time = document.createElement('div');
      time.className = 'cal-week-event-time';
      const endStr = event.endTime ? ` \u2014 ${Utils.formatTime(event.endTime)}` : '';
      time.textContent = Utils.formatTime(event.startTime) + endStr;
      el.appendChild(time);
    }

    el.addEventListener('click', e => {
      e.stopPropagation();
      Events.openEventDetail(event._eventId || event.id, dateStr);
    });

    return el;
  }

  function _buildWeekDeadline(proj) {
    const el = document.createElement('div');
    el.className = 'cal-week-event cal-color-amber';
    el.innerHTML = `
      <div class="cal-week-event-header">
        <span class="cal-week-event-mark">\u00e2\u2014\u2020</span>
        <span class="cal-week-event-title">${Utils.sanitizeHTML(proj.name)}</span>
      </div>
      <div class="cal-week-event-time">Deadline</div>
    `;
    el.addEventListener('click', e => {
      e.stopPropagation();
      Projects.openProjectDetail(proj.id);
    });
    return el;
  }

  function _buildWeekTask(task, dateStr) {
    const isRec = !!task.frequency;
    const isCompleted = isRec
      ? !!(task.completions && task.completions[dateStr])
      : task.status === 'completed';

    const el = document.createElement('div');
    el.className = 'cal-week-task-row';

    const check = document.createElement('span');
    check.className = 'cal-week-task-check';
    check.textContent = isCompleted ? '\u00e2\u02dc\u2018' : '\u00e2\u02dc\u0090';

    const titleEl = document.createElement('span');
    titleEl.className = `cal-week-task-title${isCompleted ? ' done' : ''}`;
    titleEl.textContent = task.title;

    el.appendChild(check);
    el.appendChild(titleEl);

    el.addEventListener('click', e => {
      e.stopPropagation();
      if (isRec) {
        UI.openDetails(task.id, true, dateStr);
      } else {
        UI.openDetails(task.id);
      }
    });

    return el;
  }

  // -- Day detail section ---------------------------------

  function renderDayDetail(dateStr) {
    // Header
    const heading = document.getElementById('cal-detail-date-heading');
    if (heading) {
      const d = Utils.parseDate(dateStr);
      heading.textContent = d.toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric'
      }).toUpperCase();
    }

    let hasContent = false;

    // -- Events -------------------
    const eventsSection = document.getElementById('cal-detail-events-section');
    const eventsList    = document.getElementById('cal-detail-events-list');
    eventsList.innerHTML = '';
    const dayEvents = filters.events ? Store.getEventsForDate(dateStr) : [];
    if (dayEvents.length) {
      hasContent = true;
      eventsSection.style.display = 'block';
      dayEvents.forEach(ev => {
        eventsList.appendChild(Events.buildEventDetailItem(ev, dateStr));
      });
    } else {
      eventsSection.style.display = 'none';
    }

    // -- Deadlines -----------------
    const deadlinesSection = document.getElementById('cal-detail-deadlines-section');
    const deadlinesList    = document.getElementById('cal-detail-deadlines-list');
    deadlinesList.innerHTML = '';
    const dayDeadlines = filters.deadlines
      ? Store.getProjects().filter(p => p.deadline === dateStr)
      : [];
    if (dayDeadlines.length) {
      hasContent = true;
      deadlinesSection.style.display = 'block';
      dayDeadlines.forEach(proj => {
        deadlinesList.appendChild(_buildDetailDeadlineItem(proj));
      });
    } else {
      deadlinesSection.style.display = 'none';
    }

    // -- Tasks ---------------------
    const tasksSection = document.getElementById('cal-detail-tasks-section');
    const tasksList    = document.getElementById('cal-detail-tasks-list');
    tasksList.innerHTML = '';
    const dayTasks = filters.tasks ? Store.getTasksForDate(dateStr) : [];
    if (dayTasks.length) {
      hasContent = true;
      tasksSection.style.display = 'block';
      dayTasks.forEach(t => tasksList.appendChild(Tasks.buildTaskRow(t, { showProject: true })));
    } else {
      tasksSection.style.display = 'none';
    }

    // -- Recurring tasks -----------
    const recurSection = document.getElementById('cal-detail-recurring-section');
    const recurList    = document.getElementById('cal-detail-recurring-list');
    recurList.innerHTML = '';
    const dayRecs = filters.recurring ? Store.getRecurrencesForDate(dateStr) : [];
    if (dayRecs.length) {
      hasContent = true;
      recurSection.style.display = 'block';
      dayRecs.forEach(r => recurList.appendChild(Tasks.buildRecurrenceRow(r, dateStr)));
    } else {
      recurSection.style.display = 'none';
    }

    // Empty state
    const empty = document.getElementById('cal-day-empty');
    if (empty) empty.style.display = hasContent ? 'none' : 'block';
  }

  function _buildDetailDeadlineItem(proj) {
    const { pct } = Store.getProjectProgress(proj.id);
    const item = document.createElement('div');
    item.className = 'cal-detail-deadline-item';
    item.innerHTML = `
      <span class="cal-detail-deadline-mark">\u00e2\u2014\u2020</span>
      <div class="cal-detail-deadline-body">
        <div class="cal-detail-deadline-title">${Utils.sanitizeHTML(proj.name)}</div>
        <div class="cal-detail-deadline-label">Deadline \u00c2\u00b7 ${pct}% complete</div>
      </div>
    `;
    item.addEventListener('click', () => Projects.openProjectDetail(proj.id));
    return item;
  }

  return {
    init,
    render,
    selectDate,
    getSelectedDate,
    setViewMode,
    renderDayDetail,
  };
})();

/* \u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090
 * DrawMode \u2013 drag-to-draw circles / X marks on calendar day cells
 *
 * Interaction architecture:
 *   \u00e2\u20ac\u00a2 ONE permanent delegated "mousedown" listener on cal-grid-wrap
 *     handles ALL mark interactions (erase / move / edit).
 *     This prevents conflicts with the draw-drag listener.
 *   \u00e2\u20ac\u00a2 stopImmediatePropagation() is used so draw listeners never
 *     fire during a move/erase interaction.
 *   \u00e2\u20ac\u00a2 Temporary document-level listeners for mousemove/mouseup are
 *     added ONLY while a move drag is in progress, then removed.
 *
 * Coordinate system:
 *   stored  \u00e2\u2020\u2019 xPct, yPct   = center as % of cell (0\u2014100)
 *             sizePct       = radius as % of min(cellW, cellH)
 *   painted \u00e2\u2020\u2019 SVG viewBox = "0 0 {cellW} {cellH}" (real pixels, 1:1)
 * \u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090\u00e2\u2022\u0090 */

const DrawMode = (() => {

  let activeTool    = null;   // null | 'circle' | 'x' | 'erase'
  let dragState     = null;   // active draw-drag
  let moveState     = null;   // active move-drag
  let editingMarkId = null;   // which mark is open in the edit modal
  let pendingMark   = null;   // new mark waiting for text/color confirm

  // -- Init ----------------------------------------------

  function init() {
    // Draw toolbar buttons
    document.getElementById('draw-circle-btn').addEventListener('click', () => toggleTool('circle'));
    document.getElementById('draw-x-btn').addEventListener('click',     () => toggleTool('x'));
    document.getElementById('draw-erase-btn').addEventListener('click', () => toggleTool('erase'));

    // Shared text / edit modal
    document.getElementById('draw-text-confirm').addEventListener('click', _onConfirm);
    document.getElementById('draw-text-cancel').addEventListener('click',  _onCancel);
    document.getElementById('draw-text-close').addEventListener('click',   _onCancel);
    document.getElementById('draw-text-modal').addEventListener('click', e => {
      if (e.target === e.currentTarget) _onCancel();
    });

    // Live preview
    document.querySelectorAll('input[name="draw-color"]').forEach(r =>
      r.addEventListener('change', _updatePreview)
    );
    document.getElementById('draw-color-custom-input').addEventListener('input', () => {
      document.getElementById('draw-color-custom-radio').checked = true;
      _updatePreview();
    });
    document.getElementById('draw-text-input').addEventListener('input', _updatePreview);

    // Escape key exits draw mode
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && activeTool) {
        if (document.getElementById('draw-text-modal').classList.contains('open')) return;
        exitDrawMode();
      }
    });

    // -- Permanent mark-interaction listener ------------
    // This single listener handles erase / move / click-to-edit.
    // It is registered once here and lives for the page's lifetime.
    // It fires BEFORE the draw-drag listener (registered later on same element)
    // so we can use stopImmediatePropagation() to gate draw-drag when needed.
    const wrap = document.getElementById('cal-grid-wrap');
    if (wrap) {
      wrap.addEventListener('mousedown', _onMarkDown);
      wrap.addEventListener('touchstart', _onMarkDown, { passive: false });
    }
  }

  function _getPos(e) {
    if (e.touches && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    if (e.changedTouches && e.changedTouches.length > 0) {
      return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    }
    return { x: e.clientX || 0, y: e.clientY || 0 };
  }

  // -- Tool management ------------------------------------

  function toggleTool(tool) {
    if (activeTool === tool) { exitDrawMode(); return; }
    _detachDrawListeners();
    activeTool = tool;
    _updateToolbarUI();
    _attachDrawListeners();
  }

  function exitDrawMode() {
    activeTool = null;
    _updateToolbarUI();
    _detachDrawListeners();
    if (dragState?.ghost) dragState.ghost.remove();
    dragState = null;
  }

  function _updateToolbarUI() {
    const map = { circle: 'draw-circle-btn', x: 'draw-x-btn', erase: 'draw-erase-btn' };
    Object.entries(map).forEach(([t, id]) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.setAttribute('aria-pressed', activeTool === t ? 'true' : 'false');
      btn.classList.toggle('active', activeTool === t);
    });
    const eraseBtn = document.getElementById('draw-erase-btn');
    if (eraseBtn) eraseBtn.style.display = activeTool ? 'inline-flex' : 'none';

    const wrap = document.getElementById('cal-grid-wrap');
    if (!wrap) return;
    wrap.classList.toggle('draw-mode',   !!activeTool);
    wrap.classList.toggle('draw-circle', activeTool === 'circle');
    wrap.classList.toggle('draw-x',      activeTool === 'x');
    wrap.classList.toggle('draw-erase',  activeTool === 'erase');
  }

  // -- Draw listeners (added/removed per tool) ------------

  function _attachDrawListeners() {
    const wrap = document.getElementById('cal-grid-wrap');
    if (!wrap) return;
    wrap.addEventListener('mousedown', _onDrawDown);
    wrap.addEventListener('touchstart', _onDrawDown, { passive: false });
    document.addEventListener('mousemove', _onDrawMove, { passive: false });
    document.addEventListener('touchmove', _onDrawMove, { passive: false });
    document.addEventListener('mouseup',   _onDrawUp);
    document.addEventListener('touchend',  _onDrawUp);
  }

  function _detachDrawListeners() {
    const wrap = document.getElementById('cal-grid-wrap');
    if (!wrap) return;
    wrap.removeEventListener('mousedown', _onDrawDown);
    wrap.removeEventListener('touchstart', _onDrawDown);
    document.removeEventListener('mousemove', _onDrawMove);
    document.removeEventListener('touchmove', _onDrawMove);
    document.removeEventListener('mouseup',   _onDrawUp);
    document.removeEventListener('touchend',  _onDrawUp);
  }

  // -- Mark interaction (permanent delegated handler) -----

  function _onMarkDown(e) {
    const g = e.target.closest('[data-mark-id]');
    if (!g) return;

    if (activeTool === 'erase') {
      if (e.cancelable) e.preventDefault();
      e.stopImmediatePropagation();
      Store.deleteDrawMark(g.dataset.markId);
      renderDrawMarks();
      UI.toast('Shape removed.');
      return;
    }

    if (activeTool) return;

    if (e.cancelable) e.preventDefault();
    e.stopImmediatePropagation();

    const markId = g.dataset.markId;
    const mark = Store.getDrawMark(markId);
    if (!mark) return;

    const cell = g.closest('.cal-day, .cal-week-col');
    if (!cell) return;

    const pos = _getPos(e);
    moveState = {
      markId, mark, cell,
      rect:   cell.getBoundingClientRect(),
      startX: pos.x,
      startY: pos.y,
      moved:  false,
      newXpct: null,
      newYpct: null,
    };

    document.addEventListener('mousemove', _onMoveMove, { passive: false });
    document.addEventListener('touchmove', _onMoveMove, { passive: false });
    document.addEventListener('mouseup',   _onMoveUp);
    document.addEventListener('touchend',  _onMoveUp);
  }

  // -- Move drag handlers ---------------------------------

  function _onMoveMove(e) {
    if (!moveState) return;
    const pos = _getPos(e);
    const { cell, startX, startY, markId, mark } = moveState;
    const dx = pos.x - startX;
    const dy = pos.y - startY;
    if (!moveState.moved && (Math.abs(dx) + Math.abs(dy)) < 5) return;

    moveState.moved = true;
    if (e.cancelable) e.preventDefault();

    const rect   = cell.getBoundingClientRect();
    const newXpx = Math.max(0, Math.min(rect.width,  pos.x - rect.left));
    const newYpx = Math.max(0, Math.min(rect.height, pos.y - rect.top));
    moveState.newXpct = (newXpx / rect.width)  * 100;
    moveState.newYpct = (newYpx / rect.height) * 100;

    const gEl = cell.querySelector(`[data-mark-id="${markId}"]`);
    if (gEl) {
      const origXpx = (mark.xPct / 100) * rect.width;
      const origYpx = (mark.yPct / 100) * rect.height;
      gEl.setAttribute('transform', `translate(${newXpx - origXpx},${newYpx - origYpx})`);
    }
  }

  function _onMoveUp(e) {
    document.removeEventListener('mousemove', _onMoveMove);
    document.removeEventListener('touchmove', _onMoveMove);
    document.removeEventListener('mouseup',   _onMoveUp);
    document.removeEventListener('touchend',  _onMoveUp);

    if (!moveState) return;
    const { markId, moved, newXpct, newYpct } = moveState;
    moveState = null;

    if (moved && newXpct !== null) {
      Store.updateDrawMark(markId, {
        xPct: +newXpct.toFixed(2),
        yPct: +newYpct.toFixed(2),
      });
      renderDrawMarks();
    } else if (!moved) {
      _openEditModal(markId);
    }
  }

  // -- Draw drag handlers ---------------------------------

  function _getCell(e) {
    if (e.touches && e.touches.length > 0) {
      const el = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY);
      return el ? el.closest('.cal-day, .cal-week-col') : null;
    }
    return e.target.closest('.cal-day, .cal-week-col');
  }

  function _onDrawDown(e) {
    if (!activeTool || activeTool === 'erase') return;

    const cell = _getCell(e);
    if (!cell) return;
    const dateStr = cell.dataset.date;
    if (!dateStr) return;
    if (e.cancelable) e.preventDefault();

    const rect = cell.getBoundingClientRect();
    const pos = _getPos(e);

    const ghost = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    ghost.classList.add('draw-ghost-svg');
    ghost.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
    ghost.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:20;overflow:visible';
    cell.style.position = 'relative';
    cell.appendChild(ghost);

    dragState = {
      cell, dateStr, rect,
      startX: pos.x - rect.left,
      startY: pos.y - rect.top,
      ghost,
      curR: 0,
    };
  }

  function _onDrawMove(e) {
    if (!dragState?.ghost) return;
    if (e.cancelable) e.preventDefault();
    const pos = _getPos(e);
    const { startX, startY, rect, ghost } = dragState;
    const dx = (pos.x - rect.left) - startX;
    const dy = (pos.y - rect.top)  - startY;
    const r = Math.max(4, Math.min(
      Math.sqrt(dx * dx + dy * dy),
      Math.min(rect.width, rect.height) * 0.48
    ));
    dragState.curR = r;
    ghost.innerHTML = _ghostSVG(activeTool, startX, startY, r);
  }

  function _onDrawUp(e) {
    if (!dragState) return;
    const { dateStr, startX, startY, rect, curR, ghost } = dragState;
    ghost.remove();
    dragState = null;

    if (curR < 4) return;

    const xPct    = (startX / rect.width)                       * 100;
    const yPct    = (startY / rect.height)                      * 100;
    const sizePct = (curR   / Math.min(rect.width, rect.height)) * 100;

    pendingMark = {
      date:    dateStr,
      shape:   activeTool,
      xPct:    +xPct.toFixed(2),
      yPct:    +yPct.toFixed(2),
      sizePct: +sizePct.toFixed(2),
      color:   '#ef4444',
      text:    '',
    };

    _openModal('new');
  }

  function _ghostSVG(shape, cx, cy, r) {
    const sw = Math.max(1.5, r * 0.1);
    if (shape === 'circle') {
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="rgba(239,68,68,0.2)" stroke="rgba(239,68,68,0.85)" stroke-width="${sw}" stroke-dasharray="5 3"/>`;
    }
    const h = r * 0.85;
    return `
      <line x1="${cx-h}" y1="${cy-h}" x2="${cx+h}" y2="${cy+h}" stroke="rgba(239,68,68,0.85)" stroke-width="${sw * 1.6}" stroke-linecap="round"/>
      <line x1="${cx+h}" y1="${cy-h}" x2="${cx-h}" y2="${cy+h}" stroke="rgba(239,68,68,0.85)" stroke-width="${sw * 1.6}" stroke-linecap="round"/>
    `;
  }

  // -- Modal (shared for new + edit) ----------------------

  function _openModal(mode) {
    const isEdit = mode === 'edit';
    const src = isEdit
      ? Store.getDrawMark(editingMarkId)
      : pendingMark;
    if (!src) return;

    document.getElementById('draw-text-title').textContent   = isEdit ? 'Edit shape' : 'Add text inside shape?';
    document.getElementById('draw-text-confirm').textContent = isEdit ? 'Save changes' : 'Place shape';
    document.getElementById('draw-text-input').value         = src.text || '';

    // Color swatches
    const color = src.color || '#ef4444';
    const radio = document.querySelector(`input[name="draw-color"][value="${color}"]`);
    if (radio) {
      radio.checked = true;
    } else {
      document.getElementById('draw-color-custom-radio').checked = true;
      document.getElementById('draw-color-custom-input').value   = color;
    }

    // Delete button (edit only)
    let delBtn = document.getElementById('draw-text-delete');
    if (!delBtn) {
      delBtn = document.createElement('button');
      delBtn.id        = 'draw-text-delete';
      delBtn.type      = 'button';
      delBtn.className = 'btn-ghost';
      delBtn.style.cssText = 'color:var(--danger,#ef4444);margin-right:auto;padding:7px 12px';
      delBtn.textContent = '\u00f0\u0178\u2014\u2018 Delete';
      delBtn.addEventListener('click', _onDelete);
      document.querySelector('#draw-text-modal .modal-actions').prepend(delBtn);
    }
    delBtn.style.display = isEdit ? 'inline-flex' : 'none';

    // Temp copy so preview works
    pendingMark = { ...src };
    _updatePreview();

    const modal = document.getElementById('draw-text-modal');
    modal.classList.add('open');
    modal.removeAttribute('aria-hidden');
    requestAnimationFrame(() => document.getElementById('draw-text-input').focus());
  }

  function _openEditModal(id) {
    editingMarkId = id;
    _openModal('edit');
  }

  function _onConfirm() {
    const text  = document.getElementById('draw-text-input').value.trim();
    const color = _getColor();
    if (editingMarkId) {
      Store.updateDrawMark(editingMarkId, { text, color });
      editingMarkId = null; pendingMark = null;
      renderDrawMarks(); _closeModal(); UI.toast('Shape updated.');
    } else if (pendingMark) {
      Store.addDrawMark({ ...pendingMark, text, color });
      pendingMark = null;
      renderDrawMarks(); _closeModal(); UI.toast('Shape placed.');
    }
  }

  function _onCancel()  { editingMarkId = null; pendingMark = null; _closeModal(); }
  function _onDelete()  {
    if (!editingMarkId) return;
    Store.deleteDrawMark(editingMarkId);
    editingMarkId = null; pendingMark = null;
    renderDrawMarks(); _closeModal(); UI.toast('Shape removed.');
  }
  function _closeModal() {
    const modal = document.getElementById('draw-text-modal');
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }

  function _getColor() {
    const c = document.querySelector('input[name="draw-color"]:checked');
    if (!c) return '#ef4444';
    if (c.value === 'custom') return document.getElementById('draw-color-custom-input').value || '#ef4444';
    return c.value;
  }

  function _updatePreview() {
    const svg = document.getElementById('draw-text-preview-svg');
    if (!svg || !pendingMark) return;
    const color = _getColor();
    const text  = (document.getElementById('draw-text-input')?.value || '').trim();
    const { shape } = pendingMark;
    const r = 30, cx = 40, cy = 40, sw = Math.max(3, r * 0.13);
    let html = shape === 'circle'
      ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" opacity="0.9"/>`
      : `<line x1="${cx-r*.85}" y1="${cy-r*.85}" x2="${cx+r*.85}" y2="${cy+r*.85}" stroke="${color}" stroke-width="${sw}" stroke-linecap="round"/>
         <line x1="${cx+r*.85}" y1="${cy-r*.85}" x2="${cx-r*.85}" y2="${cy+r*.85}" stroke="${color}" stroke-width="${sw}" stroke-linecap="round"/>`;
    if (text) {
      const fs = Math.min(17, Math.max(10, r * 0.55));
      const tc = shape === 'circle' ? '#fff' : color;
      html += `<text x="${cx}" y="${cy}" dominant-baseline="central" text-anchor="middle" font-size="${fs}" font-family="Inter,sans-serif" font-weight="600" fill="${tc}">${_esc(text)}</text>`;
    }
    svg.innerHTML = html;
  }

  function _esc(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // -- Render drawn marks onto calendar grid --------------
  //
  // Works for BOTH month view (.cal-day) and week view (.cal-week-col)
  // because both have [data-date] attributes.
  //
  // SVG viewBox = "0 0 {cellW} {cellH}" ensures 1:1 pixel coordinates
  // so xPct/yPct/sizePct scale correctly to whatever cell size is shown.

  function renderDrawMarks() {
    // Tear down old layers
    document.querySelectorAll('.cal-drawn-mark-layer').forEach(el => el.remove());

    const marks = Store.getDrawMarks();
    if (!marks.length) return;

    // Group by date
    const byDate = {};
    marks.forEach(m => { (byDate[m.date] = byDate[m.date] || []).push(m); });

    Object.entries(byDate).forEach(([dateStr, dayMarks]) => {
      // Works in BOTH month and week views
      const cell = document.querySelector(`[data-date="${dateStr}"]`);
      if (!cell) return; // date not in current visible range

      cell.style.position = 'relative'; // ensure SVG can be absolutely positioned

      const cellW  = cell.offsetWidth  || 100;
      const cellH  = cell.offsetHeight || 88;
      const minDim = Math.min(cellW, cellH);

      // SVG layer \u2013 viewBox = real pixels, so stored % coords map 1:1
      const layer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      layer.classList.add('cal-drawn-mark-layer');
      layer.setAttribute('viewBox', `0 0 ${cellW} ${cellH}`);
      layer.style.cssText = [
        'position:absolute', 'top:0', 'left:0',
        `width:${cellW}px`, `height:${cellH}px`,
        'pointer-events:none',   // SVG itself: pass-through
        'z-index:5', 'overflow:visible',
      ].join(';');

      dayMarks.forEach(mark => {
        const cx = (mark.xPct    / 100) * cellW;
        const cy = (mark.yPct    / 100) * cellH;
        const r  = (mark.sizePct / 100) * minDim;
        const sw = Math.max(1.5, r * 0.12);

        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('data-mark-id', mark.id);
        g.setAttribute('class', 'cal-drawn-mark-group');
        g.style.pointerEvents = 'auto'; // override SVG's pointer-events:none
        g.style.cursor = activeTool === 'erase' ? 'pointer' : 'move';

        if (mark.shape === 'circle') {
          const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          circle.setAttribute('cx', cx);
          circle.setAttribute('cy', cy);
          circle.setAttribute('r',  r);
          circle.setAttribute('fill', mark.color || '#ef4444');
          circle.setAttribute('opacity', '0.87');
          g.appendChild(circle);
        } else {
          // X / cross
          const h = r * 0.85;
          [[cx-h,cy-h,cx+h,cy+h],[cx+h,cy-h,cx-h,cy+h]].forEach(([x1,y1,x2,y2]) => {
            const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            ln.setAttribute('x1', x1); ln.setAttribute('y1', y1);
            ln.setAttribute('x2', x2); ln.setAttribute('y2', y2);
            ln.setAttribute('stroke', mark.color || '#ef4444');
            ln.setAttribute('stroke-width', sw * 2);
            ln.setAttribute('stroke-linecap', 'round');
            g.appendChild(ln);
          });
        }

        // Center label
        if (mark.text) {
          const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          t.setAttribute('x', cx); t.setAttribute('y', cy);
          t.setAttribute('dominant-baseline', 'central');
          t.setAttribute('text-anchor', 'middle');
          t.setAttribute('font-size', Math.min(r * 0.65, 14));
          t.setAttribute('font-family', 'Inter,sans-serif');
          t.setAttribute('font-weight', '600');
          t.setAttribute('fill', mark.shape === 'circle' ? '#ffffff' : (mark.color || '#ef4444'));
          t.setAttribute('pointer-events', 'none');
          t.textContent = mark.text;
          g.appendChild(t);
        }

        // Right-click to delete (works in all modes)
        g.addEventListener('contextmenu', ev => {
          ev.preventDefault();
          ev.stopPropagation();
          Store.deleteDrawMark(mark.id);
          renderDrawMarks();
          UI.toast('Shape removed.');
        });

        layer.appendChild(g);
      });

      cell.appendChild(layer);
    });
  }

  return { init, renderDrawMarks, exitDrawMode };
})();
