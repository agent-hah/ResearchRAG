import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryInput } from '@/components/query/QueryInput';

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
    
    const submitButton = screen.getByTitle('Submit query (Enter)');
    expect(submitButton).toBeDisabled();
  });

  it('shows example queries', () => {
    const mockOnSubmit = vi.fn();
    render(<QueryInput onSubmit={mockOnSubmit} isLoading={false} />);
    
    const exampleText = screen.getByText('Example queries:');
    expect(exampleText).toBeInTheDocument();
  });

  it('submits when pressing Enter', () => {
    const mockOnSubmit = vi.fn();
    render(<QueryInput onSubmit={mockOnSubmit} isLoading={false} />);
    
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Test query' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    
    expect(mockOnSubmit).toHaveBeenCalledWith('Test query');
  });

  it('does not submit when pressing Shift+Enter', () => {
    const mockOnSubmit = vi.fn();
    render(<QueryInput onSubmit={mockOnSubmit} isLoading={false} />);
    
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Test query' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
    
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('does not submit if query is empty or just whitespace', () => {
    const mockOnSubmit = vi.fn();
    render(<QueryInput onSubmit={mockOnSubmit} isLoading={false} />);
    
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '   ' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('sets query text when an example is clicked', () => {
    const mockOnSubmit = vi.fn();
    render(<QueryInput onSubmit={mockOnSubmit} isLoading={false} />);
    
    const exampleBtn = screen.getByText('What is the average value in my dataset?');
    fireEvent.click(exampleBtn);
    
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveValue('What is the average value in my dataset?');
  });
});

