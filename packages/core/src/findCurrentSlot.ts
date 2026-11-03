import type { Slot } from './types';

export function findCurrentSlot(slots: readonly Slot[], now: string): Slot | undefined {
  return slots.find((slot) => slot.start <= now && now < slot.end);
}
