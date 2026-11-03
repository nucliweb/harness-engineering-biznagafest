import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TrackBadge } from './TrackBadge';

describe('TrackBadge', () => {
  it('shows the track name', () => {
    render(<TrackBadge track={{ id: 'web', name: 'Web' }} />);
    expect(screen.getByText('Web')).toBeInTheDocument();
  });

  it('renders tracks it has no colour for', () => {
    render(<TrackBadge track={{ id: 'unknown', name: 'Mystery' }} />);
    expect(screen.getByText('Mystery')).toBeInTheDocument();
  });
});
