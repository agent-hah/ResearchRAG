import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { Layout } from './Layout';
import { MemoryRouter } from 'react-router-dom';

vi.mock('./Sidebar', () => ({
  Sidebar: () => <div data-testid="sidebar">Sidebar</div>,
}));

vi.mock('./Header', () => ({
  Header: () => <div data-testid="header">Header</div>,
}));

describe('Layout', () => {
  it('renders Sidebar and Header and children', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Layout>
          <div data-testid="child-content">Content</div>
        </Layout>
      </MemoryRouter>
    );

    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('child-content')).toBeInTheDocument();

    // The main wrapper shouldn't have overflow-hidden (not notes page)
    const main = screen.getByTestId('child-content').closest('main');
    expect(main).toHaveClass('py-6');
  });

  it('renders correctly for /notes path', () => {
    render(
      <MemoryRouter initialEntries={['/notes']}>
        <Layout>
          <div data-testid="child-content">Content</div>
        </Layout>
      </MemoryRouter>
    );

    const main = screen.getByTestId('child-content').closest('main');
    expect(main).toHaveClass('flex-1 flex flex-col overflow-hidden');
    expect(main).not.toHaveClass('py-6');
  });
});
