import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TrackFilter } from './TrackFilter';

const tracks = [
  { id: 'web', name: 'Web' },
  { id: 'data', name: 'Data' },
  { id: 'craft', name: 'Craft' },
];

describe('TrackFilter', () => {
  it('renders a combobox named Track', () => {
    render(<TrackFilter tracks={tracks} value="all" onChange={vi.fn()} />);
    expect(screen.getByRole('combobox', { name: 'Track' })).toBeInTheDocument();
  });

  it('lists All tracks followed by every track', () => {
    render(<TrackFilter tracks={tracks} value="all" onChange={vi.fn()} />);
    const options = screen.getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(['All tracks', 'Web', 'Data', 'Craft']);
    expect(options.map((o) => (o as HTMLOptionElement).value)).toEqual([
      'all',
      'web',
      'data',
      'craft',
    ]);
  });

  it('shows the selected track from the value prop', () => {
    render(<TrackFilter tracks={tracks} value="data" onChange={vi.fn()} />);
    const combobox = screen.getByRole('combobox', { name: 'Track' });
    expect(combobox).toHaveValue('data');
    expect(combobox).toHaveDisplayValue('Data');
  });

  it('shows All tracks when the value is all', () => {
    render(<TrackFilter tracks={tracks} value="all" onChange={vi.fn()} />);
    expect(screen.getByRole('combobox', { name: 'Track' })).toHaveDisplayValue('All tracks');
  });

  it('reports the chosen track id', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TrackFilter tracks={tracks} value="all" onChange={onChange} />);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Track' }), 'data');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('data');
  });

  it('reports all and keeps showing the prop value until the app updates it', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TrackFilter tracks={tracks} value="data" onChange={onChange} />);
    const combobox = screen.getByRole('combobox', { name: 'Track' });
    await user.selectOptions(combobox, 'all');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('all');
    expect(combobox).toHaveValue('data');
  });

  it('is reachable with the keyboard', async () => {
    const user = userEvent.setup();
    render(<TrackFilter tracks={tracks} value="all" onChange={vi.fn()} />);
    await user.tab();
    expect(screen.getByRole('combobox', { name: 'Track' })).toHaveFocus();
  });
});
