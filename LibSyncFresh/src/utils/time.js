/**
 * normalizeTimestamp(ts) -> milliseconds
 * formatRelativeDate(ts) -> "Today" / "Yesterday" / "Tomorrow" / "DD MMM YYYY"
 * toLocalString(ts) -> locale date+time string
 */

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && 
         a.getMonth() === b.getMonth() && 
         a.getDate() === b.getDate();
}

export function normalizeTimestamp(ts) {
  if (ts == null) return null;
  if (typeof ts === 'number') return ts < 1e12 ? ts * 1000 : ts;
  if (typeof ts === 'string') {
    if (/^\d{10}$/.test(ts)) return parseInt(ts, 10) * 1000;
    if (/^\d{13}$/.test(ts)) return parseInt(ts, 10);
    const parsed = Date.parse(ts);
    return isNaN(parsed) ? null : parsed;
  }
  if (ts instanceof Date) return ts.getTime();
  return null;
}

export function formatRelativeDate(ts, opts = {}) {
  const ms = normalizeTimestamp(ts);
  if (ms == null) return '';
  
  const d = new Date(ms);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  
  if (isSameDay(d, today)) return opts.todayLabel || 'Today';
  if (isSameDay(d, yesterday)) return opts.yesterdayLabel || 'Yesterday';
  if (isSameDay(d, tomorrow)) return opts.tomorrowLabel || 'Tomorrow';
  
  const dd = String(d.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${dd} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function toLocalString(ts) {
  const ms = normalizeTimestamp(ts);
  if (ms == null) return '';
  return new Date(ms).toLocaleString();
}

export function toLocalDateString(ts, options = {}) {
  const ms = normalizeTimestamp(ts);
  if (ms == null) return '';
  return new Date(ms).toLocaleDateString('en-US', options);
}

export function toLocalTimeString(ts, options = {}) {
  const ms = normalizeTimestamp(ts);
  if (ms == null) return '';
  return new Date(ms).toLocaleTimeString('en-US', options);
}

