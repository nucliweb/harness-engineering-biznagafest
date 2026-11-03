import { describe, expect, it } from 'vitest';
import { catalog, rooms, talks, tracks } from './data';
import { resolveTalk } from './resolveTalk';

describe('seed data', () => {
  it('has three rooms and three tracks', () => {
    expect(rooms).toHaveLength(3);
    expect(tracks).toHaveLength(3);
  });

  it('has unique talk ids', () => {
    expect(new Set(talks.map((t) => t.id)).size).toBe(talks.length);
  });

  it('references only existing tracks, rooms and speakers', () => {
    for (const talk of talks) {
      expect(resolveTalk(catalog, talk), talk.id).toBeDefined();
      expect(resolveTalk(catalog, talk)?.speakers).toHaveLength(talk.speakerIds.length);
    }
  });

  it('ends every talk after it starts', () => {
    for (const talk of talks) {
      expect(talk.end > talk.start, talk.id).toBe(true);
    }
  });

  it('never double-books a room', () => {
    const keys = talks.map((t) => `${t.roomId}@${t.start}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
