import type { Catalog, Conference, Room, Speaker, Talk, Track } from './types';

export const conference: Conference = {
  name: 'Malagueta Conf 2026',
  tagline: 'One day of talks about building for the web',
  date: '2026-11-14',
  venue: 'Palau de la Marea',
};

export const tracks: Track[] = [
  { id: 'web', name: 'Web' },
  { id: 'data', name: 'Data' },
  { id: 'craft', name: 'Craft' },
];

export const rooms: Room[] = [
  { id: 'harbour', name: 'Harbour' },
  { id: 'lighthouse', name: 'Lighthouse' },
  { id: 'lagoon', name: 'Lagoon' },
];

export const speakers: Speaker[] = [
  { id: 'ada-ferrer', name: 'Ada Ferrer', role: 'Frontend engineer' },
  { id: 'noa-berg', name: 'Noa Berg', role: 'Design engineer' },
  { id: 'iker-solana', name: 'Iker Solana', role: 'Data engineer' },
  { id: 'mira-okafor', name: 'Mira Okafor', role: 'Staff engineer' },
  { id: 'tomas-vidal', name: 'Tomas Vidal', role: 'Analytics lead' },
  { id: 'lena-kowalski', name: 'Lena Kowalski', role: 'Engineering manager' },
  { id: 'rui-tavares', name: 'Rui Tavares', role: 'Performance engineer' },
  { id: 'sana-malik', name: 'Sana Malik', role: 'Accessibility specialist' },
  { id: 'jonas-lund', name: 'Jonas Lund', role: 'Platform engineer' },
  { id: 'elia-moreno', name: 'Elia Moreno', role: 'Product designer' },
];

const day = conference.date;

const talk = (
  id: string,
  title: string,
  abstract: string,
  trackId: string,
  roomId: string,
  speakerIds: string[],
  start: string,
  end: string,
): Talk => ({ id, title, abstract, trackId, roomId, speakerIds, start: `${day}T${start}`, end: `${day}T${end}` });

export const talks: Talk[] = [
  talk('opening-the-tide', 'Opening the tide: what the web platform shipped this year', 'A quick tour of the platform features that changed how we build.', 'web', 'harbour', ['ada-ferrer'], '09:30', '10:15'),
  talk('tables-that-scale', 'Tables that scale to a million rows', 'Virtualisation, streaming and the limits of the DOM.', 'data', 'lighthouse', ['iker-solana'], '09:30', '10:15'),
  talk('small-components', 'Small components, sharp edges', 'Why the best design systems are the ones with fewer parts.', 'craft', 'lagoon', ['noa-berg'], '09:30', '10:15'),

  talk('routing-without-regret', 'Routing without regret', 'Choosing URLs you will still like in three years.', 'web', 'harbour', ['mira-okafor'], '10:30', '11:15'),
  talk('metrics-people-read', 'Metrics people actually read', 'Dashboards that survive the first week.', 'data', 'lighthouse', ['tomas-vidal', 'iker-solana'], '10:30', '11:15'),
  talk('code-review-as-craft', 'Code review as a craft', 'Reviewing for the next reader, not for the author.', 'craft', 'lagoon', ['lena-kowalski'], '10:30', '11:15'),

  talk('fast-by-default', 'Fast by default', 'Budgets, bundles and the boring wins in performance.', 'web', 'harbour', ['rui-tavares'], '11:30', '12:15'),
  talk('from-logs-to-answers', 'From logs to answers', 'Turning raw event streams into questions you can ask.', 'data', 'lighthouse', ['tomas-vidal'], '11:30', '12:15'),
  talk('accessible-by-construction', 'Accessible by construction', 'Build the semantics first and the styling second.', 'craft', 'lagoon', ['sana-malik', 'elia-moreno'], '11:30', '12:15'),

  talk('monorepos-that-behave', 'Monorepos that behave', 'Package boundaries that hold up under deadline pressure.', 'web', 'harbour', ['jonas-lund'], '14:00', '14:45'),
  talk('schemas-as-contracts', 'Schemas as contracts', 'Types at the edge of your system, and what to do when they lie.', 'data', 'lighthouse', ['iker-solana', 'mira-okafor'], '14:00', '14:45'),
  talk('the-last-ten-percent', 'The last ten percent', 'Polish is a feature. How to ship it on purpose.', 'craft', 'lagoon', ['elia-moreno'], '14:00', '14:45'),
];

export const catalog: Catalog = { tracks, rooms, speakers };
