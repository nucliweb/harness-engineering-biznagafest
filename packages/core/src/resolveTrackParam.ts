import type { Track } from './types';

export function resolveTrackParam(tracks: readonly Track[], value: string | null | undefined): string {
  if (!value) return 'all';
  return tracks.some((track) => track.id === value) ? value : 'all';
}
