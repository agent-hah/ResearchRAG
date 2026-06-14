import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HomePage } from './HomePage'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
  },
}))

vi.mock('@/lib/utils', () => ({
  formatDuration: vi.fn().mockReturnValue('1.5s'),
}))

vi.mock('lucide-react', () => ({
  Files: () => <div data-testid="icon-files" />,
  Database: () => <div data-testid="icon-database" />,
  Search: () => <div data-testid="icon-search" />,
  BarChart3: () => <div data-testid="icon-chart" />,
  Clock: () => <div data-testid="icon-clock" />,
  TrendingUp: () => <div data-testid="icon-trending" />,
  FileText: () => <div data-testid="icon-file-text" />,
  Brain: () => <div data-testid="icon-brain" />,
}))

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders correctly with default/empty data', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
    } as any)

    render(<HomePage />)
    
    expect(screen.getByText('Research Workspace')).toBeInTheDocument()
    expect(screen.getByText('Datasets')).toBeInTheDocument()
    expect(screen.getByText('Literature')).toBeInTheDocument()
    expect(screen.getByText('Indexed Chunks')).toBeInTheDocument()
    expect(screen.getByText('Queries Run')).toBeInTheDocument()
    
    // Values should be 0
    const zeroValues = screen.getAllByText('0')
    expect(zeroValues.length).toBeGreaterThanOrEqual(4)

    // Should show getting started section
    expect(screen.getByText('Getting Started')).toBeInTheDocument()
    expect(screen.getByText('1. Upload Files')).toBeInTheDocument()
    expect(screen.getByText('2. Ask Questions')).toBeInTheDocument()
    expect(screen.getByText('3. Visualize Results')).toBeInTheDocument()
  })

  it('renders data correctly when available', () => {
    vi.mocked(useQuery).mockImplementation(({ queryKey }: any) => {
      if (queryKey[0] === 'files') {
        return { data: { total_datasets: 10, total_literature: 20 } } as any
      }
      if (queryKey[0] === 'rag-stats') {
        return { data: { total_chunks: 500, collection_name: 'test-col', embedding_model: 'model-a', chunk_size: 1000, chunk_overlap: 200 } } as any
      }
      if (queryKey[0] === 'query-history') {
        return { data: { total_count: 5, queries: [{ id: 1, query: 'test q', row_count: 5, literature_count: 2, processing_time_ms: 1500 }] } } as any
      }
      return { data: undefined } as any
    })

    render(<HomePage />)
    
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('20')).toBeInTheDocument()
    expect(screen.getByText('500')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()

    expect(screen.getByText('test q')).toBeInTheDocument()
    expect(screen.getByText('1.5s')).toBeInTheDocument()
    expect(screen.getByText('test-col')).toBeInTheDocument()
    expect(screen.getByText('model-a')).toBeInTheDocument()
    expect(screen.getByText('1000/200')).toBeInTheDocument()

    // Getting started should be hidden when files are present
    expect(screen.queryByText('Getting Started')).not.toBeInTheDocument()
  })

  it('queryFn calls api.get and returns data', async () => {
    let filesQueryFn: any;
    let statsQueryFn: any;
    let historyQueryFn: any;

    vi.mocked(useQuery).mockImplementation((opts: any) => {
      if (opts.queryKey[0] === 'files') filesQueryFn = opts.queryFn;
      if (opts.queryKey[0] === 'rag-stats') statsQueryFn = opts.queryFn;
      if (opts.queryKey[0] === 'query-history') historyQueryFn = opts.queryFn;
      return { data: undefined } as any;
    })

    render(<HomePage />)
    
    vi.mocked(api.get).mockResolvedValue({ data: [] })
    
    expect(await filesQueryFn()).toEqual({
      datasets: [],
      literature: [],
      total_datasets: 0,
      total_literature: 0
    })
    expect(await statsQueryFn()).toEqual([])
    expect(await historyQueryFn()).toEqual([])
  })
})
