import type { Track } from '@agenda/core';

export type TrackFilterProps = {
  tracks: readonly Track[];
  value: string; // 'all' or a track id
  onChange: (value: string) => void; // receives 'all' or the chosen track id
};

export function TrackFilter({ tracks, value, onChange }: TrackFilterProps) {
  return (
    <label>
      Track{' '}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="all">All tracks</option>
        {tracks.map((track) => (
          <option key={track.id} value={track.id}>
            {track.name}
          </option>
        ))}
      </select>
    </label>
  );
}
