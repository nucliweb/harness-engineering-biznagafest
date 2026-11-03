import { describe, expect, it } from 'vitest';
import { groupBySlot } from './groupBySlot';
import type { Talk } from './types';

const talk = (id: string, start: string, end: string, roomId: string): Talk => ({
  id,
  title: id,
  abstract: '',
  trackId: 't1',
  roomId,
  speakerIds: [],
  start,
  end,
});

describe('groupBySlot', () => {
  it('returns no slots for no talks', () => {
    expect(groupBySlot([])).toEqual([]);
  });

  it('groups talks with the same start and end into one slot', () => {
    const slots = groupBySlot([
      talk('a', '2026-11-14T09:00', '2026-11-14T09:45', 'r1'),
      talk('b', '2026-11-14T09:00', '2026-11-14T09:45', 'r2'),
    ]);
    expect(slots).toHaveLength(1);
    expect(slots[0]?.talks.map((t) => t.id)).toEqual(['a', 'b']);
  });

  it('orders slots chronologically regardless of input order', () => {
    const slots = groupBySlot([
      talk('late', '2026-11-14T11:00', '2026-11-14T11:45', 'r1'),
      talk('early', '2026-11-14T09:00', '2026-11-14T09:45', 'r1'),
    ]);
    expect(slots.map((s) => s.start)).toEqual(['2026-11-14T09:00', '2026-11-14T11:00']);
  });

  it('keeps talks with the same start but a different end in separate slots', () => {
    const slots = groupBySlot([
      talk('a', '2026-11-14T09:00', '2026-11-14T09:45', 'r1'),
      talk('b', '2026-11-14T09:00', '2026-11-14T10:30', 'r2'),
    ]);
    expect(slots).toHaveLength(2);
  });
});
