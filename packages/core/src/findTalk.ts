import type { Talk } from './types';

export function findTalk(talks: readonly Talk[], id: string): Talk | undefined {
  return talks.find((talk) => talk.id === id);
}
