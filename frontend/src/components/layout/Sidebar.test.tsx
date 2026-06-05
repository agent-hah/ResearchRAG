import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from './Sidebar';

describe('Sidebar', () => {
  it('renders all navigation items', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Sidebar />
      </MemoryRouter>
    );

    // Check header
    expect(screen.getByText('Research Workspace')).toBeInTheDocument();
    
    // Check nav items
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Files')).toBeInTheDocument();
    expect(screen.getByText('Literature')).toBeInTheDocument();
    expect(screen.getByText('Query')).toBeInTheDocument();
    expect(screen.getByText('Visualization')).toBeInTheDocument();
    expect(screen.getByText('Notes')).toBeInTheDocument();
    expect(screen.getByText('Suggestions')).toBeInTheDocument();
    expect(screen.getByText('Export')).toBeInTheDocument();

    // Check footer
    expect(screen.getByText('Local Database')).toBeInTheDocument();
  });

  it('sets active class based on route', () => {
    render(
      <MemoryRouter initialEntries={['/files']}>
        <Sidebar />
      </MemoryRouter>
    );

    // Home should not be active
    const homeLink = screen.getByText('Home').closest('a');
    expect(homeLink).not.toHaveClass('bg-primary-50');

    // Files should be active
    const filesLink = screen.getByText('Files').closest('a');
    expect(filesLink).toHaveClass('bg-primary-50');
  });
});
