import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryPage } from '@/pages/QueryPage'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'


// Mock dependencies
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}))

vi.mock('@/services/queryService', () => ({
  queryService: {
    getQueryHistory: vi.fn(),
  },
}))


vi.mock('@/components/query/QueryInput', () => ({
  QueryInput: ({ onSubmit, isLoading }: any) => (
    <div data-testid="query-input">
      <button type="button" onClick={() => onSubmit('test question')} disabled={isLoading}>Submit</button>
      <button type="button" onClick={() => onSubmit('')} disabled={isLoading}>Submit Empty</button>
    </div>
  ),
}))

vi.mock('@/components/query/QueryResults', () => ({
  QueryResults: ({ result }: any) => <div data-testid="query-results">{result.question}</div>,
}))

vi.mock('@/components/query/QueryHistory', () => ({
  QueryHistory: ({ history, onSelectQuery }: any) => (
    <div data-testid="query-history">
      {history.map((h: any) => (
        <button type="button" key={h.id} onClick={() => onSelectQuery(h.id.toString())}>{h.query}</button>
      ))}
    </div>
  ),
}))

vi.mock('@/components/visualization/VisualizationPanel', () => ({
  VisualizationPanel: ({ onClose }: any) => (
    <div data-testid="viz-panel">
      <button type="button" onClick={onClose}>Close Viz</button>
    </div>
  ),
}))


vi.mock('lucide-react', () => ({
  AlertCircle: () => <div data-testid="icon-alert" />,
  BarChart3: () => <div data-testid="icon-chart" />,
}))

