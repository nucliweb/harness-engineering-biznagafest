import type { Track } from '@agenda/core';
import styles from './TrackBadge.module.css';

export type TrackBadgeProps = {
  track: Track;
};

export function TrackBadge({ track }: TrackBadgeProps) {
  const tone = styles[track.id] ?? styles.other;
  return <span className={`${styles.badge} ${tone}`}>{track.name}</span>;
}
