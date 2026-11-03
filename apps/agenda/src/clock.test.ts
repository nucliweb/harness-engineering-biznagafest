import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readLocalNow } from './clock';

describe('readLocalNow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('pads hours and minutes and drops seconds', () => {
    vi.setSystemTime(new Date(2026, 10, 14, 9, 5, 59));
    expect(readLocalNow()).toBe('2026-11-14T09:05');
  });

  it('pads month and day', () => {
    vi.setSystemTime(new Date(2026, 0, 3, 14, 30));
    expect(readLocalNow()).toBe('2026-01-03T14:30');
  });

  it('truncates the last millisecond of the year to the minute', () => {
    vi.setSystemTime(new Date(2026, 11, 31, 23, 59, 59, 999));
    expect(readLocalNow()).toBe('2026-12-31T23:59');
  });

  it('formats midnight', () => {
    vi.setSystemTime(new Date(2026, 10, 14, 0, 0));
    expect(readLocalNow()).toBe('2026-11-14T00:00');
  });
});
