import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VisualizationPanel } from '@/components/visualization/VisualizationPanel';
import * as visualizationService from '@/services/visualizationService';
import { toPng } from 'html-to-image';

vi.mock('@/services/visualizationService', () => ({
  detectChartType: vi.fn(),
  transformToChartData: vi.fn(),
  generateChartConfig: vi.fn(),
  exportChartJSON: vi.fn(),
  exportChartCSV: vi.fn(),
}));

vi.mock('html-to-image', () => ({
  toPng: vi.fn(),
}));

vi.mock('@/components/visualization/ChartRenderer', () => ({
  ChartRenderer: () => <div data-testid="chart-renderer" />
}));

vi.mock('@/components/visualization/ChartControls', () => ({
  ChartControls: ({ onConfigChange, onExport }: any) => (
    <div data-testid="chart-controls">
      <button type="button" onClick={() => onConfigChange({ title: 'Manual Update' })}>Update Config</button>
      <button type="button" onClick={() => onExport('png')}>Export PNG</button>
      <button type="button" onClick={() => onExport('json')}>Export JSON</button>
      <button type="button" onClick={() => onExport('csv')}>Export CSV</button>
    </div>
  )
}));

vi.mock('@/components/visualization/RefinementPanel', () => ({
  RefinementPanel: ({ onConfigChange }: any) => (
    <div data-testid="refinement-panel">
      <button type="button" onClick={() => onConfigChange({ type: 'bar', title: 'AI Update', showLegend: true })}>AI Update</button>
    </div>
  )
}));

describe('VisualizationPanel', () => {
  const mockColumns = ['col1', 'col2'];
  const mockRows = [[1, 2], [3, 4]];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(visualizationService.detectChartType).mockReturnValue('bar');
    vi.mocked(visualizationService.generateChartConfig).mockReturnValue({ type: 'bar', title: 'Test Chart' });
    vi.mocked(visualizationService.transformToChartData).mockReturnValue({ labels: [], datasets: [] });
  });

  it('renders "Insufficient Data" when columns < 2 or rows === 0', () => {
    const { rerender } = render(<VisualizationPanel columns={['col1']} rows={mockRows} />);
    expect(screen.getByText('Insufficient Data for Visualization')).toBeInTheDocument();
    
    rerender(<VisualizationPanel columns={mockColumns} rows={[]} />);
    expect(screen.getByText('Insufficient Data for Visualization')).toBeInTheDocument();
  });

  it('renders correctly with sufficient data', () => {
    render(<VisualizationPanel columns={mockColumns} rows={mockRows} question="Test Question" />);
    
    expect(screen.getByTestId('chart-renderer')).toBeInTheDocument();
    expect(screen.getByTestId('chart-controls')).toBeInTheDocument();
    expect(screen.getByText('Visualizing 2 rows × 2 columns')).toBeInTheDocument();
  });

  it('toggles AI Refinement panel', () => {
    render(<VisualizationPanel columns={mockColumns} rows={mockRows} />);
    
    const toggleButton = screen.getByText('AI Refinement');
    fireEvent.click(toggleButton);
    
    expect(screen.getByTestId('refinement-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('chart-controls')).not.toBeInTheDocument();
    
    // Switch back
    const manualButton = screen.getByText('Manual Controls');
    fireEvent.click(manualButton);
    expect(screen.getByTestId('chart-controls')).toBeInTheDocument();
  });

  it('handles partial config updates from manual controls', () => {
    render(<VisualizationPanel columns={mockColumns} rows={mockRows} />);
    const updateButton = screen.getByText('Update Config');
    fireEvent.click(updateButton);
    // Config state would update internally, we can't assert directly without checking props passed to ChartRenderer if it wasn't mocked.
    // The main verification is it didn't crash.
  });

  it('handles full config updates from AI refinement', () => {
    render(<VisualizationPanel columns={mockColumns} rows={mockRows} />);
    fireEvent.click(screen.getByText('AI Refinement'));
    
    const aiUpdateButton = screen.getByText('AI Update');
    fireEvent.click(aiUpdateButton);
  });

  it('toggles full screen mode', () => {
    render(<VisualizationPanel columns={mockColumns} rows={mockRows} />);
    
    const fsButton = screen.getByTitle('Full screen');
    fireEvent.click(fsButton);
    
    expect(screen.getByTitle('Exit full screen')).toBeInTheDocument();
  });

  it('handles close button', () => {
    const onClose = vi.fn();
    render(<VisualizationPanel columns={mockColumns} rows={mockRows} onClose={onClose} />);
    
    const closeButton = screen.getByTitle('Close visualization');
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalled();
  });

  it('handles PNG export', async () => {
    vi.mocked(toPng).mockResolvedValue('data:image/png;base64,123');
    
    // Mock URL and createElement for downloading
    const mockClick = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    const mockCreateElement = vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'a') return { click: mockClick, href: '', download: '' } as any;
      return originalCreateElement(tag);
    });

    render(<VisualizationPanel columns={mockColumns} rows={mockRows} />);
    
    const exportPngBtn = screen.getByText('Export PNG');
    fireEvent.click(exportPngBtn);
    
    await waitFor(() => {
      expect(toPng).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
    });
    
    mockCreateElement.mockRestore();
  });

  it('handles JSON export', () => {
    vi.mocked(visualizationService.exportChartJSON).mockReturnValue('{}');
    
    const mockCreateObjectURL = vi.fn();
    (window as any).URL.createObjectURL = mockCreateObjectURL;
    
    const mockClick = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    const mockCreateElement = vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'a') return { click: mockClick, href: '', download: '' } as any;
      return originalCreateElement(tag);
    });

    render(<VisualizationPanel columns={mockColumns} rows={mockRows} />);
    fireEvent.click(screen.getByText('Export JSON'));
    
    expect(visualizationService.exportChartJSON).toHaveBeenCalled();
    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(mockClick).toHaveBeenCalled();
    
    mockCreateElement.mockRestore();
  });

  it('handles CSV export', () => {
    vi.mocked(visualizationService.exportChartCSV).mockReturnValue('a,b\n1,2');
    
    const mockCreateObjectURL = vi.fn();
    (window as any).URL.createObjectURL = mockCreateObjectURL;
    
    const mockClick = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    const mockCreateElement = vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'a') return { click: mockClick, href: '', download: '' } as any;
      return originalCreateElement(tag);
    });

    render(<VisualizationPanel columns={mockColumns} rows={mockRows} />);
    fireEvent.click(screen.getByText('Export CSV'));
    
    expect(visualizationService.exportChartCSV).toHaveBeenCalled();
    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(mockClick).toHaveBeenCalled();
    
    mockCreateElement.mockRestore();
  });

  it('handles export failure gracefully', async () => {
    vi.mocked(toPng).mockRejectedValue(new Error('Export failed'));
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(<VisualizationPanel columns={mockColumns} rows={mockRows} />);
    fireEvent.click(screen.getByText('Export PNG'));
    
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Failed to export chart. Please try again.');
    });
    
    alertSpy.mockRestore();
  });
});
