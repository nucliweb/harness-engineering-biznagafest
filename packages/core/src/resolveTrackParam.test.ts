import { describe, expect, it } from 'vitest';
import { resolveTrackParam } from './resolveTrackParam';
import type { Track } from './types';

const tracks: Track[] = [
  { id: 'web', name: 'Web' },
  { id: 'data', name: 'Data' },
];

describe('resolveTrackParam', () => {
  it('returns the value when it is a known track id', () => {
    expect(resolveTrackParam(tracks, 'data')).toBe('data');
  });

  it('returns all for null', () => {
    expect(resolveTrackParam(tracks, null)).toBe('all');
  });

  it('returns all for undefined', () => {
    expect(resolveTrackParam(tracks, undefined)).toBe('all');
  });

  it('returns all for an empty string', () => {
    expect(resolveTrackParam(tracks, '')).toBe('all');
  });

  it('returns all for an unknown track id', () => {
    expect(resolveTrackParam(tracks, 'unknown')).toBe('all');
  });

  it('treats ids as case-sensitive', () => {
    expect(resolveTrackParam(tracks, 'Data')).toBe('all');
  });

  it('returns all for the value all when no track is called all', () => {
    expect(resolveTrackParam(tracks, 'all')).toBe('all');
  });
});
