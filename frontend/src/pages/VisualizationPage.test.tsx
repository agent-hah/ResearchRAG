import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { VisualizationPage } from './VisualizationPage'
import { useQuery } from '@tanstack/react-query'
import { fileService } from '../services/fileService'

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}))

vi.mock('../services/fileService', () => ({
  fileService: {
    listDatasets: vi.fn(),
    getDatasetVizData: vi.fn(),
    getDatasetSpatialData: vi.fn(),
  },
}))

vi.mock('../components/visualization/VisualizationPanel', () => ({
  VisualizationPanel: ({ columns, rows }: any) => (
    <div data-testid="viz-panel">
      Cols: {columns.join(',')} Rows: {rows.length}
    </div>
  ),
}))

vi.mock('../components/visualization/SpatialMap', () => ({
  SpatialMap: ({ points, center, zoom }: any) => (
    <div data-testid="spatial-map">
      Points: {points.length} Center: {center?.lat},{center?.lng} Zoom: {zoom}
    </div>
  ),
}))

vi.mock('../services/spatialVisualizationService', () => ({
  calculateBounds: vi.fn().mockReturnValue('bounds'),
  getCenter: vi.fn().mockReturnValue({ lat: 0, lng: 0 }),
  calculateZoom: vi.fn().mockReturnValue(10),
}))

vi.mock('lucide-react', () => ({
  BarChart3: () => <div data-testid="icon-chart" />,
  Map: () => <div data-testid="icon-map" />,
  Database: () => <div data-testid="icon-db" />,
}))

describe('VisualizationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders initial state with datasets loading', () => {
    vi.mocked(useQuery).mockImplementation(({ queryKey }: any) => {
      if (queryKey[0] === 'datasets') {
        return { isLoading: true } as any
      }
      return { isLoading: false } as any
    })

    render(<VisualizationPage />)
    expect(screen.getByText('Visualization Engine')).toBeInTheDocument()
    expect(screen.getByText('Loading datasets...')).toBeInTheDocument()
  })

  it('renders dataset select and allows selection', () => {
    const mockDatasets = [
      { id: 1, filename: 'data1.csv', row_count: 100 },
      { id: 2, filename: 'data2.csv', row_count: 200 },
    ]

    vi.mocked(useQuery).mockImplementation(({ queryKey }: any) => {
      if (queryKey[0] === 'datasets') {
        return { data: mockDatasets, isLoading: false } as any
      }
      return { isLoading: false } as any
    })

    render(<VisualizationPage />)
    expect(screen.getByText('data1.csv (100 rows)')).toBeInTheDocument()

    // Select a dataset
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } })
    
    // Now chart tab should be visible
    expect(screen.getByText('Chart')).toBeInTheDocument()
    expect(screen.getByText('Spatial Map')).toBeInTheDocument()
  })

  it('loads and renders chart data when chart tab is active', () => {
    vi.mocked(useQuery).mockImplementation(({ queryKey }: any) => {
      if (queryKey[0] === 'datasets') {
        return { data: [{ id: 1, filename: 'data1.csv' }], isLoading: false } as any
      }
      if (queryKey[0] === 'dataset-viz' && queryKey[1] === 1) {
        return { 
          data: { columns: ['A', 'B'], data: [{ A: 1, B: 2 }] },
          isLoading: false
        } as any
      }
      return { isLoading: false } as any
    })

    render(<VisualizationPage />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } })

    expect(screen.getByTestId('viz-panel')).toHaveTextContent('Cols: A,B Rows: 1')
  })

  it('loads and renders spatial data when map tab is active', () => {
    vi.mocked(useQuery).mockImplementation(({ queryKey }: any) => {
      if (queryKey[0] === 'datasets') {
        return { data: [{ id: 1, filename: 'data1.csv' }], isLoading: false } as any
      }
      if (queryKey[0] === 'dataset-spatial' && queryKey[1] === 1) {
        return { 
          data: { is_spatial: true, points: [{ lat: 1, lng: 1 }], total_points: 1 },
          isLoading: false
        } as any
      }
      return { isLoading: false } as any
    })

    render(<VisualizationPage />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } })
    fireEvent.click(screen.getByText('Spatial Map'))

    expect(screen.getByTestId('spatial-map')).toHaveTextContent('Points: 1 Center: 0,0 Zoom: 10')
    expect(screen.getByText('Visualizing 1 geographic data points')).toBeInTheDocument()
  })

  it('shows no spatial data warning when appropriate', () => {
    vi.mocked(useQuery).mockImplementation(({ queryKey }: any) => {
      if (queryKey[0] === 'datasets') {
        return { data: [{ id: 1, filename: 'data1.csv' }], isLoading: false } as any
      }
      if (queryKey[0] === 'dataset-spatial' && queryKey[1] === 1) {
        return { 
          data: { is_spatial: false },
          isLoading: false
        } as any
      }
      return { isLoading: false } as any
    })

    render(<VisualizationPage />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } })
    fireEvent.click(screen.getByText('Spatial Map'))

    expect(screen.getByText('No Spatial Data Detected')).toBeInTheDocument()
  })

  it('shows loading and error states for viz data', () => {
    vi.mocked(useQuery).mockImplementation(({ queryKey }: any) => {
      if (queryKey[0] === 'datasets') {
        return { data: [{ id: 1, filename: 'data1.csv' }], isLoading: false } as any
      }
      if (queryKey[0] === 'dataset-viz' && queryKey[1] === 1) {
        return { isLoading: true, error: new Error('err') } as any
      }
      return { isLoading: false } as any
    })

    render(<VisualizationPage />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } })

    expect(screen.getByText('Loading chart data...')).toBeInTheDocument()
    expect(screen.getByText('Failed to load chart data')).toBeInTheDocument()
  })

  it('shows loading and error states for spatial data', () => {
    vi.mocked(useQuery).mockImplementation(({ queryKey }: any) => {
      if (queryKey[0] === 'datasets') {
        return { data: [{ id: 1, filename: 'data1.csv' }], isLoading: false } as any
      }
      if (queryKey[0] === 'dataset-spatial' && queryKey[1] === 1) {
        return { isLoading: true, error: new Error('err') } as any
      }
      return { isLoading: false } as any
    })

    render(<VisualizationPage />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } })
    fireEvent.click(screen.getByText('Spatial Map'))

    expect(screen.getByText('Loading spatial data...')).toBeInTheDocument()
    expect(screen.getByText('Failed to load spatial data')).toBeInTheDocument()
  })

  it('queryFn calls fileService', async () => {
    let datasetsQueryFn: any;
    let vizQueryFn: any;
    let spatialQueryFn: any;

    vi.mocked(useQuery).mockImplementation((opts: any) => {
      if (opts.queryKey[0] === 'datasets') datasetsQueryFn = opts.queryFn;
      if (opts.queryKey[0] === 'dataset-viz') vizQueryFn = opts.queryFn;
      if (opts.queryKey[0] === 'dataset-spatial') spatialQueryFn = opts.queryFn;
      return { data: undefined, isLoading: false } as any;
    })

    render(<VisualizationPage />)

    vi.mocked(fileService.listDatasets).mockResolvedValue('datasets' as any)
    vi.mocked(fileService.getDatasetVizData).mockResolvedValue('viz' as any)
    vi.mocked(fileService.getDatasetSpatialData).mockResolvedValue('spatial' as any)
    
    expect(await datasetsQueryFn()).toBe('datasets')
    
    // Simulate setting dataset id for the other queries
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } })
    
    expect(await vizQueryFn()).toBe('viz')
    expect(await spatialQueryFn()).toBe('spatial')
  })
})
