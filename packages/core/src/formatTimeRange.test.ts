import { describe, expect, it } from 'vitest';
import { formatTimeRange } from './formatTimeRange';

describe('formatTimeRange', () => {
  it('shows start and end as 24-hour times', () => {
    expect(formatTimeRange('2026-11-14T09:30', '2026-11-14T10:15')).toBe('09:30 - 10:15');
  });

  it('keeps leading zeros and afternoon hours', () => {
    expect(formatTimeRange('2026-11-14T08:05', '2026-11-14T14:00')).toBe('08:05 - 14:00');
  });
});
