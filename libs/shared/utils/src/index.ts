export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${String(value)}`);
}

export function formatRelativeCount(count: number, label: string): string {
  return `${count.toLocaleString()} ${count === 1 ? label : `${label}s`}`;
}

/** Up-to-two-letter uppercase initials from a person's name. */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/**
 * Mongolian relative-time label for a past ISO timestamp. Single source for
 * every list (members, invites, ...) so the thresholds cannot drift.
 */
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (minutes < 1) return 'дөнгөж сая';
  if (minutes < 60) return `${minutes} минутын өмнө`;
  if (hours < 24) return `${hours} цагийн өмнө`;
  if (days < 7) return `${days} өдрийн өмнө`;
  return date.toLocaleDateString('mn-MN');
}
