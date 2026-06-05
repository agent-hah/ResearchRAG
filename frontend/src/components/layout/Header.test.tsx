import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from './Header';

describe('Header', () => {
  it('renders default header icons', () => {
    render(<Header />);
    expect(screen.getByText('View notifications')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Help')).toBeInTheDocument();
  });

  it('toggles mobile menu', () => {
    render(<Header />);
    
    // Initially mobile menu is closed (no "Menu" text, only the text inside buttons)
    expect(screen.queryByText('Menu')).not.toBeInTheDocument();

    const toggleButton = screen.getByText('Open sidebar');
    fireEvent.click(toggleButton);

    // Now mobile menu is open
    expect(screen.getByText('Menu')).toBeInTheDocument();

    // Close mobile menu
    const closeMenuButton = screen.getByText('Close menu');
    fireEvent.click(closeMenuButton);

    expect(screen.queryByText('Menu')).not.toBeInTheDocument();
  });
});
