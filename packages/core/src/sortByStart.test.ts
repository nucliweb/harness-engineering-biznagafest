import { describe, expect, it } from 'vitest';
import { sortByStart } from './sortByStart';
import type { Talk } from './types';

const talk = (id: string, start: string, end: string, roomId = 'r1'): Talk => ({
  id,
  title: id,
  abstract: '',
  trackId: 't1',
  roomId,
  speakerIds: [],
  start,
  end,
});

describe('sortByStart', () => {
  it('orders talks by start time', () => {
    const sorted = sortByStart([
      talk('late', '2026-11-14T11:00', '2026-11-14T11:45'),
      talk('early', '2026-11-14T09:00', '2026-11-14T09:45'),
    ]);
    expect(sorted.map((t) => t.id)).toEqual(['early', 'late']);
  });

  it('breaks ties by end time, then room id', () => {
    const sorted = sortByStart([
      talk('b', '2026-11-14T09:00', '2026-11-14T09:45', 'r2'),
      talk('c', '2026-11-14T09:00', '2026-11-14T10:00', 'r1'),
      talk('a', '2026-11-14T09:00', '2026-11-14T09:45', 'r1'),
    ]);
    expect(sorted.map((t) => t.id)).toEqual(['a', 'b', 'c']);
  });

  it('does not mutate its input', () => {
    const input = [talk('b', '2026-11-14T10:00', '2026-11-14T10:30'), talk('a', '2026-11-14T09:00', '2026-11-14T09:30')];
    sortByStart(input);
    expect(input.map((t) => t.id)).toEqual(['b', 'a']);
  });
});
