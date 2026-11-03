import type { TalkView } from '@agenda/core';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TalkCard } from './TalkCard';

const view: TalkView = {
  talk: {
    id: 'fast-by-default',
    title: 'Fast by default',
    abstract: 'Budgets.',
    trackId: 'web',
    roomId: 'harbour',
    speakerIds: ['a', 'b'],
    start: '2026-11-14T11:30',
    end: '2026-11-14T12:15',
  },
  track: { id: 'web', name: 'Web' },
  room: { id: 'harbour', name: 'Harbour' },
  speakers: [
    { id: 'a', name: 'Ada Ferrer', role: 'Engineer' },
    { id: 'b', name: 'Noa Berg', role: 'Designer' },
  ],
};

describe('TalkCard', () => {
  it('links the title to the given href', () => {
    render(<TalkCard view={view} href="/talks/fast-by-default" />);
    expect(screen.getByRole('link', { name: 'Fast by default' })).toHaveAttribute('href', '/talks/fast-by-default');
  });

  it('shows track, speakers and room', () => {
    render(<TalkCard view={view} href="/x" />);
    expect(screen.getByText('Web')).toBeInTheDocument();
    expect(screen.getByText('Ada Ferrer, Noa Berg · Harbour')).toBeInTheDocument();
  });

  it('uses the supplied link renderer', () => {
    render(
      <TalkCard
        view={view}
        href="/x"
        renderLink={({ href, children }) => <button data-href={href}>{children}</button>}
      />,
    );
    expect(screen.getByRole('button', { name: 'Fast by default' })).toHaveAttribute('data-href', '/x');
  });
});
