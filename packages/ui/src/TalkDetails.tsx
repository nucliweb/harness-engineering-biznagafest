import { formatTimeRange, type TalkView } from '@agenda/core';
import styles from './TalkDetails.module.css';
import { TrackBadge } from './TrackBadge';

export type TalkDetailsProps = {
  view: TalkView;
};

export function TalkDetails({ view }: TalkDetailsProps) {
  const { talk, track, room, speakers } = view;
  return (
    <article className={styles.details}>
      <div>
        <TrackBadge track={track} />
      </div>
      <h1 className={styles.title}>{talk.title}</h1>
      <p className={styles.meta}>
        {formatTimeRange(talk.start, talk.end)} · {room.name}
      </p>
      <p>{talk.abstract}</p>
      <ul className={styles.speakers}>
        {speakers.map((speaker) => (
          <li key={speaker.id}>
            {speaker.name} <span className={styles.role}>{speaker.role}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
