import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Layout } from './Layout';

describe('Layout', () => {
  it('shows the title in the banner and the children in main', () => {
    render(
      <Layout title="Caleta Conf 2026">
        <p>Content</p>
      </Layout>,
    );
    expect(screen.getByRole('banner')).toHaveTextContent('Caleta Conf 2026');
    expect(screen.getByRole('main')).toHaveTextContent('Content');
  });
});
