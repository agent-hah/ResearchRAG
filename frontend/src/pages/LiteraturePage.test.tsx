import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LiteraturePage } from './LiteraturePage'
import { useQuery } from '@tanstack/react-query'

// Mock dependencies
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}))

vi.mock('../components/literature/PDFViewer', () => ({
  PDFViewer: ({ fileUrl }: { fileUrl: string }) => <div data-testid="pdf-viewer">{fileUrl}</div>,
}))

vi.mock('lucide-react', () => ({
  FileText: () => <div data-testid="icon-file-text" />,
  ArrowLeft: () => <div data-testid="icon-arrow-left" />,
}))

describe('LiteraturePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any)

    render(<LiteraturePage />)
    expect(screen.getByText('Literature')).toBeInTheDocument()
    const loadingSkeletons = document.querySelectorAll('.animate-pulse')
    expect(loadingSkeletons.length).toBe(3)
  })

  it('renders error state', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to load'),
    } as any)

    render(<LiteraturePage />)
    expect(screen.getByText('Failed to load literature. Please try again.')).toBeInTheDocument()
  })

  it('renders empty state', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any)

    render(<LiteraturePage />)
    expect(screen.getByText('No literature uploaded yet')).toBeInTheDocument()
  })

  it('renders list of literature files', () => {
    const mockFiles = [
      {
        id: '1',
        filename: 'test-paper.pdf',
        created_at: '2023-01-01T00:00:00Z',
        file_size: 1048576, // 1MB
        metadata: { page_count: 10 },
      },
    ]

    vi.mocked(useQuery).mockReturnValue({
      data: mockFiles,
      isLoading: false,
      error: null,
    } as any)

    render(<LiteraturePage />)
    expect(screen.getByText('test-paper.pdf')).toBeInTheDocument()
    expect(screen.getByText('10 pages')).toBeInTheDocument()
    expect(screen.getByText('1.00 MB')).toBeInTheDocument()
  })

  it('handles literature selection and backing out', () => {
    const mockFiles = [
      {
        id: '1',
        filename: 'test-paper.pdf',
        created_at: '2023-01-01T00:00:00Z',
        file_size: 1048576,
      },
    ]

    vi.mocked(useQuery).mockReturnValue({
      data: mockFiles,
      isLoading: false,
      error: null,
    } as any)

    render(<LiteraturePage />)
    
    // Click on the file
    fireEvent.click(screen.getByText('test-paper.pdf'))

    // Should show PDF viewer
    expect(screen.getByTestId('pdf-viewer')).toBeInTheDocument()
    expect(screen.getByTestId('pdf-viewer')).toHaveTextContent('/api/v1/literature/1/download/')
    expect(screen.getByText('test-paper.pdf')).toBeInTheDocument() // Title in viewer header
    
    // Click back
    fireEvent.click(screen.getByText('Back to Literature List'))
    
    // Should show list again
    expect(screen.queryByTestId('pdf-viewer')).not.toBeInTheDocument()
    expect(screen.getByText('Your Literature')).toBeInTheDocument()
  })
})
