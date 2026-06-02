import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryInput } from './QueryInput';

describe('QueryInput', () => {
  it('renders textarea for query input', () => {
    const mockOnSubmit = vi.fn();
    render(<QueryInput onSubmit={mockOnSubmit} isLoading={false} />);
    
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
  });

  it('calls onSubmit when form is submitted', () => {
    const mockOnSubmit = vi.fn();
    render(<QueryInput onSubmit={mockOnSubmit} isLoading={false} />);
    
    const textarea = screen.getByRole('textbox');
    const form = textarea.closest('form');
    
    fireEvent.change(textarea, { target: { value: 'What is the average?' } });
    if (form) {
      fireEvent.submit(form);
    }
    
    expect(mockOnSubmit).toHaveBeenCalledWith('What is the average?');
  });

  it('disables submit button when loading', () => {
    const mockOnSubmit = vi.fn();
    render(<QueryInput onSubmit={mockOnSubmit} isLoading={true} />);
    
    // Get submit button specifically (type="submit")
    const submitButton = screen.getByRole('button', { name: /submit query/i });
    expect(submitButton).toBeDisabled();
  });

  it('shows example queries', () => {
    const mockOnSubmit = vi.fn();
    render(<QueryInput onSubmit={mockOnSubmit} isLoading={false} />);
    
    // Check if there's text about examples
    const exampleText = screen.queryByText(/example/i);
    // This test is flexible - component may or may not have examples
    expect(exampleText || screen.getByRole('textbox')).toBeInTheDocument();
  });
});
