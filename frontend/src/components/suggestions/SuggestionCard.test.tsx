import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { SuggestionCard } from './SuggestionCard';
import type { DocumentSuggestion } from '../../services/suggestionsService';

const mockSuggestion: DocumentSuggestion = {
  id: 1,
  dataset_id: null,
  title: 'Test Paper',
  authors: 'John Doe',
  publication_year: 2024,
  publication_venue: 'Test Journal',
  citation_count: 42,
  relevance_score: 0.85,
  abstract: 'This is a test abstract.',
  snippet: null,
  search_query: 'test query',
  url: 'http://example.com',
  pdf_url: null,
  is_imported: false,
  is_relevant: null,
  is_dismissed: false,
  doi: '10.1000/xyz123',
  created_at: '2023-01-01T12:00:00Z'
};

describe('SuggestionCard', () => {
  const mockOnMarkRelevant = vi.fn();
  const mockOnMarkIrrelevant = vi.fn();
  const mockOnDismiss = vi.fn();
  const mockOnImport = vi.fn();

  const defaultProps = {
    suggestion: mockSuggestion,
    onMarkRelevant: mockOnMarkRelevant,
    onMarkIrrelevant: mockOnMarkIrrelevant,
    onDismiss: mockOnDismiss,
    onImport: mockOnImport,
  };

  it('renders all details correctly', () => {
    render(<SuggestionCard {...defaultProps} />);
    
    expect(screen.getByText('Test Paper')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('2024')).toBeInTheDocument();
    expect(screen.getByText('Test Journal')).toBeInTheDocument();
    expect(screen.getByText('42 citations')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument(); // relevance score
    expect(screen.getByText('This is a test abstract.')).toBeInTheDocument();
    expect(screen.getByText('Found via: test query')).toBeInTheDocument();
    expect(screen.getByText('DOI: 10.1000/xyz123')).toBeInTheDocument();
    
    const viewLink = screen.getByText('View');
    expect(viewLink).toHaveAttribute('href', 'http://example.com');
  });

  it('handles missing optional fields gracefully', () => {
    const minimalSuggestion: DocumentSuggestion = {
      id: 2,
      dataset_id: null,
      title: 'Minimal Paper',
      authors: null,
      publication_year: null,
      publication_venue: null,
      abstract: null,
      snippet: null,
      search_query: null,
      url: null,
      pdf_url: null,
      doi: null,
      created_at: '2023-01-01T12:00:00Z',
      is_imported: false,
      is_relevant: null,
      is_dismissed: false,
      relevance_score: null,
      citation_count: null,
    };
    
    render(<SuggestionCard {...defaultProps} suggestion={minimalSuggestion} />);
    
    expect(screen.getByText('Minimal Paper')).toBeInTheDocument();
    expect(screen.queryByText('%')).not.toBeInTheDocument();
    expect(screen.queryByText('citations')).not.toBeInTheDocument();
    expect(screen.queryByText('DOI:')).not.toBeInTheDocument();
  });

  it('shows correct relevance score color', () => {
    const { rerender } = render(<SuggestionCard {...defaultProps} suggestion={{ ...mockSuggestion, relevance_score: 0.9 }} />);
    expect(screen.getByText('90%')).toHaveClass('text-green-600');

    rerender(<SuggestionCard {...defaultProps} suggestion={{ ...mockSuggestion, relevance_score: 0.6 }} />);
    expect(screen.getByText('60%')).toHaveClass('text-amber-600');

    rerender(<SuggestionCard {...defaultProps} suggestion={{ ...mockSuggestion, relevance_score: 0.3 }} />);
    expect(screen.getByText('30%')).toHaveClass('text-gray-600');
  });

  it('handles actions correctly', () => {
    render(<SuggestionCard {...defaultProps} />);
    
    fireEvent.click(screen.getByTitle('Mark as relevant'));
    expect(mockOnMarkRelevant).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByTitle('Mark as not relevant'));
    expect(mockOnMarkIrrelevant).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByTitle('Dismiss this suggestion'));
    expect(mockOnDismiss).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByTitle('Import this article'));
    expect(mockOnImport).toHaveBeenCalledWith(1);
  });

  it('renders imported state', () => {
    render(<SuggestionCard {...defaultProps} suggestion={{ ...mockSuggestion, is_imported: true }} />);
    
    expect(screen.getByText('Imported')).toBeInTheDocument();
    expect(screen.queryByTitle('Import this article')).not.toBeInTheDocument();
  });

  it('renders relevant state', () => {
    render(<SuggestionCard {...defaultProps} suggestion={{ ...mockSuggestion, is_relevant: true }} />);
    
    expect(screen.getByText('Relevant')).toBeInTheDocument();
    expect(screen.queryByTitle('Mark as relevant')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Mark as not relevant')).not.toBeInTheDocument();
  });

  it('renders not relevant state', () => {
    render(<SuggestionCard {...defaultProps} suggestion={{ ...mockSuggestion, is_relevant: false }} />);
    
    expect(screen.getByText('Not Relevant')).toBeInTheDocument();
    expect(screen.queryByTitle('Mark as relevant')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Mark as not relevant')).not.toBeInTheDocument();
  });
});
