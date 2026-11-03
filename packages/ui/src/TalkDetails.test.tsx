import type { TalkView } from '@agenda/core';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TalkDetails } from './TalkDetails';

const view: TalkView = {
  talk: {
    id: 't',
    title: 'Fast by default',
    abstract: 'Budgets and bundles.',
    trackId: 'web',
    roomId: 'harbour',
    speakerIds: ['a'],
    start: '2026-11-14T11:30',
    end: '2026-11-14T12:15',
  },
  track: { id: 'web', name: 'Web' },
  room: { id: 'harbour', name: 'Harbour' },
  speakers: [{ id: 'a', name: 'Ada Ferrer', role: 'Frontend engineer' }],
};

describe('TalkDetails', () => {
  it('shows title, time, room and abstract', () => {
    render(<TalkDetails view={view} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Fast by default' })).toBeInTheDocument();
    expect(screen.getByText('11:30 - 12:15 · Harbour')).toBeInTheDocument();
    expect(screen.getByText('Budgets and bundles.')).toBeInTheDocument();
  });

  it('lists every speaker with their role', () => {
    render(<TalkDetails view={view} />);
    expect(screen.getByRole('listitem')).toHaveTextContent('Ada Ferrer Frontend engineer');
  });
});
