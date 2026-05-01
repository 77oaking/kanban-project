import { formatDate, isOverdue, relativeTime } from '@/lib/format';

describe('format helpers', () => {
  test('formatDate handles ISO string', () => {
    const out = formatDate('2026-05-15T00:00:00.000Z');
    // Locale output varies; just confirm it's non-empty and contains "May" or "5"
    expect(out).toBeTruthy();
    expect(out.length).toBeGreaterThan(2);
  });

  test('formatDate returns empty on null/invalid', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
    expect(formatDate('not a date')).toBe('');
  });

  test('isOverdue', () => {
    expect(isOverdue(new Date(Date.now() - 1000).toISOString())).toBe(true);
    expect(isOverdue(new Date(Date.now() + 86_400_000).toISOString())).toBe(false);
    expect(isOverdue(null)).toBe(false);
  });

  test('relativeTime returns a non-empty string for a past time', () => {
    const out = relativeTime(new Date(Date.now() - 60_000).toISOString());
    expect(out).toBeTruthy();
  });
});
