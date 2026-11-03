import type { Talk } from './types';

export function sortByStart(talks: readonly Talk[]): Talk[] {
  return [...talks].sort(
    (a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end) || a.roomId.localeCompare(b.roomId),
  );
}
