import type { Catalog, Talk, TalkView } from './types';

/** Joins a talk with its track, room and speakers. Returns undefined when a reference is dangling. */
export function resolveTalk(catalog: Catalog, talk: Talk): TalkView | undefined {
  const track = catalog.tracks.find((t) => t.id === talk.trackId);
  const room = catalog.rooms.find((r) => r.id === talk.roomId);
  if (!track || !room) return undefined;
  const speakers = talk.speakerIds.flatMap((id) => catalog.speakers.filter((s) => s.id === id));
  return { talk, track, room, speakers };
}
