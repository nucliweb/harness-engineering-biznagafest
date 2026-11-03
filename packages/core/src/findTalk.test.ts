import { describe, expect, it } from 'vitest';
import { findTalk } from './findTalk';
import { talks } from './data';

describe('findTalk', () => {
  it('returns the talk with the given id', () => {
    const first = talks[0];
    expect(first).toBeDefined();
    expect(findTalk(talks, first!.id)).toBe(first);
  });

  it('returns undefined for an unknown id', () => {
    expect(findTalk(talks, 'does-not-exist')).toBeUndefined();
  });
});
