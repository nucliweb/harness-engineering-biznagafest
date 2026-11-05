import { filterTalksByTrack, formatTimeRange, groupBySlot, talks } from '@agenda/core';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

function LocationOutput() {
  const { pathname, search } = useLocation();
  return <output aria-label="location">{pathname + search}</output>;
}

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <LocationOutput />
    </MemoryRouter>,
  );

const location = () => screen.getByRole('status', { name: 'location' });
const dataTalks = filterTalksByTrack(talks, 'data');
const markedSlots = () => screen.queryAllByRole('listitem').filter((li) => li.hasAttribute('aria-current'));
const markedHeadings = () => markedSlots().map((li) => within(li).getByRole('heading', { level: 2 }).textContent);

describe('App routes', () => {
  it('shows the event name and every talk on /', () => {
    renderAt('/');
    expect(screen.getByRole('banner')).toHaveTextContent('Malagueta Conf 2026');
    expect(screen.getAllByRole('article')).toHaveLength(talks.length);
  });

  it('shows the talk details on /talks/:id', () => {
    renderAt('/talks/fast-by-default');
    expect(screen.getByRole('heading', { level: 1, name: 'Fast by default' })).toBeInTheDocument();
  });

  it('shows a not-found message for an unknown talk', () => {
    renderAt('/talks/nope');
    expect(screen.getByText('Talk not found.')).toBeInTheDocument();
  });

  it('navigates from the schedule to a talk and back', async () => {
    const user = userEvent.setup();
    renderAt('/');
    await user.click(screen.getByRole('link', { name: 'Fast by default' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Fast by default' })).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Back to schedule' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Schedule' })).toBeInTheDocument();
  });
});

describe('Track filter', () => {
  it('renders the filter with All tracks selected on /', () => {
    renderAt('/');
    const combobox = screen.getByRole('combobox', { name: 'Track' });
    expect(combobox).toHaveDisplayValue('All tracks');
    expect(within(combobox).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'All tracks',
      'Web',
      'Data',
      'Craft',
    ]);
  });

  it('shows only the selected track and writes it to the URL', async () => {
    const user = userEvent.setup();
    renderAt('/');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Track' }), 'data');
    expect(screen.getAllByRole('article')).toHaveLength(dataTalks.length);
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(
      groupBySlot(dataTalks).map((s) => formatTimeRange(s.start, s.end)),
    );
    for (const article of screen.getAllByRole('article')) {
      expect(within(article).getByText('Data')).toBeInTheDocument();
      expect(within(article).queryByText('Web')).toBeNull();
      expect(within(article).queryByText('Craft')).toBeNull();
    }
    expect(location()).toHaveTextContent('/?track=data');
  });

  it('restores every talk when All tracks is selected again', async () => {
    const user = userEvent.setup();
    renderAt('/');
    const combobox = screen.getByRole('combobox', { name: 'Track' });
    await user.selectOptions(combobox, 'data');
    await user.selectOptions(combobox, 'all');
    expect(screen.getAllByRole('article')).toHaveLength(talks.length);
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(groupBySlot(talks).length);
    expect(location()).toHaveTextContent('/');
    expect(location()).not.toHaveTextContent('track=');
  });

  it('reads the track from the URL', () => {
    renderAt('/?track=data');
    expect(screen.getByRole('combobox', { name: 'Track' })).toHaveValue('data');
    expect(screen.getAllByRole('article')).toHaveLength(dataTalks.length);
  });

  it('falls back to All tracks for an unknown track and keeps the URL', () => {
    renderAt('/?track=unknown');
    expect(screen.getByRole('combobox', { name: 'Track' })).toHaveDisplayValue('All tracks');
    expect(screen.getAllByRole('article')).toHaveLength(talks.length);
    expect(location()).toHaveTextContent('/?track=unknown');
  });
});

describe('Current slot', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    { label: 'start of first slot', date: new Date(2026, 10, 14, 9, 30), expected: ['09:30 - 10:15'] },
    { label: 'last minute of first slot', date: new Date(2026, 10, 14, 10, 14), expected: ['09:30 - 10:15'] },
    { label: 'end of first slot', date: new Date(2026, 10, 14, 10, 15), expected: [] },
    { label: 'between slots', date: new Date(2026, 10, 14, 10, 20), expected: [] },
    { label: 'before the first slot', date: new Date(2026, 10, 14, 8, 0), expected: [] },
    { label: 'inside the last slot', date: new Date(2026, 10, 14, 14, 44), expected: ['14:00 - 14:45'] },
    { label: 'after the last slot', date: new Date(2026, 10, 14, 15, 0), expected: [] },
    { label: 'the day before', date: new Date(2026, 10, 13, 9, 30), expected: [] },
    { label: 'the day after', date: new Date(2026, 10, 15, 9, 30), expected: [] },
  ])('highlights $label', ({ date, expected }) => {
    vi.setSystemTime(date);
    renderAt('/');
    expect(markedHeadings()).toEqual(expected);
    expect(markedSlots().map((li) => li.getAttribute('aria-current'))).toEqual(expected.map(() => 'time'));
    expect(screen.queryAllByText('Now')).toHaveLength(expected.length);
    expect(markedSlots().map((li) => within(li).queryByText('Now') !== null)).toEqual(expected.map(() => true));
  });

  it('highlights the running slot within the track filter', () => {
    vi.setSystemTime(new Date(2026, 10, 14, 9, 30));
    renderAt('/?track=data');
    expect(screen.getAllByRole('article')).toHaveLength(dataTalks.length);
    expect(markedHeadings()).toEqual(['09:30 - 10:15']);
    expect(markedSlots().map((li) => within(li).getAllByRole('article').length)).toEqual([1]);
  });

  it('updates without a reload', () => {
    vi.setSystemTime(new Date(2026, 10, 14, 10, 29, 45));
    renderAt('/');
    expect(markedHeadings()).toEqual([]);
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(markedHeadings()).toEqual(['10:30 - 11:15']);
    expect(screen.getAllByText('Now')).toHaveLength(1);
  });

  it('leaves the talk page unchanged', () => {
    vi.setSystemTime(new Date(2026, 10, 14, 11, 45));
    renderAt('/talks/fast-by-default');
    expect(screen.getByRole('heading', { level: 1, name: 'Fast by default' })).toBeInTheDocument();
    expect(screen.queryByText('Now')).toBeNull();
    expect(markedSlots()).toHaveLength(0);
  });
});
