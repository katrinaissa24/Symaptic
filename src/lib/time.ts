const rtf = typeof Intl !== 'undefined' && 'RelativeTimeFormat' in Intl ? new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }) : null;

/** "just now", "5 minutes ago", "yesterday", "3 weeks ago"… */
export function relativeTime(ts: number, now = Date.now()): string {
  const s = Math.round((ts - now) / 1000);
  const abs = Math.abs(s);
  if (abs < 45) return 'just now';
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['minute', 60],
    ['hour', 3600],
    ['day', 86400],
    ['week', 604800],
    ['month', 2629800],
    ['year', 31557600],
  ];
  let unit: Intl.RelativeTimeFormatUnit = 'minute';
  let value = s / 60;
  for (let i = 0; i < units.length; i++) {
    const [u, secs] = units[i];
    const next = units[i + 1];
    if (!next || abs < next[1]) {
      unit = u;
      value = s / secs;
      break;
    }
  }
  const rounded = Math.round(value);
  return rtf ? rtf.format(rounded, unit) : `${Math.abs(rounded)} ${unit}${Math.abs(rounded) === 1 ? '' : 's'} ago`;
}

export function absoluteTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