describe('QueryPage', () => {
  const mockMutate = vi.fn()
  const mockInvalidateQueries = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useQueryClient).mockReturnValue({
      invalidateQueries: mockInvalidateQueries,
    } as any)

    vi.mocked(useQuery).mockReturnValue({
      data: { queries: [] },
      isLoading: false,
    } as any)

    vi.mocked(useMutation).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    } as any)


  })

  it('renders initial state correctly', () => {
    render(<MemoryRouter><QueryPage /></MemoryRouter>)
    expect(screen.getByText('Query')).toBeInTheDocument()
    expect(screen.getByText('Ready to explore your data')).toBeInTheDocument()
    expect(screen.getByTestId('query-input')).toBeInTheDocument()
    expect(screen.getByTestId('query-history')).toBeInTheDocument()
  })

  it('submits a query successfully', () => {
    render(<MemoryRouter><QueryPage /></MemoryRouter>)
    fireEvent.click(screen.getByText('Submit'))
    expect(mockMutate).toHaveBeenCalledWith({ query: 'test question' })
  })

  it('shows error when submitting empty query', () => {
    render(<MemoryRouter><QueryPage /></MemoryRouter>)
    fireEvent.click(screen.getByText('Submit Empty'))
    expect(screen.getByText('Please enter a question')).toBeInTheDocument()
    expect(mockMutate).not.toHaveBeenCalled()
  })

  it('displays loading state while mutating', () => {
    vi.mocked(useMutation).mockReturnValue({
      mutate: mockMutate,
      isPending: true,
    } as any)
    
    render(<MemoryRouter><QueryPage /></MemoryRouter>)
    expect(screen.getByText('Processing your query...')).toBeInTheDocument()
  })

  it('handles mutation success and shows results', () => {
    let onSuccessCb: any;
    vi.mocked(useMutation).mockImplementation(({ onSuccess }: any) => {
      onSuccessCb = onSuccess;
      return { mutate: mockMutate, isPending: false } as any;
    })

    render(<MemoryRouter><QueryPage /></MemoryRouter>)
    
    act(() => {
      onSuccessCb({ question: 'test question', data_results: { row_count: 5, columns: [], rows: [] } })
    })

    expect(screen.getByTestId('query-results')).toHaveTextContent('test question')
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['queryHistory'] })
    expect(screen.getByText('Show Charts')).toBeInTheDocument()
  })

  it('handles visualization toggling', () => {
    let onSuccessCb: any;
    vi.mocked(useMutation).mockImplementation(({ onSuccess }: any) => {
      onSuccessCb = onSuccess;
      return { mutate: mockMutate, isPending: false } as any;
    })

    render(<MemoryRouter><QueryPage /></MemoryRouter>)
    act(() => {
      onSuccessCb({ question: 'test question', data_results: { row_count: 5, columns: [], rows: [] } })
    })

    // Open Viz
    fireEvent.click(screen.getByText('Show Charts'))
    expect(screen.getByTestId('viz-panel')).toBeInTheDocument()
    expect(screen.queryByTestId('query-results')).not.toBeInTheDocument()

    // Close Viz
    fireEvent.click(screen.getByText('Close Viz'))
    expect(screen.queryByTestId('viz-panel')).not.toBeInTheDocument()
    expect(screen.getByTestId('query-results')).toBeInTheDocument()
  })


  it('handles mutation error', () => {
    let onErrorCb: any;
    vi.mocked(useMutation).mockImplementation(({ onError }: any) => {
      onErrorCb = onError;
      return { mutate: mockMutate, isPending: false } as any;
    })

    render(<MemoryRouter><QueryPage /></MemoryRouter>)
    
    act(() => {
      onErrorCb({ response: { data: { detail: 'Server error occurred' } } })
    })
    expect(screen.getByText('Server error occurred')).toBeInTheDocument()

    act(() => {
      onErrorCb({ response: { data: { message: 'Message error' } } })
    })
    expect(screen.getByText('Message error')).toBeInTheDocument()

    act(() => {
      onErrorCb({ message: 'Generic error' })
    })
    expect(screen.getByText('Generic error')).toBeInTheDocument()
  })

  it('handles history selection with fully cached data', () => {
    const historyItem = {
      id: 1,
      query: 'history query',
      sql_query: 'SELECT * FROM table',
      data_results: { row_count: 1 },
      synthesis: 'summary',
      created_at: '2023-01-01',
    }

    vi.mocked(useQuery).mockReturnValue({
      data: { queries: [historyItem] },
      isLoading: false,
    } as any)

    render(<MemoryRouter><QueryPage /></MemoryRouter>)
    
    fireEvent.click(screen.getByText('history query'))
    expect(screen.getByTestId('query-results')).toHaveTextContent('history query')
  })

  it('handles history selection without cached data', () => {
    const historyItem = {
      id: 2,
      query: 'history query 2',
      // missing data_results and synthesis
    }

    vi.mocked(useQuery).mockReturnValue({
      data: { queries: [historyItem] },
      isLoading: false,
    } as any)

    render(<MemoryRouter><QueryPage /></MemoryRouter>)
    
    fireEvent.click(screen.getByText('history query 2'))
    expect(mockMutate).toHaveBeenCalledWith({ query: 'history query 2' })
  })

  it('handles history selection with completely empty query text', () => {
    const historyItem = { id: 3, query: '' } // empty query
    vi.mocked(useQuery).mockReturnValue({
      data: { queries: [historyItem] },
      isLoading: false,
    } as any)

    render(<MemoryRouter><QueryPage /></MemoryRouter>)
    
    act(() => {
      // Because query is empty, the button text is empty. We can query it by role
      const buttons = screen.getAllByRole('button')
      // Submit, Submit Empty, and the history item
      fireEvent.click(buttons[buttons.length - 1])
    })
    expect(screen.getByText('Cannot load this query - query text is missing')).toBeInTheDocument()
  })

  it('handles query history queryFn', async () => {
    let historyQueryFn: any;
    vi.mocked(useQuery).mockImplementation((opts: any) => {
      if (opts.queryKey[0] === 'queryHistory') historyQueryFn = opts.queryFn;
      return { data: undefined } as any;
    })
    
    render(<MemoryRouter><QueryPage /></MemoryRouter>)
    
    const { queryService } = await import('@/services/queryService')
    vi.mocked(queryService.getQueryHistory).mockResolvedValue('history' as any)
    expect(await historyQueryFn()).toBe('history')
  })

  it('handles array detail format in mutation error', () => {
    let onErrorCb: any;
    vi.mocked(useMutation).mockImplementation(({ onError }: any) => {
      onErrorCb = onError;
      return { mutate: mockMutate, isPending: false } as any;
    })

    render(<MemoryRouter><QueryPage /></MemoryRouter>)
    
    act(() => {
      onErrorCb({ response: { data: { detail: [{ loc: ['body', 'q'], msg: 'invalid' }] } } })
    })
    expect(screen.getByText('body → q: invalid')).toBeInTheDocument()
  })
})
