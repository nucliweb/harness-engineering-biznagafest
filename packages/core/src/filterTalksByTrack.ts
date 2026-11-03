import type { Talk } from './types';

export function filterTalksByTrack(talks: readonly Talk[], selection: string): Talk[] {
  if (selection === 'all') return [...talks];
  return talks.filter((talk) => talk.trackId === selection);
}
