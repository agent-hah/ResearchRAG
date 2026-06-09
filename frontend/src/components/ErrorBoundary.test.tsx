import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

// Component that throws an error
const ThrowError = () => {
  throw new Error('Test error');
};

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <div>Safe Content</div>
      </ErrorBoundary>
    );
    expect(getByText('Safe Content')).toBeDefined();
  });

  it('renders fallback UI when an error is thrown', () => {
    // Suppress console.error for this test
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );
    
    expect(getByText('Something went wrong')).toBeDefined();
    expect(getByText(/Test error/)).toBeDefined(); // Should render error details in DEV
    
    consoleError.mockRestore();
  });

  it('handleReload reloads the page', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const originalLocation = window.location;
    // @ts-ignore
    delete window.location;
    window.location = { reload: vi.fn() } as any;

    const { getByText } = render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );
    
    fireEvent.click(getByText('Reload Page'));
    expect(window.location.reload).toHaveBeenCalled();

    (window as any).location = originalLocation;
    consoleError.mockRestore();
  });

  it('handleReset resets error state', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    let shouldThrow = true;
    const DynamicThrow = () => {
      if (shouldThrow) throw new Error('Dynamic error');
      return <div>Recovered</div>;
    };

    const { getByText, queryByText } = render(
      <ErrorBoundary>
        <DynamicThrow />
      </ErrorBoundary>
    );
    
    expect(getByText('Something went wrong')).toBeDefined();
    
    // Fix it to not throw anymore
    shouldThrow = false;
    
    fireEvent.click(getByText('Try Again'));
    
    expect(queryByText('Something went wrong')).toBeNull();
    expect(getByText('Recovered')).toBeDefined();

    consoleError.mockRestore();
  });
});
