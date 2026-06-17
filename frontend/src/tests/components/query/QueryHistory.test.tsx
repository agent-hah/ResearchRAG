import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryHistory } from '@/components/query/QueryHistory';

describe('QueryHistory', () => {
  const mockHistory: any = [
    {
      id: '1',
      question: 'What is the average?',
      query: 'SELECT AVG(val) FROM data',
      row_count: 5,
      created_at: '2023-01-01T12:00:00Z',
    },
    {
      id: '2',
      question: 'Show me top 10',
      query: 'SELECT * FROM data LIMIT 10',
      row_count: 10,
      created_at: '2023-01-02T12:00:00Z',
    }
  ];

  it('renders loading state', () => {
    render(<QueryHistory history={[]} onSelectQuery={vi.fn()} isLoading={true} />);
    // There are 3 animated pulses when loading. Not easy to query by text, but we can query by a custom query or check length of animate-pulse elements.
    const { container } = render(<QueryHistory history={[]} onSelectQuery={vi.fn()} isLoading={true} />);
    expect(container.getElementsByClassName('animate-pulse').length).toBeGreaterThan(0);
  });

  it('renders empty state when no history', () => {
    render(<QueryHistory history={[]} onSelectQuery={vi.fn()} isLoading={false} />);
    expect(screen.getByText(/no query history/i)).toBeInTheDocument();
  });

  it('renders list of history queries', () => {
    render(<QueryHistory history={mockHistory} onSelectQuery={vi.fn()} isLoading={false} />);
    
    expect(screen.getByText('SELECT AVG(val) FROM data')).toBeInTheDocument();
    expect(screen.getByText('SELECT * FROM data LIMIT 10')).toBeInTheDocument();
    
    // Check for row counts
    expect(screen.getByText('5 rows')).toBeInTheDocument();
    expect(screen.getByText('10 rows')).toBeInTheDocument();
  });

  it('calls onSelectQuery when a query is clicked', () => {
    const mockOnSelect = vi.fn();
    render(<QueryHistory history={mockHistory} onSelectQuery={mockOnSelect} isLoading={false} />);
    
    const firstQueryButton = screen.getByText('SELECT AVG(val) FROM data').closest('button');
    if (firstQueryButton) {
      fireEvent.click(firstQueryButton);
    }
    
    // According to the prop type, it passes query.id
    expect(mockOnSelect).toHaveBeenCalledWith('1');
  });
});
