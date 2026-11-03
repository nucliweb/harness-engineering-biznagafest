import { catalog, groupBySlot, talks } from '@agenda/core';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ScheduleList } from './ScheduleList';

describe('ScheduleList', () => {
  const slots = groupBySlot(talks);
  const markedSlots = () => screen.getAllByRole('listitem').filter((li) => li.hasAttribute('aria-current'));
  const markedHeadings = () => markedSlots().map((li) => within(li).getByRole('heading', { level: 2 }).textContent);

  it('renders one time heading per slot', () => {
    render(<ScheduleList slots={slots} catalog={catalog} talkHref={(id) => `/talks/${id}`} />);
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(slots.length);
    expect(screen.getByRole('heading', { level: 2, name: '09:30 - 10:15' })).toBeInTheDocument();
  });

  it('renders a card for every talk, linked through talkHref', () => {
    render(<ScheduleList slots={slots} catalog={catalog} talkHref={(id) => `/talks/${id}`} />);
    expect(screen.getAllByRole('article')).toHaveLength(talks.length);
    expect(screen.getByRole('link', { name: 'Fast by default' })).toHaveAttribute('href', '/talks/fast-by-default');
  });

  it('renders nothing for an empty schedule', () => {
    render(<ScheduleList slots={[]} catalog={catalog} talkHref={(id) => id} />);
    expect(screen.queryAllByRole('article')).toHaveLength(0);
  });

  it('marks only the current slot with a Now label and aria-current', () => {
    render(<ScheduleList slots={slots} catalog={catalog} talkHref={(id) => `/talks/${id}`} currentSlot={slots[1]} />);
    expect(markedHeadings()).toEqual(['10:30 - 11:15']);
    expect(markedSlots().map((li) => li.getAttribute('aria-current'))).toEqual(['time']);
    expect(screen.getAllByText('Now')).toHaveLength(1);
    expect(screen.getByText('Now')).toBeVisible();
    expect(
      markedSlots().map((li) => within(li).getByRole('heading', { level: 2 }).nextElementSibling?.textContent),
    ).toEqual(['Now']);
    expect(screen.getByRole('heading', { level: 2, name: '10:30 - 11:15' })).toBeInTheDocument();
  });

  it('marks nothing without a currentSlot', () => {
    render(<ScheduleList slots={slots} catalog={catalog} talkHref={(id) => `/talks/${id}`} />);
    expect(markedSlots()).toHaveLength(0);
    expect(screen.queryByText('Now')).toBeNull();
  });

  it('marks nothing when currentSlot is not one of the slots, even with an equal range', () => {
    render(
      <ScheduleList
        slots={slots}
        catalog={catalog}
        talkHref={(id) => `/talks/${id}`}
        currentSlot={{ start: '2026-11-14T09:30', end: '2026-11-14T10:15', talks: [] }}
      />,
    );
    expect(markedSlots()).toHaveLength(0);
    expect(screen.queryByText('Now')).toBeNull();
  });

  it('follows the currentSlot prop', () => {
    const { rerender } = render(
      <ScheduleList slots={slots} catalog={catalog} talkHref={(id) => `/talks/${id}`} currentSlot={slots[1]} />,
    );
    rerender(
      <ScheduleList slots={slots} catalog={catalog} talkHref={(id) => `/talks/${id}`} currentSlot={slots[2]} />,
    );
    expect(markedHeadings()).toEqual(['11:30 - 12:15']);
    expect(screen.getAllByText('Now')).toHaveLength(1);
    rerender(
      <ScheduleList slots={slots} catalog={catalog} talkHref={(id) => `/talks/${id}`} currentSlot={undefined} />,
    );
    expect(markedSlots()).toHaveLength(0);
    expect(screen.queryByText('Now')).toBeNull();
  });
});
