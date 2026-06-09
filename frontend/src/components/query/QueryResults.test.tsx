import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { QueryResults } from './QueryResults';

describe('QueryResults', () => {
  const fullResult = {
    id: 'test-id',
    query_id: 'test-query-1',
    question: 'Test question',
    created_at: '2023-01-01T12:00:00Z',
    synthesis: {
      summary: 'Test summary',
      key_findings: ['Finding 1'],
      data_insights: ['Insight 1'],
      literature_insights: ['Lit Insight 1'],
      methodology_notes: 'Test methodology',
      limitations: 'Test limitations'
    },
    data_results: {
      columns: ['col1', 'col2'],
      rows: [['val1', 'val2'], ['val3', null]],
      row_count: 2
    },
    literature_context: [
      {
        literature_id: '1',
        title: 'Test Paper',
        excerpt: 'Test excerpt',
        relevance_score: 0.85
      }
    ],
    sql_query: 'SELECT * FROM test',
    sql_confidence: 0.95
  };

  it('renders question and basic metadata', () => {
    render(<QueryResults result={fullResult} />);
    expect(screen.getByText('Test question')).toBeInTheDocument();
    expect(screen.getByText(/Query executed at/i)).toBeInTheDocument();
  });

  it('renders AI Analysis section with all synthesis parts', () => {
    render(<QueryResults result={fullResult} />);
    expect(screen.getByText('AI Analysis')).toBeInTheDocument();
    expect(screen.getByText('Test summary')).toBeInTheDocument();
    expect(screen.getByText('Finding 1')).toBeInTheDocument();
    expect(screen.getByText('Insight 1')).toBeInTheDocument();
    expect(screen.getByText('Lit Insight 1')).toBeInTheDocument();
    expect(screen.getByText('Test methodology')).toBeInTheDocument();
    expect(screen.getByText('Test limitations')).toBeInTheDocument();
  });

  it('renders Data Results table correctly', () => {
    render(<QueryResults result={fullResult} />);
    expect(screen.getByText('Data Results (2 rows)')).toBeInTheDocument();
    expect(screen.getByText('col1')).toBeInTheDocument();
    expect(screen.getByText('col2')).toBeInTheDocument();
    expect(screen.getByText('val1')).toBeInTheDocument();
    expect(screen.getByText('val2')).toBeInTheDocument();
    expect(screen.getByText('val3')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument(); // null value rendered as -
  });

  it('renders large data results with warning', () => {
    const manyRows = Array(15).fill(['val', 'val']);
    const resultWithManyRows = {
      ...fullResult,
      data_results: {
        columns: ['col1', 'col2'],
        rows: manyRows,
        row_count: 15
      }
    };
    render(<QueryResults result={resultWithManyRows} />);
    expect(screen.getByText('Showing first 10 of 15 rows')).toBeInTheDocument();
    // Verify only 10 are rendered in tbody
    const tbody = screen.getAllByRole('rowgroup')[1];
    expect(tbody.children.length).toBe(10);
  });

  it('renders Literature Context correctly', () => {
    render(<QueryResults result={fullResult} />);
    expect(screen.getByText('Related Literature (1)')).toBeInTheDocument();
    expect(screen.getByText('Test Paper')).toBeInTheDocument();
    expect(screen.getByText('"Test excerpt"')).toBeInTheDocument();
    expect(screen.getByText('85% relevant')).toBeInTheDocument();
  });

  it('renders Generated SQL correctly', () => {
    render(<QueryResults result={fullResult} />);
    expect(screen.getByText('Generated SQL')).toBeInTheDocument();
    expect(screen.getByText('SELECT * FROM test')).toBeInTheDocument();
    expect(screen.getByText('95% confidence')).toBeInTheDocument();
  });

  it('handles partial or empty result gracefully', () => {
    const minimalResult = {
      id: 'minimal-id',
      query_id: 'test-query-2',
      question: 'Minimal question',
      created_at: '2023-01-01T12:00:00Z',
      synthesis: { summary: '', key_findings: [], data_insights: [], literature_insights: [], methodology_notes: '', limitations: '' },
      data_results: { columns: [], rows: [], row_count: 0 },
      literature_context: [],
      sql_query: '',
      sql_confidence: 0
    };
    render(<QueryResults result={minimalResult} />);
    expect(screen.getByText('Minimal question')).toBeInTheDocument();
    expect(screen.queryByText('Key Findings')).not.toBeInTheDocument();
    expect(screen.queryByText('Data Results')).not.toBeInTheDocument();
    expect(screen.queryByText('Related Literature')).not.toBeInTheDocument();
    expect(screen.queryByText('Generated SQL')).not.toBeInTheDocument();
  });
});
