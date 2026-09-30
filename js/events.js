/**
 * events.js \u2014 Calendar Events module
 * Handles: event types, marks, colors, event modal, event detail
 */

const Events = (() => {

  // -- Configuration --------------------------------------

  const TYPES = {
    exam:        { label: 'Exam',        mark: 'ring',        color: 'red'    },
    deadline:    { label: 'Deadline',    mark: 'diamond',     color: 'amber'  },
    meeting:     { label: 'Meeting',     mark: 'x',           color: 'blue'   },
    appointment: { label: 'Appointment', mark: 'circle',      color: 'blue'   },
    birthday:    { label: 'Birthday',    mark: 'star',        color: 'rose'   },
    reminder:    { label: 'Reminder',    mark: 'exclamation', color: 'green'  },
    event:       { label: 'Event',       mark: 'circle',      color: 'muted'  },
    custom:      { label: 'Custom',      mark: 'circle',      color: 'muted'  },
  };

  const MARKS = {
    circle:      '\u25cf',
    ring:        '\u25c9',
    diamond:     '\u25c6',
    square:      '\u25a0',
    star:        '\u2605',
    x:           '\u2715',
    exclamation: '!',
    dot:         '\u2022',
  };

  const FREQ_LABELS = {
    daily:    'Every day',
    weekdays: 'Every weekday',
    weekly:   'Every week',
    monthly:  'Every month',
    yearly:   'Every year',
  };

  function getMarkSymbol(mark) {
    return MARKS[mark] || '\u25cf';
  }

  function getTypeLabel(type) {
    return (TYPES[type] || TYPES.event).label;
  }

  // -- Event chip (for calendar cells) -------------------

  /**
   * Build a small chip element for month/week cells.
   */
  function buildMarkBadge(event) {
    const badge = document.createElement('span');
    const shape = event.mark || 'circle';
    const size = event.markSize || 'sm';
    const color = event.color || 'muted';

    badge.className = `cal-mark-badge shape-${shape} mark-${size}`;
    if (color.startsWith('#')) {
      badge.style.setProperty('--mark-color', color);
    } else {
      badge.classList.add(`cal-mark-color-${color}`);
    }

    if (event.markText) {
      const textSpan = document.createElement('span');
      textSpan.className = 'mark-badge-text';
      textSpan.textContent = event.markText;
      badge.appendChild(textSpan);
    } else {
      const symbolMap = {
        circle: '\u25cf', ring: '\u25c9', diamond: '\u25c6', square: '\u25a0',
        star: '\u2605', x: '\u2715', exclamation: '!', dot: '\u2022',
        triangle: '\u25b2', heart: '\u2665'
      };
      badge.textContent = symbolMap[shape] || '\u25cf';
    }

    return badge;
  }

  // -- Event chip (for calendar cells) -------------------

  /**
   * Build a small chip element for month/week cells.
   */
  function buildEventChip(event, dateStr, onClick) {
    const chip = document.createElement('div');
    const colorVal = event.color || 'muted';
    const isCustomHex = colorVal.startsWith('#');
    const colorClass = isCustomHex ? '' : `cal-chip-${colorVal}`;

    chip.className = `cal-event-chip ${colorClass}`;
    if (isCustomHex) {
      chip.style.color = colorVal;
    }
    chip.title = event.title || event.notes || 'Calendar Mark';

    const markBadge = buildMarkBadge(event);
    chip.appendChild(markBadge);

    if (event.title) {
      const title = document.createElement('span');
      title.className = 'cal-event-title';
      title.textContent = event.title;
      chip.appendChild(title);
    }

    if (event.startTime && !event.allDay) {
      const time = document.createElement('span');
      time.className = 'cal-event-chip-time';
      time.textContent = Utils.formatTime(event.startTime);
      chip.appendChild(time);
    }

    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      if (onClick) onClick(event, dateStr);
      else openEventDetail(event._eventId || event.id, dateStr);
    });

    return chip;
  }

  // -- Event detail item (for day detail section) ---------

  /**
   * Build a rich event row for the day detail.
   */
  function buildEventDetailItem(event, dateStr) {
    const item = document.createElement('div');
    item.className = 'cal-detail-event-item';
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');
    item.setAttribute('aria-label', event.title || 'Calendar Mark');

    const markBadge = buildMarkBadge(event);
    markBadge.style.marginRight = '8px';

    const body = document.createElement('div');
    body.className = 'cal-detail-event-body';

    const title = document.createElement('div');
    title.className = 'cal-detail-event-title';
    title.textContent = event.title || 'Calendar Mark';
    body.appendChild(title);

    const typeEl = document.createElement('div');
    typeEl.className = 'cal-detail-event-type';
    typeEl.textContent = getTypeLabel(event.type);
    body.appendChild(typeEl);

    if (!event.allDay && event.startTime) {
      const time = document.createElement('div');
      time.className = 'cal-detail-event-time';
      const endStr = event.endTime ? ` \u2014 ${Utils.formatTime(event.endTime)}` : '';
      time.textContent = Utils.formatTime(event.startTime) + endStr;
      body.appendChild(time);
    }

    if (event.recurrenceRule) {
      const rec = document.createElement('div');
      rec.className = 'cal-detail-event-recurrence';
      rec.textContent = '\u21bb ' + (FREQ_LABELS[event.recurrenceRule.frequency] || 'Recurring');
      body.appendChild(rec);
    }

    if (event.notes) {
      const notes = document.createElement('div');
      notes.className = 'cal-detail-event-notes';
      notes.textContent = event.notes;
      body.appendChild(notes);
    }

    // Actions (edit + delete, visible on hover)
    const actions = document.createElement('div');
    actions.className = 'cal-detail-event-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'task-action-btn';
    editBtn.setAttribute('aria-label', 'Edit event');
    editBtn.title = 'Edit';
    editBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 13 13" fill="none"><path d="M9.5 2L11 3.5 4 10.5H2.5V9L9.5 2z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>`;
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const eventId = event._eventId || event.id;
      if (event.recurrenceRule) {
        openRecurringActionDialog('edit', eventId, dateStr, (scope) => {
          if (scope === 'this' || scope === 'future') {
            openEditModal(eventId, dateStr, scope);
          } else {
            openEditModal(eventId, null, 'all');
          }
        });
      } else {
        openEditModal(eventId, null, 'all');
      }
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'task-action-btn danger';
    deleteBtn.setAttribute('aria-label', 'Delete event');
    deleteBtn.title = 'Delete';
    deleteBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 13 13" fill="none"><path d="M2 3.5h9M4.5 3.5V2.5h4v1M5 5.5v4M8 5.5v4M3 3.5l.5 7h6l.5-7" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const eventId = event._eventId || event.id;
      if (event.recurrenceRule) {
        openRecurringActionDialog('delete', eventId, dateStr, (scope) => {
          handleDelete(eventId, dateStr, scope);
        });
      } else {
        Store.deleteEvent(eventId);
        App.refresh();
        UI.toast('Event deleted.');
      }
    });

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    item.appendChild(markBadge);
    item.appendChild(body);
    item.appendChild(actions);

    item.addEventListener('click', () => openEventDetail(event._eventId || event.id, dateStr));
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') openEventDetail(event._eventId || event.id, dateStr);
    });

    return item;
  }

  // -- Modal management -----------------------------------

  let editingEventId = null;
  let editingScope = 'all'; // 'this' | 'future' | 'all'
  let editingOccurrenceDate = null;

  function openModal(id) {
    const m = document.getElementById(id);
    if (!m) return;
    m.classList.add('open');
    m.removeAttribute('aria-hidden');
  }

  function closeModal(id) {
    const m = document.getElementById(id);
    if (!m) return;
    m.classList.remove('open');
    m.setAttribute('aria-hidden', 'true');
  }

  function closeAllModals() {
    ['event-modal', 'event-detail-modal', 'recur-scope-modal'].forEach(closeModal);
  }

  function openCreateModal(opts = {}) {
    editingEventId = null;
    editingScope = 'all';
    editingOccurrenceDate = null;

    document.getElementById('event-modal-title-text').textContent = 'New mark / event';
    document.getElementById('event-form').reset();

    // Pre-fill date
    const dateVal = opts.date || Utils.todayStr();
    document.getElementById('event-date-input').value = dateVal;

    // Reset defaults
    document.getElementById('event-allday-toggle').checked = true;
    document.getElementById('event-time-row').style.display = 'none';
    document.getElementById('event-recurrence-block').style.display = 'none';
    document.getElementById('event-recur-end-date-field').style.display = 'none';
    document.getElementById('event-recur-count-field').style.display = 'none';
    document.getElementById('event-recur-days-field').style.display = 'none';

    if (document.getElementById('event-mark-text-input')) {
      document.getElementById('event-mark-text-input').value = '';
    }
    if (document.getElementById('event-mark-size-select')) {
      document.getElementById('event-mark-size-select').value = 'sm';
    }

    // Default color: muted
    const defaultColor = document.querySelector('input[name="event-color"][value="muted"]');
    if (defaultColor) defaultColor.checked = true;

    // Default type & mark
    document.getElementById('event-type-select').value = 'event';
    document.getElementById('event-mark-select').value = 'circle';

    document.getElementById('event-modal-submit').textContent = 'Save mark';

    openModal('event-modal');
    requestAnimationFrame(() => document.getElementById('event-title-input').focus());
  }

  function openEditModal(eventId, occurrenceDate = null, scope = 'all') {
    const event = Store.getEvent(eventId);
    if (!event) return;

    editingEventId = eventId;
    editingScope = scope;
    editingOccurrenceDate = occurrenceDate;

    // Get occurrence data (might have overrides)
    const occData = occurrenceDate
      ? (event.exceptions || {})[occurrenceDate] || {}
      : {};
    const merged = { ...event, ...occData };

    document.getElementById('event-modal-title-text').textContent = 'Edit mark / event';
    document.getElementById('event-modal-submit').textContent = 'Save changes';

    document.getElementById('event-title-input').value = merged.title || '';
    document.getElementById('event-date-input').value = occurrenceDate || merged.startDate || '';

    const allDay = merged.allDay !== false;
    document.getElementById('event-allday-toggle').checked = allDay;
    document.getElementById('event-time-row').style.display = allDay ? 'none' : 'grid';
    if (!allDay) {
      document.getElementById('event-start-time').value = merged.startTime || '';
      document.getElementById('event-end-time').value = merged.endTime || '';
    }

    document.getElementById('event-type-select').value = merged.type || 'event';
    document.getElementById('event-mark-select').value = merged.mark || 'circle';
    if (document.getElementById('event-mark-size-select')) {
      document.getElementById('event-mark-size-select').value = merged.markSize || 'sm';
    }
    if (document.getElementById('event-mark-text-input')) {
      document.getElementById('event-mark-text-input').value = merged.markText || '';
    }

    document.getElementById('event-notes-input').value = merged.notes || '';

    const colorVal = merged.color || 'muted';
    if (colorVal.startsWith('#')) {
      const customRadio = document.getElementById('color-radio-custom');
      if (customRadio) customRadio.checked = true;
      const customPicker = document.getElementById('event-custom-color');
      if (customPicker) customPicker.value = colorVal;
    } else {
      const colorInput = document.querySelector(`input[name="event-color"][value="${colorVal}"]`);
      if (colorInput) colorInput.checked = true;
    }

    // Recurrence (only for series edits)
    if (event.recurrenceRule && scope === 'all') {
      const freq = event.recurrenceRule.frequency;
      document.getElementById('event-repeat-select').value = freq;
      toggleRecurrenceBlock(freq);
    } else {
      document.getElementById('event-repeat-select').value = '';
      document.getElementById('event-recurrence-block').style.display = 'none';
    }

    openModal('event-modal');
    requestAnimationFrame(() => document.getElementById('event-title-input').focus());
  }

  function onFormSubmit(e) {
    e.preventDefault();

    let title = document.getElementById('event-title-input').value.trim();
    const markText = document.getElementById('event-mark-text-input')?.value.trim() || '';
    const markSize = document.getElementById('event-mark-size-select')?.value || 'sm';
    const mark = document.getElementById('event-mark-select').value || 'circle';

    if (!title) {
      title = markText || (mark === 'x' ? 'Cross (\u2715)' : mark === 'circle' ? 'Circle (\u25cf)' : 'Calendar Mark');
    }

    const date = document.getElementById('event-date-input').value || Utils.todayStr();
    const allDay = document.getElementById('event-allday-toggle').checked;
    const startTime = allDay ? null : (document.getElementById('event-start-time').value || null);
    const endTime   = allDay ? null : (document.getElementById('event-end-time').value   || null);
    const type  = document.getElementById('event-type-select').value || 'event';
    
    let colorChoice = document.querySelector('input[name="event-color"]:checked')?.value || 'muted';
    if (colorChoice === 'custom') {
      colorChoice = document.getElementById('event-custom-color')?.value || '#3b82f6';
    }

    const notes = document.getElementById('event-notes-input').value.trim();

    // Recurrence
    const repeatFreq = document.getElementById('event-repeat-select').value;
    let recurrenceRule = null;
    if (repeatFreq) {
      const checkedDays = [...document.querySelectorAll('#event-recur-days-group input:checked')].map(i => i.value);
      const endType = document.getElementById('event-recur-end-select').value;
      const endDateVal = document.getElementById('event-recur-end-date').value;
      const countVal = Number(document.getElementById('event-recur-count').value) || 10;

      recurrenceRule = {
        frequency:  repeatFreq,
        interval:   1,
        daysOfWeek: (repeatFreq === 'weekly' || repeatFreq === 'custom') ? checkedDays : [],
        startDate:  date,
        endDate:    endType === 'date'  ? (endDateVal || null) : null,
        occurrences: endType === 'count' ? countVal : null,
      };
    }

    const eventData = {
      title, startDate: date, endDate: date,
      startTime, endTime, allDay,
      type, mark, markText, markSize, color: colorChoice, notes,
    };

    if (!editingEventId) {
      // Create new
      Store.addEvent({ ...eventData, recurrenceRule });
      UI.toast('Mark created.');
    } else if (editingScope === 'this' && editingOccurrenceDate) {
      // Edit one occurrence
      Store.updateEventOccurrence(editingEventId, editingOccurrenceDate, eventData);
      UI.toast('Occurrence updated.');
    } else if (editingScope === 'future' && editingOccurrenceDate) {
      // Truncate old series, create new one starting from this date
      Store.truncateEventSeries(editingEventId, editingOccurrenceDate);
      Store.addEvent({ ...eventData, recurrenceRule });
      UI.toast('Event series updated from this date.');
    } else {
      // Edit entire event
      Store.updateEvent(editingEventId, { ...eventData, recurrenceRule });
      UI.toast('Mark updated.');
    }

    closeModal('event-modal');
    App.refresh();
  }

  // -- Event detail modal ---------------------------------

  function openEventDetail(eventId, dateStr) {
    const event = Store.getEvent(eventId);
    if (!event) return;

    const occEx = dateStr ? (event.exceptions || {})[dateStr] : null;
    const merged = { ...event, ...(occEx && !occEx.deleted ? occEx : {}) };

    const modal = document.getElementById('event-detail-modal');
    const body = document.getElementById('event-detail-body');
    body.innerHTML = '';

    // Header row: mark + type
    const typeRow = document.createElement('div');
    typeRow.className = 'event-detail-type-row';
    typeRow.innerHTML = `
      <span class="event-detail-mark-large cal-mark-${merged.color || 'muted'}">${getMarkSymbol(merged.mark)}</span>
      <span>${getTypeLabel(merged.type)}</span>
    `;
    body.appendChild(typeRow);

    // Fields
    const fieldsDiv = document.createElement('div');
    fieldsDiv.className = 'detail-fields';

    const displayDate = dateStr || merged.startDate;
    appendField(fieldsDiv, 'Date', Utils.formatLongDate(displayDate));

    if (!merged.allDay && merged.startTime) {
      const endStr = merged.endTime ? ` \u2014 ${Utils.formatTime(merged.endTime)}` : '';
      appendField(fieldsDiv, 'Time', Utils.formatTime(merged.startTime) + endStr);
    }

    if (merged.recurrenceRule) {
      appendField(fieldsDiv, 'Repeat', FREQ_LABELS[merged.recurrenceRule.frequency] || 'Recurring');
    }

    body.appendChild(fieldsDiv);

    if (merged.notes) {
      const notesEl = document.createElement('div');
      notesEl.className = 'detail-notes';
      notesEl.innerHTML = `
        <div class="detail-notes-label">Notes</div>
        <div class="detail-notes-text">${Utils.sanitizeHTML(merged.notes)}</div>
      `;
      body.appendChild(notesEl);
    }

    // Actions
    const actions = document.createElement('div');
    actions.className = 'detail-actions';
    actions.style.cssText = 'padding-top:16px; border-top:1px solid var(--border-subtle); margin-top:16px;';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn-ghost';
    editBtn.style.cssText = 'font-size:var(--text-sm);padding:7px 14px';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => {
      closeModal('event-detail-modal');
      if (event.recurrenceRule) {
        openRecurringActionDialog('edit', eventId, dateStr, (scope) => {
          openEditModal(eventId, scope !== 'all' ? dateStr : null, scope);
        });
      } else {
        openEditModal(eventId, null, 'all');
      }
    });

    const dupBtn = document.createElement('button');
    dupBtn.className = 'btn-ghost';
    dupBtn.style.cssText = 'font-size:var(--text-sm);padding:7px 14px';
    dupBtn.textContent = 'Duplicate';
    dupBtn.addEventListener('click', () => {
      closeModal('event-detail-modal');
      Store.addEvent({ ...merged, id: undefined, title: merged.title + ' (copy)', createdAt: undefined, updatedAt: undefined, exceptions: {} });
      App.refresh();
      UI.toast('Event duplicated.');
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-ghost';
    deleteBtn.style.cssText = 'font-size:var(--text-sm);padding:7px 14px;color:var(--danger)';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => {
      closeModal('event-detail-modal');
      if (event.recurrenceRule) {
        openRecurringActionDialog('delete', eventId, dateStr, (scope) => {
          handleDelete(eventId, dateStr, scope);
        });
      } else {
        Store.deleteEvent(eventId);
        App.refresh();
        UI.toast('Event deleted.');
      }
    });

    actions.appendChild(editBtn);
    actions.appendChild(dupBtn);
    actions.appendChild(deleteBtn);
    body.appendChild(actions);

    openModal('event-detail-modal');
  }

  function appendField(container, label, value) {
    const f = document.createElement('div');
    f.className = 'detail-field';
    f.innerHTML = `<div class="detail-field-label">${Utils.sanitizeHTML(label)}</div><div class="detail-field-value">${Utils.sanitizeHTML(value)}</div>`;
    container.appendChild(f);
  }

  // -- Recurring scope dialog -----------------------------

  let _recurCallback = null;

  function openRecurringActionDialog(action, eventId, dateStr, callback) {
    _recurCallback = callback;
    const isDelete = action === 'delete';
    const label = document.getElementById('recur-scope-action-label');
    if (label) label.textContent = isDelete ? 'Delete recurring event' : 'Edit recurring event';
    openModal('recur-scope-modal');
    // Reset to 'this'
    const thisOpt = document.querySelector('input[name="recur-scope"][value="this"]');
    if (thisOpt) thisOpt.checked = true;
  }

  function handleDelete(eventId, dateStr, scope) {
    if (scope === 'this' && dateStr) {
      Store.deleteEventOccurrence(eventId, dateStr);
      UI.toast('Occurrence deleted.');
    } else if (scope === 'future' && dateStr) {
      Store.truncateEventSeries(eventId, dateStr);
      UI.toast('Series truncated from this date.');
    } else {
      Store.deleteEvent(eventId);
      UI.toast('Event series deleted.');
    }
    App.refresh();
  }

  // -- Recurrence block UI helpers ------------------------

  function toggleRecurrenceBlock(freq) {
    const block = document.getElementById('event-recurrence-block');
    const daysField = document.getElementById('event-recur-days-field');

    if (!freq) {
      block.style.display = 'none';
    } else {
      block.style.display = 'block';
      daysField.style.display = (freq === 'weekly') ? 'block' : 'none';
    }
  }

  // -- Init modal bindings --------------------------------

  function initModal() {
    // Main event form
    document.getElementById('event-form').addEventListener('submit', onFormSubmit);
    document.getElementById('event-modal-close').addEventListener('click', () => closeModal('event-modal'));
    document.getElementById('event-modal-cancel').addEventListener('click', () => closeModal('event-modal'));
    document.getElementById('event-modal').addEventListener('click', e => {
      if (e.target === e.currentTarget) closeModal('event-modal');
    });

    // Event detail modal
    document.getElementById('event-detail-close').addEventListener('click', () => closeModal('event-detail-modal'));
    document.getElementById('event-detail-modal').addEventListener('click', e => {
      if (e.target === e.currentTarget) closeModal('event-detail-modal');
    });

    // Recurrence scope modal
    document.getElementById('recur-scope-close').addEventListener('click', () => closeModal('recur-scope-modal'));
    document.getElementById('recur-scope-modal').addEventListener('click', e => {
      if (e.target === e.currentTarget) closeModal('recur-scope-modal');
    });
    document.getElementById('recur-scope-cancel').addEventListener('click', () => closeModal('recur-scope-modal'));
    document.getElementById('recur-scope-confirm').addEventListener('click', () => {
      const scope = document.querySelector('input[name="recur-scope"]:checked')?.value || 'this';
      closeModal('recur-scope-modal');
      if (_recurCallback) _recurCallback(scope);
      _recurCallback = null;
    });

    // All-day toggle
    document.getElementById('event-allday-toggle').addEventListener('change', e => {
      document.getElementById('event-time-row').style.display = e.target.checked ? 'none' : 'grid';
    });

    // Type auto-fills mark + color
    document.getElementById('event-type-select').addEventListener('change', e => {
      const type = TYPES[e.target.value];
      if (type) {
        document.getElementById('event-mark-select').value = type.mark;
        const colorInput = document.querySelector(`input[name="event-color"][value="${type.color}"]`);
        if (colorInput) colorInput.checked = true;
      }
    });

    // Repeat select shows/hides recurrence block
    document.getElementById('event-repeat-select').addEventListener('change', e => {
      toggleRecurrenceBlock(e.target.value);
    });

    // End type
    document.getElementById('event-recur-end-select').addEventListener('change', e => {
      document.getElementById('event-recur-end-date-field').style.display = e.target.value === 'date'  ? 'block' : 'none';
      document.getElementById('event-recur-count-field').style.display  = e.target.value === 'count' ? 'block' : 'none';
    });
  }

  return {
    TYPES, MARKS, FREQ_LABELS,
    getMarkSymbol, getTypeLabel,
    buildEventChip,
    buildEventDetailItem,
    openCreateModal,
    openEditModal,
    openEventDetail,
    closeAllModals,
    initModal,
  };
})();
