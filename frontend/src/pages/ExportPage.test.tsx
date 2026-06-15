import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ExportPage } from './ExportPage'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  api: {
    post: vi.fn(),
  },
}))

vi.mock('../services/fileService', () => ({
  fileService: {
    listFiles: vi.fn(),
  },
}))

vi.mock('../services/queryService', () => ({
  queryService: {
    getQueryHistory: vi.fn(),
  },
}))

vi.mock('../services/notesService', () => ({
  notesService: {
    listNotes: vi.fn(),
  },
}))

vi.mock('lucide-react', () => ({
  Download: () => <div data-testid="icon-download" />,
  FileText: () => <div data-testid="icon-file-text" />,
  Database: () => <div data-testid="icon-database" />,
  Search: () => <div data-testid="icon-search" />,
  StickyNote: () => <div data-testid="icon-sticky-note" />,
  FileDown: () => <div data-testid="icon-file-down" />,
}))

describe('ExportPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:url')
    window.URL.revokeObjectURL = vi.fn()
    window.alert = vi.fn()
  })

  it('renders initial state with empty data', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
    } as any)

    render(<ExportPage />)
    expect(screen.getByText('Export Data')).toBeInTheDocument()
    expect(screen.getByText('No datasets available')).toBeInTheDocument()
    expect(screen.getByText('No query history available')).toBeInTheDocument()
    expect(screen.getByText('No notes available')).toBeInTheDocument()
    expect(screen.getByText('No literature available')).toBeInTheDocument()
  })

  it('renders datasets and allows export', async () => {
    vi.mocked(useQuery).mockImplementation(({ queryKey }: any) => {
      if (queryKey[0] === 'files') {
        return { data: { datasets: [{ id: 1, filename: 'data.csv', metadata: { row_count: 10 } }] } } as any
      }
      return { data: undefined } as any
    })

    vi.mocked(api.post).mockResolvedValue({ data: 'mock-data' })

    render(<ExportPage />)
    
    expect(screen.getByText('data.csv')).toBeInTheDocument()
    
    // Test Dataset CSV export
    fireEvent.click(screen.getAllByText('CSV')[0])
    
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/export/dataset', { dataset_id: 1, format: 'csv' }, { responseType: 'blob' })
    })

    // Test Dataset JSON export
    fireEvent.click(screen.getAllByText('JSON')[0])
    
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/export/dataset', { dataset_id: 1, format: 'json' }, { responseType: 'blob' })
    })
  })

  it('renders queries and allows export', async () => {
    vi.mocked(useQuery).mockImplementation(({ queryKey }: any) => {
      if (queryKey[0] === 'queryHistory') {
        return { data: { queries: [{ id: 1, query: 'test question', created_at: '2023-01-01' }] } } as any
      }
      return { data: undefined } as any
    })

    vi.mocked(api.post).mockResolvedValue({ data: 'mock-data' })

    render(<ExportPage />)
    
    expect(screen.getByText('test question')).toBeInTheDocument()
    
    // Select the query
    fireEvent.click(screen.getByText('test question'))
    
    // Test Query CSV export
    fireEvent.click(screen.getByText('Export Selected as CSV'))
    
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/export/query', { query_ids: [1], format: 'csv' }, { responseType: 'blob' })
    })
  })

  it('renders notes and allows export', async () => {
    vi.mocked(useQuery).mockImplementation(({ queryKey }: any) => {
      if (queryKey[0] === 'notes') {
        return { data: [{ id: 1, content: 'test note' }] } as any
      }
      return { data: undefined } as any
    })

    vi.mocked(api.post).mockResolvedValue({ data: 'mock-data' })

    render(<ExportPage />)
    
    expect(screen.getByText('All Notes')).toBeInTheDocument()
    expect(screen.getByText('Export all 1 note(s)')).toBeInTheDocument()
    
    // Test Notes CSV export
    fireEvent.click(screen.getByText('Export CSV'))
    
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/export/notes', { format: 'csv' }, { responseType: 'blob' })
    })
  })

  it('renders literature and allows PDF export with/without annotations', async () => {
    vi.mocked(useQuery).mockImplementation(({ queryKey }: any) => {
      if (queryKey[0] === 'files') {
        return { data: { literature: [{ id: 1, filename: 'paper.pdf', page_count: 5 }] } } as any
      }
      return { data: undefined } as any
    })

    vi.mocked(api.post).mockResolvedValue({ data: 'mock-data' })

    render(<ExportPage />)
    
    expect(screen.getByText('paper.pdf')).toBeInTheDocument()
    
    // Toggle annotations
    fireEvent.click(screen.getByRole('checkbox'))
    
    // Download
    fireEvent.click(screen.getByText('Download'))
    
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/export/literature/pdf', { literature_id: 1, include_annotations: true }, { responseType: 'blob' })
    })
  })

  it('handles export errors gracefully', async () => {
    vi.mocked(useQuery).mockImplementation(({ queryKey }: any) => {
      if (queryKey[0] === 'notes') {
        return { data: [{ id: 1, content: 'test note' }] } as any
      }
      return { data: undefined } as any
    })

    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(api.post).mockRejectedValue(new Error('Export failed'))

    render(<ExportPage />)
    
    fireEvent.click(screen.getByText('Export CSV'))
    
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Failed to export notes')
    })
  })

  it('tests missing JSON exports', async () => {
    vi.mocked(useQuery).mockImplementation(({ queryKey }: any) => {
      if (queryKey[0] === 'queryHistory') {
        return { data: { queries: [{ id: 1, query: 'test question', created_at: '2023-01-01' }] } } as any
      }
      if (queryKey[0] === 'notes') {
        return { data: [{ id: 1, content: 'test note' }] } as any
      }
      return { data: undefined } as any
    })

    vi.mocked(api.post).mockResolvedValue({ data: 'mock-data' })

    render(<ExportPage />)
    
    // Select the query
    fireEvent.click(screen.getByText('test question'))
    
    // Test Query JSON export
    fireEvent.click(screen.getByText('Export Selected as JSON'))
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/export/query', { query_ids: [1], format: 'json' }, { responseType: 'blob' })
    })

    // Test Notes JSON export
    fireEvent.click(screen.getByText('Export JSON'))
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/export/notes', { format: 'json' }, { responseType: 'blob' })
    })
  })

  it('queryFn calls correct services', async () => {
    let filesQueryFn: any;
    let queryHistoryFn: any;
    let notesQueryFn: any;

    vi.mocked(useQuery).mockImplementation((opts: any) => {
      if (opts.queryKey[0] === 'files') filesQueryFn = opts.queryFn;
      if (opts.queryKey[0] === 'queryHistory') queryHistoryFn = opts.queryFn;
      if (opts.queryKey[0] === 'notes') notesQueryFn = opts.queryFn;
      return { data: undefined } as any;
    })

    render(<ExportPage />)

    const { fileService } = await import('../services/fileService')
    const { queryService } = await import('../services/queryService')
    const { notesService } = await import('../services/notesService')
    
    vi.mocked(fileService.listFiles).mockResolvedValue('files' as any)
    vi.mocked(queryService.getQueryHistory).mockResolvedValue('history' as any)
    vi.mocked(notesService.listNotes).mockResolvedValue('notes' as any)

    expect(await filesQueryFn()).toBe('files')
    expect(await queryHistoryFn()).toBe('history')
    expect(await notesQueryFn()).toBe('notes')
  })
})
