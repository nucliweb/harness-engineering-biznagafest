import { sortByStart } from './sortByStart';
import type { Slot, Talk } from './types';

/** Groups talks that share the same start and end into slots, ordered by time. */
export function groupBySlot(talks: readonly Talk[]): Slot[] {
  const slots: Slot[] = [];
  for (const talk of sortByStart(talks)) {
    const last = slots.at(-1);
    if (last && last.start === talk.start && last.end === talk.end) {
      last.talks.push(talk);
    } else {
      slots.push({ start: talk.start, end: talk.end, talks: [talk] });
    }
  }
  return slots;
}
