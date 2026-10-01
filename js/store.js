/**
 * store.js \u2014 Central data store with localStorage persistence
 * Supports: tasks, projects, recurrences, calendar events, settings
 */

const Store = (() => {
  const STORAGE_KEY = 'planner_v1';

  let state = {
    tasks: [],
    projects: [],
    recurrences: [],
    events: [],        // Calendar events (new)
    drawMarks: [],     // Hand-drawn shapes on calendar cells
    settings: {
      theme: 'dark',
      weekStartsOn: 1,
      defaultDuration: null,
    },
    lastVisit: null,
  };

  const listeners = [];

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        state = { ...state, ...parsed };
        if (!state.events) state.events = [];
        if (!state.drawMarks) state.drawMarks = [];
      }
    } catch (e) {
      console.warn('Planner: Failed to load state', e);
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Planner: Failed to save state', e);
    }
    listeners.forEach(fn => fn(state));
  }

  function subscribe(fn) {
    listeners.push(fn);
    return () => {
      const i = listeners.indexOf(fn);
      if (i !== -1) listeners.splice(i, 1);
    };
  }

  function getState() { return state; }

  // -- Tasks ----------------------------------------------

  function getTasks() { return state.tasks; }

  function getTask(id) {
    return state.tasks.find(t => t.id === id) || null;
  }

  function addTask(taskData) {
    const task = {
      id: Utils.uid(),
      title: '',
      notes: '',
      status: 'pending',
      priority: 'normal',
      plannedDate: null,
      time: null,
      estimatedMinutes: null,
      projectId: null,
      recurrenceId: null,
      subtasks: [],
      createdAt: new Date().toISOString(),
      completedAt: null,
      ...taskData,
    };
    state.tasks.push(task);
    save();
    return task;
  }

  function updateTask(id, updates) {
    const idx = state.tasks.findIndex(t => t.id === id);
    if (idx === -1) return null;
    state.tasks[idx] = { ...state.tasks[idx], ...updates };
    save();
    return state.tasks[idx];
  }

  function deleteTask(id) {
    state.tasks = state.tasks.filter(t => t.id !== id);
    save();
  }

  function reorderTask(dragId, targetId) {
    const dragIdx = state.tasks.findIndex(t => t.id === dragId);
    const targetIdx = state.tasks.findIndex(t => t.id === targetId);
    if (dragIdx !== -1 && targetIdx !== -1 && dragIdx !== targetIdx) {
      const [moved] = state.tasks.splice(dragIdx, 1);
      state.tasks.splice(targetIdx, 0, moved);
      save();
    }
  }

  function completeTask(id) {
    const task = getTask(id);
    if (!task) return;
    if (task.status === 'completed') {
      return updateTask(id, { status: 'pending', completedAt: null });
    }
    return updateTask(id, { status: 'completed', completedAt: new Date().toISOString() });
  }

  function getTasksForDate(dateStr) {
    return state.tasks.filter(t => t.plannedDate === dateStr && !t.recurrenceId);
  }

  function getInboxTasks() {
    return state.tasks.filter(t => !t.plannedDate && !t.recurrenceId);
  }

  function getTasksForProject(projectId) {
    return state.tasks.filter(t => t.projectId === projectId);
  }

  function getOverdueTasks() {
    const today = Utils.todayStr();
    return state.tasks.filter(t =>
      t.plannedDate &&
      t.plannedDate < today &&
      t.status !== 'completed' &&
      !t.recurrenceId
    );
  }

  // Subtasks
  function addSubtask(taskId, subtaskTitle) {
    const task = getTask(taskId);
    if (!task) return;
    const subtask = { id: Utils.uid(), title: subtaskTitle, completed: false, order: task.subtasks.length };
    return updateTask(taskId, { subtasks: [...task.subtasks, subtask] });
  }

  function toggleSubtask(taskId, subtaskId) {
    const task = getTask(taskId);
    if (!task) return;
    const subtasks = task.subtasks.map(s =>
      s.id === subtaskId ? { ...s, completed: !s.completed } : s
    );
    return updateTask(taskId, { subtasks });
  }

  function deleteSubtask(taskId, subtaskId) {
    const task = getTask(taskId);
    if (!task) return;
    return updateTask(taskId, { subtasks: task.subtasks.filter(s => s.id !== subtaskId) });
  }

  // -- Projects -------------------------------------------

  function getProjects() { return state.projects; }

  function getProject(id) {
    return state.projects.find(p => p.id === id) || null;
  }

  function addProject(data) {
    const project = {
      id: Utils.uid(),
      name: '',
      description: '',
      startDate: null,
      deadline: null,
      status: 'active',
      createdAt: new Date().toISOString(),
      ...data,
    };
    state.projects.push(project);
    save();
    return project;
  }

  function updateProject(id, updates) {
    const idx = state.projects.findIndex(p => p.id === id);
    if (idx === -1) return null;
    state.projects[idx] = { ...state.projects[idx], ...updates };
    save();
    return state.projects[idx];
  }

  function deleteProject(id) {
    state.projects = state.projects.filter(p => p.id !== id);
    state.tasks = state.tasks.map(t => t.projectId === id ? { ...t, projectId: null } : t);
    save();
  }

  function getProjectProgress(projectId) {
    const tasks = getTasksForProject(projectId);
    if (!tasks.length) return { total: 0, completed: 0, pct: 0 };
    const completed = tasks.filter(t => t.status === 'completed').length;
    return { total: tasks.length, completed, pct: Math.round((completed / tasks.length) * 100) };
  }

  // -- Recurring tasks ------------------------------------

  function getRecurrences() { return state.recurrences; }

  function addRecurrence(data) {
    const rec = {
      id: Utils.uid(),
      title: '',
      notes: '',
      priority: 'normal',
      projectId: null,
      estimatedMinutes: null,
      frequency: 'daily',
      daysOfWeek: [],
      startDate: Utils.todayStr(),
      endDate: null,
      time: null,
      completions: {},
      statuses: {},
      ...data,
    };
    state.recurrences.push(rec);
    save();
    return rec;
  }

  function updateRecurrence(id, updates) {
    const idx = state.recurrences.findIndex(r => r.id === id);
    if (idx === -1) return null;
    state.recurrences[idx] = { ...state.recurrences[idx], ...updates };
    save();
    return state.recurrences[idx];
  }

  function deleteRecurrence(id) {
    state.recurrences = state.recurrences.filter(r => r.id !== id);
    save();
  }

  function toggleRecurrenceCompletion(recId, dateStr) {
    const rec = state.recurrences.find(r => r.id === recId);
    if (!rec) return;
    const completions = { ...rec.completions };
    completions[dateStr] = !completions[dateStr];
    return updateRecurrence(recId, { completions });
  }

  function getRecurrencesForDate(dateStr) {
    return state.recurrences.filter(rec => {
      if (rec.endDate && dateStr > rec.endDate) return false;
      if (dateStr < rec.startDate) return false;
      const d = Utils.parseDate(dateStr);
      const dow = d.getDay();
      if (rec.frequency === 'daily') return true;
      if (rec.frequency === 'weekdays') return dow >= 1 && dow <= 5;
      if (rec.frequency === 'weekly') {
        const startDow = Utils.parseDate(rec.startDate).getDay();
        return dow === startDow;
      }
      if (rec.frequency === 'custom') {
        return (rec.daysOfWeek || []).includes(String(dow));
      }
      return false;
    });
  }

  // -- Calendar Events ------------------------------------

  function getEvents() { return state.events || []; }

  function getEvent(id) {
    return getEvents().find(e => e.id === id) || null;
  }

  function addEvent(data) {
    const event = {
      id: Utils.uid(),
      title: '',
      description: '',
      startDate: Utils.todayStr(),
      endDate: null,
      startTime: null,
      endTime: null,
      allDay: true,
      type: 'event',
      mark: 'circle',
      color: 'muted',
      recurrenceRule: null,
      exceptions: {},   // { [dateStr]: { deleted: true } | { ...overrides } }
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...data,
    };
    if (!state.events) state.events = [];
    state.events.push(event);
    save();
    return event;
  }

  function updateEvent(id, updates) {
    const idx = state.events.findIndex(e => e.id === id);
    if (idx === -1) return null;
    state.events[idx] = {
      ...state.events[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    save();
    return state.events[idx];
  }

  function deleteEvent(id) {
    state.events = state.events.filter(e => e.id !== id);
    save();
  }

  /**
   * Delete a single occurrence of a recurring event.
   * Adds an exception for that date.
   */
  function deleteEventOccurrence(id, dateStr) {
    const event = getEvent(id);
    if (!event) return;
    const exceptions = { ...event.exceptions, [dateStr]: { deleted: true } };
    updateEvent(id, { exceptions });
  }

  /**
   * Update a single occurrence of a recurring event.
   * Stores overrides in exceptions.
   */
  function updateEventOccurrence(id, dateStr, overrides) {
    const event = getEvent(id);
    if (!event) return;
    const exceptions = {
      ...event.exceptions,
      [dateStr]: { ...event.exceptions[dateStr], ...overrides, deleted: false },
    };
    updateEvent(id, { exceptions });
  }

  /**
   * Truncate a recurring event's series from a date onward.
   */
  function truncateEventSeries(id, fromDateStr) {
    const event = getEvent(id);
    if (!event || !event.recurrenceRule) return;
    const prevDay = Utils.addDays(fromDateStr, -1);
    updateEvent(id, {
      recurrenceRule: { ...event.recurrenceRule, endDate: prevDay },
    });
  }

  /**
   * Check if an event occurs on a specific date.
   */
  function _isEventOnDate(event, dateStr) {
    if (!event.recurrenceRule) {
      return event.startDate === dateStr;
    }

    const rule = event.recurrenceRule;
    const ruleStart = rule.startDate || event.startDate;

    if (dateStr < ruleStart) return false;
    if (rule.endDate && dateStr > rule.endDate) return false;

    const d = Utils.parseDate(dateStr);
    const startD = Utils.parseDate(ruleStart);
    const dow = d.getDay();
    const dom = d.getDate();

    switch (rule.frequency) {
      case 'daily': {
        const diff = Math.round((d - startD) / 86400000);
        return diff % (rule.interval || 1) === 0;
      }
      case 'weekdays':
        return dow >= 1 && dow <= 5;
      case 'weekly': {
        if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
          return rule.daysOfWeek.includes(String(dow));
        }
        const diffDays = Math.round((d - startD) / 86400000);
        const diffWeeks = Math.floor(diffDays / 7);
        return dow === startD.getDay() && diffWeeks % (rule.interval || 1) === 0;
      }
      case 'monthly': {
        return dom === startD.getDate();
      }
      case 'yearly': {
        return d.getMonth() === startD.getMonth() && dom === startD.getDate();
      }
      default:
        return false;
    }
  }

  /**
   * Get all event occurrences for a specific date.
   * Merges base event with occurrence-specific overrides.
   */
  function getEventsForDate(dateStr) {
    const result = [];
    for (const event of getEvents()) {
      if (!_isEventOnDate(event, dateStr)) continue;

      const ex = (event.exceptions || {})[dateStr];
      if (ex && ex.deleted) continue;

      // Merge override fields from exception
      result.push({
        ...event,
        ...(ex && !ex.deleted ? ex : {}),
        _occurrenceDate: dateStr,
        _eventId: event.id,
      });
    }
    // Sort by startTime (all-day first, then chronological)
    result.sort((a, b) => {
      if (!a.startTime && b.startTime) return -1;
      if (a.startTime && !b.startTime) return 1;
      return (a.startTime || '').localeCompare(b.startTime || '');
    });
    return result;
  }

  /**
   * Get all events for a date range (for month/week rendering).
   * Returns { [dateStr]: event[] }
   */
  function getEventsForDateRange(fromDate, toDate) {
    const result = {};
    const events = getEvents();

    // Walk range
    let cur = new Date(Utils.parseDate(fromDate));
    const end = Utils.parseDate(toDate);

    while (cur <= end) {
      const dateStr = Utils.formatDateKey(cur);
      const dayEvents = getEventsForDate(dateStr);
      if (dayEvents.length > 0) result[dateStr] = dayEvents;
      cur.setDate(cur.getDate() + 1);
    }

    return result;
  }

  // -- Draw Marks (hand-drawn shapes on calendar) --------

  function getDrawMarks() { return state.drawMarks || []; }

  function getDrawMark(id) {
    return getDrawMarks().find(m => m.id === id) || null;
  }

  function getDrawMarksForDate(dateStr) {
    return getDrawMarks().filter(m => m.date === dateStr);
  }

  function addDrawMark(data) {
    const mark = {
      id: Utils.uid(),
      date: Utils.todayStr(),
      shape: 'circle', // 'circle' | 'x'
      // position & size as % of cell
      x: 50, y: 50,     // center x,y in % of cell
      size: 40,         // diameter / crossSize in px
      color: '#ef4444', // hex color
      text: '',
      fontSize: 12,
      createdAt: new Date().toISOString(),
      ...data,
    };
    if (!state.drawMarks) state.drawMarks = [];
    state.drawMarks.push(mark);
    save();
    return mark;
  }

  function updateDrawMark(id, updates) {
    const idx = (state.drawMarks || []).findIndex(m => m.id === id);
    if (idx === -1) return null;
    state.drawMarks[idx] = { ...state.drawMarks[idx], ...updates };
    save();
    return state.drawMarks[idx];
  }

  function deleteDrawMark(id) {
    state.drawMarks = (state.drawMarks || []).filter(m => m.id !== id);
    save();
  }

  // -- Settings -------------------------------------------

  function getSettings() { return state.settings; }

  function updateSettings(updates) {
    state.settings = { ...state.settings, ...updates };
    save();
  }

  // -- Streaks --------------------------------------------

  function getStreakData() {
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = Utils.formatDateKey(d);
      const dayTasks = getTasksForDate(dateStr);
      const dayRecs = getRecurrencesForDate(dateStr);
      const totalTasks = dayTasks.length + dayRecs.length;
      let completedCount = dayTasks.filter(t => t.status === 'completed').length
        + dayRecs.filter(r => r.completions && r.completions[dateStr]).length;
      const done = totalTasks > 0 && completedCount >= totalTasks;
      result.push({ dateStr, done, abbr: d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0,2) });
    }
    let streak = 0;
    for (let i = result.length - 2; i >= 0; i--) {
      if (result[i].done) streak++;
      else break;
    }
    return { days: result, streak };
  }

  // -- Import / Export ------------------------------------

  function exportData() {
    return JSON.stringify({
      version: 2,
      exportedAt: new Date().toISOString(),
      tasks: state.tasks,
      projects: state.projects,
      recurrences: state.recurrences,
      events: state.events || [],
      drawMarks: state.drawMarks || [],
      settings: state.settings,
    }, null, 2);
  }

  function importData(json) {
    try {
      const data = JSON.parse(json);
      if (!data.version) throw new Error('Invalid format');
      if (data.tasks)       state.tasks = data.tasks;
      if (data.projects)    state.projects = data.projects;
      if (data.recurrences) state.recurrences = data.recurrences;
      if (data.events)      state.events = data.events;
      if (data.drawMarks)   state.drawMarks = data.drawMarks;
      if (data.settings)    state.settings = { ...state.settings, ...data.settings };
      save();
      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  }

  function getDeviceCode() {
    let code = localStorage.getItem('planner_device_code');
    if (!code || code.length !== 4) {
      code = '7924';
      localStorage.setItem('planner_device_code', code);
    }
    return code;
  }

  function generateDataCode() {
    const code = getDeviceCode();
    try {
      const json = exportData();
      localStorage.setItem(`planner_code_${code}`, json);
    } catch (e) {
      console.warn('Failed to register code:', e);
    }
    return code;
  }

  function loadDataCode(codeStr) {
    const code = (codeStr || '').trim().toUpperCase();
    if (!code) return false;

    const saved = localStorage.getItem(`planner_code_${code}`);
    if (saved) {
      return importData(saved);
    }

    if (code === '7924') {
      SeedData.seed();
      SeedData.ensureSeptemberWork();
      return true;
    }

    try {
      let b64 = code;
      if (b64.startsWith('PLN-')) b64 = b64.slice(4);
      const json = decodeURIComponent(atob(b64));
      return importData(json);
    } catch (e) {
      return false;
    }
  }

  function getDeviceId() {
    if (!state.settings.deviceId) {
      state.settings.deviceId = 'DEV-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      save();
    }
    return state.settings.deviceId;
  }

  function clearAllData() {
    state.tasks = [];
    state.projects = [];
    state.recurrences = [];
    state.events = [];
    state.drawMarks = [];
    save();
  }

  function clearCompleted() {
    state.tasks = state.tasks.filter(t => t.status !== 'completed');
    save();
  }

  return {
    load, save, subscribe, getState,
    getTasks, getTask, addTask, updateTask, deleteTask, completeTask, reorderTask,
    getTasksForDate, getInboxTasks, getTasksForProject, getOverdueTasks,
    addSubtask, toggleSubtask, deleteSubtask,
    getProjects, getProject, addProject, updateProject, deleteProject, getProjectProgress,
    getRecurrences, addRecurrence, updateRecurrence, deleteRecurrence,
    toggleRecurrenceCompletion, getRecurrencesForDate,
    getEvents, getEvent, addEvent, updateEvent, deleteEvent,
    deleteEventOccurrence, updateEventOccurrence, truncateEventSeries,
    getEventsForDate, getEventsForDateRange,
    getDrawMarks, getDrawMark, getDrawMarksForDate, addDrawMark, updateDrawMark, deleteDrawMark,
    getSettings, updateSettings,
    getStreakData,
    exportData, importData, generateDataCode, loadDataCode, getDeviceCode, getDeviceId, clearAllData, clearCompleted,
  };
})();
