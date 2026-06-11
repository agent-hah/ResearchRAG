import { describe, it, expect, vi, beforeAll } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from './Header';
import { SettingsProvider } from '../../context/SettingsContext';

describe('Header', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      writable: true,
    });
  });
  const renderHeader = () => {
    return render(
      <SettingsProvider>
        <Header />
      </SettingsProvider>
    );
  };

  it('renders default header icons', () => {
    renderHeader();
    expect(screen.getByText('View notifications')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Help')).toBeInTheDocument();
  });

  it('toggles mobile menu', () => {
    renderHeader();
    
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
