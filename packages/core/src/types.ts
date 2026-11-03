export type Track = {
  id: string;
  name: string;
};

export type Room = {
  id: string;
  name: string;
};

export type Speaker = {
  id: string;
  name: string;
  role: string;
};

export type Talk = {
  id: string;
  title: string;
  abstract: string;
  trackId: string;
  roomId: string;
  speakerIds: string[];
  /** Local date-time without offset, `YYYY-MM-DDTHH:mm`. */
  start: string;
  /** Local date-time without offset, `YYYY-MM-DDTHH:mm`. */
  end: string;
};

export type Slot = {
  start: string;
  end: string;
  talks: Talk[];
};

export type Conference = {
  name: string;
  tagline: string;
  /** `YYYY-MM-DD` */
  date: string;
  venue: string;
};

export type Catalog = {
  tracks: Track[];
  rooms: Room[];
  speakers: Speaker[];
};

export type TalkView = {
  talk: Talk;
  track: Track;
  room: Room;
  speakers: Speaker[];
};
