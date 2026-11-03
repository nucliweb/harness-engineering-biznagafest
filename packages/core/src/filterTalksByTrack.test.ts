import { describe, expect, it } from 'vitest';
import { filterTalksByTrack } from './filterTalksByTrack';
import { groupBySlot } from './groupBySlot';
import type { Talk } from './types';

function talk(id: string, trackId: string, start = '2026-11-14T09:00', end = '2026-11-14T09:45'): Talk {
  return { id, title: id, abstract: '', trackId, roomId: 'r1', speakerIds: [], start, end };
}

describe('filterTalksByTrack', () => {
  it('keeps only the talks of the selected track, in input order', () => {
    const result = filterTalksByTrack([talk('a', 'web'), talk('b', 'data'), talk('c', 'web')], 'web');
    expect(result.map((t) => t.id)).toEqual(['a', 'c']);
  });

  it('returns a new array with every talk when the selection is all', () => {
    const input = [talk('a', 'web'), talk('b', 'data')];
    const result = filterTalksByTrack(input, 'all');
    expect(result).toEqual(input);
    expect(result).not.toBe(input);
  });

  it('returns an empty array when no talk belongs to the selected track', () => {
    expect(filterTalksByTrack([talk('a', 'web')], 'nope')).toEqual([]);
  });

  it('returns an empty array for an empty input', () => {
    expect(filterTalksByTrack([], 'web')).toEqual([]);
  });

  it('does not mutate the input array', () => {
    const input = [talk('a', 'web'), talk('b', 'data')];
    const before = input.map((t) => t.id);
    filterTalksByTrack(input, 'nope');
    filterTalksByTrack(input, 'web');
    expect(input.map((t) => t.id)).toEqual(before);
  });

  it('leaves no slot behind when the filter empties it', () => {
    const slots = groupBySlot(
      filterTalksByTrack(
        [
          talk('a', 'web', '2026-11-14T09:00', '2026-11-14T09:45'),
          talk('b', 'data', '2026-11-14T10:00', '2026-11-14T10:45'),
        ],
        'web',
      ),
    );
    expect(slots).toHaveLength(1);
    expect(slots.map((slot) => slot.start)).toEqual(['2026-11-14T09:00']);
    expect(slots.flatMap((slot) => slot.talks.map((t) => t.id))).toEqual(['a']);
  });
});
