import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FilesPage } from '@/pages/FilesPage'
import { useQuery } from '@tanstack/react-query'

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}))

vi.mock('@/services/fileService', () => ({
  fileService: {
    listFiles: vi.fn(),
  },
}))

vi.mock('@/components/files/FileUpload', () => ({
  FileUpload: ({ type, onUploadComplete }: any) => (
    <div data-testid={`file-upload-${type}`}>
      <button onClick={() => onUploadComplete()}>Upload {type}</button>
    </div>
  ),
}))

vi.mock('@/components/files/FileList', () => ({
  FileList: ({ datasets, literature, onPreview }: any) => (
    <div data-testid="file-list">
      <button onClick={() => onPreview(1, 'dataset')}>Preview Dataset</button>
      <button onClick={() => onPreview(2, 'literature')}>Preview Literature</button>
      Datasets: {datasets.length} Lit: {literature.length}
    </div>
  ),
}))

vi.mock('@/components/files/DataPreviewModal', () => ({
  DataPreviewModal: ({ onClose }: any) => (
    <div data-testid="data-preview-modal">
      <button onClick={onClose}>Close Preview</button>
    </div>
  ),
}))

describe('FilesPage', () => {
  const mockRefetch = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useQuery).mockReturnValue({
      data: { datasets: [], literature: [] },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    } as any)
  })

  it('renders correctly', () => {
    render(<FilesPage />)
    expect(screen.getByText('Files')).toBeInTheDocument()
    expect(screen.getByTestId('file-upload-csv')).toBeInTheDocument()
    expect(screen.getByTestId('file-upload-pdf')).toBeInTheDocument()
    expect(screen.getByTestId('file-list')).toBeInTheDocument()
  })

  it('calls refetch on upload complete', () => {
    render(<FilesPage />)
    fireEvent.click(screen.getByText('Upload csv'))
    expect(mockRefetch).toHaveBeenCalledTimes(1)
    
    fireEvent.click(screen.getByText('Upload pdf'))
    expect(mockRefetch).toHaveBeenCalledTimes(2)
  })

  it('handles dataset preview', () => {
    render(<FilesPage />)
    fireEvent.click(screen.getByText('Preview Dataset'))
    expect(screen.getByTestId('data-preview-modal')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Close Preview'))
    expect(screen.queryByTestId('data-preview-modal')).not.toBeInTheDocument()
  })

  it('does not open DataPreviewModal for literature preview', () => {
    render(<FilesPage />)
    fireEvent.click(screen.getByText('Preview Literature'))
    // Preview modal is only for datasets based on the code logic: `selectedFileType === 'dataset'`
    expect(screen.queryByTestId('data-preview-modal')).not.toBeInTheDocument()
  })

  it('handles loading state', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    } as any)

    render(<FilesPage />)
    expect(screen.getByText('Loading files...')).toBeInTheDocument()
  })

  it('handles error state', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Error'),
      refetch: mockRefetch,
    } as any)

    render(<FilesPage />)
    expect(screen.getByText('Failed to load files. Please try again.')).toBeInTheDocument()
    
    // Test retry button
    fireEvent.click(screen.getByText('Retry'))
    expect(mockRefetch).toHaveBeenCalledTimes(1)
  })

  it('renders correctly with exactly 1 file to cover singular branch', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: { datasets: [{ id: 1 }], literature: [] },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    } as any)

    render(<FilesPage />)
    expect(screen.getByText('1 file uploaded')).toBeInTheDocument()
  })
})
