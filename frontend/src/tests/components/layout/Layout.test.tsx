import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { Layout } from '@/components/layout/Layout';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/components/layout/Sidebar', () => ({
  Sidebar: () => <div data-testid="sidebar">Sidebar</div>,
}));

vi.mock('@/components/layout/Header', () => ({
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

    // Check that main wrapper exists
    const main = screen.getByTestId('child-content').closest('main');
    expect(main).toBeInTheDocument();
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
