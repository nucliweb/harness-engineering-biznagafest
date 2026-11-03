import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNow } from './useNow';

describe('useNow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 14, 9, 30, 50));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the local time on first render', () => {
    const { result } = renderHook(() => useNow());
    expect(result.current).toBe('2026-11-14T09:30');
  });

  it('reads again every 30 seconds', () => {
    const { result } = renderHook(() => useNow());
    act(() => {
      vi.advanceTimersByTime(29_999);
    });
    expect(result.current).toBe('2026-11-14T09:30');
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe('2026-11-14T09:31');
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(result.current).toBe('2026-11-14T09:31');
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(result.current).toBe('2026-11-14T09:32');
  });

  it('does not read the clock on a re-render', () => {
    const { result, rerender } = renderHook(() => useNow());
    act(() => {
      vi.advanceTimersByTime(20_000);
    });
    rerender();
    expect(result.current).toBe('2026-11-14T09:30');
  });

  it('clears its timer on unmount', () => {
    const { unmount } = renderHook(() => useNow());
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
