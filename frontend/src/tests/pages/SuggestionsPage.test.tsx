import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SuggestionsPage } from '@/pages/SuggestionsPage'
import { useQuery } from '@tanstack/react-query'

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}))

vi.mock('@/services/fileService', () => ({
  fileService: {
    listDatasets: vi.fn(),
  },
}))

vi.mock('@/components/suggestions/SuggestionsPanel', () => ({
  SuggestionsPanel: ({ datasetIds, datasetNames }: any) => (
    <div data-testid="suggestions-panel">
      {datasetIds?.length > 0 ? `Dataset: ${datasetIds[0]} - ${datasetNames[0]}` : 'Global Context'}
    </div>
  ),
}))

vi.mock('lucide-react', () => ({
  Sparkles: () => <div data-testid="icon-sparkles" />,
  Database: () => <div data-testid="icon-db" />,
  X: () => <div data-testid="icon-x" />,
}))

describe('SuggestionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any)

    render(<SuggestionsPage />)
    expect(screen.getByText('Document Suggestions')).toBeInTheDocument()
    const loadingSkeletons = document.querySelectorAll('.animate-pulse')
    expect(loadingSkeletons.length).toBe(3)
  })

  it('renders error state', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Error'),
    } as any)

    render(<SuggestionsPage />)
    expect(screen.getByText('Failed to load datasets')).toBeInTheDocument()
  })

  it('renders empty datasets state', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any)

    render(<SuggestionsPage />)
    expect(screen.getByText('No datasets uploaded yet')).toBeInTheDocument()
  })

  it('renders datasets and selects global by default', () => {
    const mockDatasets = [
      { id: 1, filename: 'data1.csv', metadata: { row_count: 100 }, created_at: '2023-01-01' },
    ]

    vi.mocked(useQuery).mockReturnValue({
      data: mockDatasets,
      isLoading: false,
      error: null,
    } as any)

    render(<SuggestionsPage />)
    expect(screen.getAllByText('Global Context')[0]).toBeInTheDocument()
    
    fireEvent.click(screen.getByText('Select Datasets'))
    expect(screen.getByText('data1.csv')).toBeInTheDocument()
    expect(screen.getByText('100 rows')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Done'))

    // Global selected by default
    expect(screen.getByTestId('suggestions-panel')).toHaveTextContent('Global Context')
  })

  it('allows selecting a dataset for suggestions', () => {
    const mockDatasets = [
      { id: 1, filename: 'data1.csv', metadata: { row_count: 100 }, created_at: '2023-01-01' },
    ]

    vi.mocked(useQuery).mockReturnValue({
      data: mockDatasets,
      isLoading: false,
      error: null,
    } as any)

    render(<SuggestionsPage />)
    
    fireEvent.click(screen.getByText('Select Datasets'))
    fireEvent.click(screen.getByText('data1.csv'))
    fireEvent.click(screen.getByText('Done'))
    expect(screen.getByTestId('suggestions-panel')).toHaveTextContent('Dataset: 1 - data1.csv')

    fireEvent.click(screen.getAllByText('Global Context')[0])
    expect(screen.getByTestId('suggestions-panel')).toHaveTextContent('Global Context')
  })
})
