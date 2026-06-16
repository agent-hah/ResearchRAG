import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DataPreviewModal } from './DataPreviewModal';
import { fileService } from '@/services/fileService';

vi.mock('@/services/fileService', () => ({
  fileService: {
    getDatasetPreview: vi.fn(),
    getDatasetVizData: vi.fn(),
  },
}));

vi.mock('../visualization/VisualizationPanel', () => ({
  VisualizationPanel: () => <div data-testid="visualization-panel">Visualization Panel</div>
}));



const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

describe('DataPreviewModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    const queryClient = createTestQueryClient();
    return render(
      <QueryClientProvider client={queryClient}>
        <DataPreviewModal datasetId={1} onClose={mockOnClose} />
      </QueryClientProvider>
    );
  };

  it('renders loading state for table', () => {
    (fileService.getDatasetPreview as any).mockReturnValue(new Promise(() => {})); // Never resolves to keep loading
    renderComponent();
    expect(screen.getByText('Loading preview...')).toBeInTheDocument();
  });

  it('renders table data successfully', async () => {
    (fileService.getDatasetPreview as any).mockResolvedValue({
      row_count: 5,
      schema: [
        { name: 'id', type: 'integer' },
        { name: 'name', type: 'string' }
      ],
      rows: [
        { id: 1, name: 'Test 1' },
        { id: 2, name: null }
      ]
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Showing 2 of 5 rows')).toBeInTheDocument();
    });

    expect(screen.getAllByText('id')[0]).toBeInTheDocument();
    expect(screen.getByText('integer')).toBeInTheDocument();
    expect(screen.getAllByText('name')[0]).toBeInTheDocument();
    expect(screen.getByText('string')).toBeInTheDocument();

    expect(screen.getByText('Test 1')).toBeInTheDocument();
    expect(screen.getByText('null')).toBeInTheDocument();
  });

  it('renders table error state', async () => {
    (fileService.getDatasetPreview as any).mockRejectedValue(new Error('Failed to load'));
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load preview')).toBeInTheDocument();
    });
  });

  it('switches to chart tab and loads data', async () => {
    (fileService.getDatasetPreview as any).mockResolvedValue({ row_count: 0, schema: [], rows: [] });
    (fileService.getDatasetVizData as any).mockResolvedValue({
      columns: ['x', 'y'],
      data: [{ x: 1, y: 2 }]
    });

    renderComponent();

    const chartTab = screen.getByText('Chart');
    fireEvent.click(chartTab);

    await waitFor(() => {
      expect(fileService.getDatasetVizData).toHaveBeenCalledWith(1, 1000);
    });

    await waitFor(() => {
      expect(screen.getByTestId('visualization-panel')).toBeInTheDocument();
    });
  });

  it('renders chart loading and error state', async () => {
    (fileService.getDatasetPreview as any).mockResolvedValue({ row_count: 0, schema: [], rows: [] });
    
    // Let's test error state
    (fileService.getDatasetVizData as any).mockRejectedValue(new Error('Error'));
    
    renderComponent();
    fireEvent.click(screen.getByText('Chart'));

    await waitFor(() => {
      expect(screen.getByText('Failed to load chart data')).toBeInTheDocument();
    });
  });



  it('calls onClose when close button is clicked', () => {
    (fileService.getDatasetPreview as any).mockResolvedValue({ row_count: 0, schema: [], rows: [] });
    renderComponent();
    
    const closeButtons = screen.getAllByRole('button').filter(btn => 
      btn.textContent === 'Close' || btn.querySelector('svg')
    );
    
    // Use the explicit 'Close' button
    fireEvent.click(screen.getByText('Close'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
    
    // Use the X icon button
    fireEvent.click(closeButtons[0]);
    expect(mockOnClose).toHaveBeenCalledTimes(2);
  });

  it('calls onClose when clicking the backdrop', () => {
    (fileService.getDatasetPreview as any).mockResolvedValue({ row_count: 0, schema: [], rows: [] });
    renderComponent();
    
    // The backdrop is the first div with bg-black
    const backdrop = document.querySelector('.bg-black.bg-opacity-50');
    fireEvent.click(backdrop!);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
