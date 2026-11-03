import type { TalkView } from '@agenda/core';
import { anchorLink, type LinkRenderer } from './link';
import styles from './TalkCard.module.css';
import { TrackBadge } from './TrackBadge';

export type TalkCardProps = {
  view: TalkView;
  href: string;
  renderLink?: LinkRenderer;
};

export function TalkCard({ view, href, renderLink = anchorLink }: TalkCardProps) {
  const { talk, track, room, speakers } = view;
  return (
    <article className={styles.card}>
      <TrackBadge track={track} />
      <h3 className={styles.title}>{renderLink({ href, className: styles.link, children: talk.title })}</h3>
      <p className={styles.meta}>
        {speakers.map((speaker) => speaker.name).join(', ')} · {room.name}
      </p>
    </article>
  );
}
