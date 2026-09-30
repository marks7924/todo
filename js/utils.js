/**
 * utils.js \u2014 Shared utility functions
 */

const Utils = (() => {

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function todayStr() {
    const d = new Date();
    return formatDateKey(d);
  }

  function formatDateKey(date) {
    const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date;
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function parseDate(str) {
    if (!str) return null;
    return new Date(str + 'T00:00:00');
  }

  function formatDisplayDate(str) {
    if (!str) return '';
    const d = parseDate(str);
    const today = new Date();
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate()+1);
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1);
    if (formatDateKey(d) === formatDateKey(today)) return 'Today';
    if (formatDateKey(d) === formatDateKey(tomorrow)) return 'Tomorrow';
    if (formatDateKey(d) === formatDateKey(yesterday)) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function formatLongDate(date) {
    const d = typeof date === 'string' ? parseDate(date) : date;
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }

  function formatShortDate(str) {
    if (!str) return '';
    const d = parseDate(str);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function formatMonthYear(date) {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  function formatTime(timeStr) {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2,'0')} ${ampm}`;
  }

  function formatDuration(minutes) {
    if (!minutes) return '';
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes/60);
    const m = minutes % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }

  function greeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning.';
    if (h < 17) return 'Good afternoon.';
    if (h < 21) return 'Good evening.';
    return 'Good night.';
  }

  function daysUntil(dateStr) {
    if (!dateStr) return null;
    const today = parseDate(todayStr());
    const target = parseDate(dateStr);
    return Math.round((target - today) / (1000*60*60*24));
  }

  function isOverdue(dateStr) {
    if (!dateStr) return false;
    return daysUntil(dateStr) < 0;
  }

  function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
  }

  function debounce(fn, ms) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  function addDays(dateStr, n) {
    const d = parseDate(dateStr);
    d.setDate(d.getDate() + n);
    return formatDateKey(d);
  }

  // Get weekday occurrences for recurrence
  function getRecurrenceDatesInRange(recurrence, startDate, endDate) {
    const dates = [];
    const start = parseDate(startDate);
    const end = parseDate(endDate);
    let cur = new Date(start);
    while (cur <= end) {
      const dow = cur.getDay(); // 0=Sun
      const key = formatDateKey(cur);
      let matches = false;
      if (recurrence.frequency === 'daily') {
        matches = true;
      } else if (recurrence.frequency === 'weekdays') {
        matches = dow >= 1 && dow <= 5;
      } else if (recurrence.frequency === 'weekly') {
        const startDow = parseDate(recurrence.startDate).getDay();
        matches = dow === startDow;
      } else if (recurrence.frequency === 'custom') {
        const days = recurrence.daysOfWeek || [];
        matches = days.includes(String(dow));
      }
      if (matches) dates.push(key);
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  }

  return {
    uid, todayStr, formatDateKey, parseDate, formatDisplayDate,
    formatLongDate, formatShortDate, formatMonthYear, formatTime,
    formatDuration, greeting, daysUntil, isOverdue, sanitizeHTML,
    escapeRegExp, clamp, debounce, addDays, getRecurrenceDatesInRange
  };
})();
