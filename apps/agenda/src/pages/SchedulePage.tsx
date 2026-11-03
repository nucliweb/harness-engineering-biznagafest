import { catalog, filterTalksByTrack, findCurrentSlot, groupBySlot, resolveTrackParam, talks, tracks } from '@agenda/core';
import { ScheduleList, TrackFilter } from '@agenda/ui';
import { useSearchParams } from 'react-router';
import { useNow } from '../hooks/useNow';
import { routerLink } from '../routerLink';

export function SchedulePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const now = useNow();
  const selection = resolveTrackParam(tracks, searchParams.get('track'));
  const slots = groupBySlot(filterTalksByTrack(talks, selection));
  const currentSlot = findCurrentSlot(slots, now);
  const onTrackChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === 'all') next.delete('track');
    else next.set('track', value);
    setSearchParams(next);
  };

  return (
    <>
      <h1>Schedule</h1>
      <TrackFilter tracks={tracks} value={selection} onChange={onTrackChange} />
      <ScheduleList slots={slots} catalog={catalog} talkHref={(id) => `/talks/${id}`} renderLink={routerLink} currentSlot={currentSlot} />
    </>
  );
}
