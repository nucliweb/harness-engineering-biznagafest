import { formatTimeRange, resolveTalk, type Catalog, type Slot } from '@agenda/core';
import type { LinkRenderer } from './link';
import styles from './ScheduleList.module.css';
import { TalkCard } from './TalkCard';

export type ScheduleListProps = {
  slots: Slot[];
  catalog: Catalog;
  talkHref: (talkId: string) => string;
  renderLink?: LinkRenderer;
  currentSlot?: Slot | undefined;
};

export function ScheduleList({ slots, catalog, talkHref, renderLink, currentSlot }: ScheduleListProps) {
  return (
    <ol className={styles.list}>
      {slots.map((slot) => {
        const isCurrent = slot === currentSlot;
        return (
          <li
            key={`${slot.start}-${slot.end}`}
            className={isCurrent ? styles.current : undefined}
            aria-current={isCurrent ? 'time' : undefined}
          >
            <h2 className={styles.time}>{formatTimeRange(slot.start, slot.end)}</h2>
            {isCurrent ? <p className={styles.now}>Now</p> : null}
            <ul className={styles.talks}>
              {slot.talks.map((talk) => {
                const view = resolveTalk(catalog, talk);
                if (!view) return null;
                return (
                  <li key={talk.id}>
                    <TalkCard view={view} href={talkHref(talk.id)} renderLink={renderLink} />
                  </li>
                );
              })}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}
