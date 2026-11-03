import { describe, expect, it } from 'vitest';
import { filterTalksByTrack } from './filterTalksByTrack';
import { findCurrentSlot } from './findCurrentSlot';
import { groupBySlot } from './groupBySlot';
import type { Slot, Talk } from './types';

const slot = (start: string, end: string): Slot => ({ start, end, talks: [] });
const talk = (id: string, trackId: string, start: string, end: string): Talk => ({
  id,
  title: id,
  abstract: '',
  trackId,
  roomId: 'r1',
  speakerIds: [],
  start,
  end,
});

describe('findCurrentSlot', () => {
  const first = slot('2026-11-14T09:30', '2026-11-14T10:15');
  const second = slot('2026-11-14T10:30', '2026-11-14T11:15');
  const slots = [first, second];

  it('includes the start of a slot', () => {
    expect(findCurrentSlot(slots, '2026-11-14T09:30')).toBe(first);
  });

  it('returns the slot when now is inside it', () => {
    expect(findCurrentSlot(slots, '2026-11-14T10:14')).toBe(first);
  });

  it('excludes the end of a slot', () => {
    expect(findCurrentSlot(slots, '2026-11-14T10:15')).toBeUndefined();
  });

  it('returns undefined between slots', () => {
    expect(findCurrentSlot(slots, '2026-11-14T10:20')).toBeUndefined();
  });

  it('returns undefined before the first slot', () => {
    expect(findCurrentSlot(slots, '2026-11-14T08:00')).toBeUndefined();
  });

  it('returns undefined after the last slot', () => {
    expect(findCurrentSlot(slots, '2026-11-14T11:15')).toBeUndefined();
    expect(findCurrentSlot(slots, '2026-11-14T15:00')).toBeUndefined();
  });

  it('returns undefined on other dates', () => {
    expect(findCurrentSlot(slots, '2026-11-13T09:30')).toBeUndefined();
    expect(findCurrentSlot(slots, '2026-11-15T09:30')).toBeUndefined();
  });

  it('returns the later slot when now is inside it', () => {
    expect(findCurrentSlot(slots, '2026-11-14T10:30')).toBe(second);
  });

  it('returns undefined for no slots', () => {
    expect(findCurrentSlot([], '2026-11-14T09:30')).toBeUndefined();
  });

  it('returns the first slot in the given order when slots overlap', () => {
    const long = slot('2026-11-14T09:30', '2026-11-14T11:00');
    const short = slot('2026-11-14T09:30', '2026-11-14T10:00');
    expect(findCurrentSlot([short, long], '2026-11-14T09:45')).toBe(short);
    expect(findCurrentSlot([long, short], '2026-11-14T09:45')).toBe(long);
  });

  it('follows schedule order for overlapping slots', () => {
    const grouped = groupBySlot([
      talk('a', 'web', '2026-11-14T09:30', '2026-11-14T11:00'),
      talk('b', 'web', '2026-11-14T09:30', '2026-11-14T10:00'),
    ]);
    expect(findCurrentSlot(grouped, '2026-11-14T09:45')?.end).toBe('2026-11-14T10:00');
  });

  it('finds nothing when the track filter hides the running slot', () => {
    const fixture = [
      talk('a', 'data', '2026-11-14T09:30', '2026-11-14T10:15'),
      talk('b', 'web', '2026-11-14T10:30', '2026-11-14T11:15'),
    ];
    expect(
      findCurrentSlot(groupBySlot(filterTalksByTrack(fixture, 'web')), '2026-11-14T09:45'),
    ).toBeUndefined();
    expect(
      findCurrentSlot(groupBySlot(filterTalksByTrack(fixture, 'data')), '2026-11-14T09:45')
        ?.talks.map((t) => t.id),
    ).toEqual(['a']);
  });

  it('does not mutate its input', () => {
    const input = [second, first];
    findCurrentSlot(input, '2026-11-14T09:45');
    expect(input).toEqual([second, first]);
    expect(input[0]).toBe(second);
  });
});
