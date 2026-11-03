import { describe, expect, it } from 'vitest';
import { resolveTalk } from './resolveTalk';
import type { Catalog, Talk } from './types';

const catalog: Catalog = {
  tracks: [{ id: 'web', name: 'Web' }],
  rooms: [{ id: 'harbour', name: 'Harbour' }],
  speakers: [
    { id: 's1', name: 'Ada Ferrer', role: 'Engineer' },
    { id: 's2', name: 'Noa Berg', role: 'Designer' },
  ],
};

const talk: Talk = {
  id: 't1',
  title: 'T',
  abstract: '',
  trackId: 'web',
  roomId: 'harbour',
  speakerIds: ['s2', 's1'],
  start: '2026-11-14T09:00',
  end: '2026-11-14T09:45',
};

describe('resolveTalk', () => {
  it('joins track, room and speakers in speaker id order', () => {
    const view = resolveTalk(catalog, talk);
    expect(view?.track.name).toBe('Web');
    expect(view?.room.name).toBe('Harbour');
    expect(view?.speakers.map((s) => s.name)).toEqual(['Noa Berg', 'Ada Ferrer']);
  });

  it('returns undefined when the track does not exist', () => {
    expect(resolveTalk(catalog, { ...talk, trackId: 'nope' })).toBeUndefined();
  });

  it('returns undefined when the room does not exist', () => {
    expect(resolveTalk(catalog, { ...talk, roomId: 'nope' })).toBeUndefined();
  });
});
