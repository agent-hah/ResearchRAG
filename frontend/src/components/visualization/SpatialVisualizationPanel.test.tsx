import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { SpatialVisualizationPanel } from './SpatialVisualizationPanel';
import * as spatialService from '../../services/spatialVisualizationService';

vi.mock('../../services/spatialVisualizationService', () => ({
  detectSpatialData: vi.fn(),
  transformToSpatialData: vi.fn(),
  calculateBounds: vi.fn(),
  getCenter: vi.fn(),
  calculateZoom: vi.fn(),
  exportAsGeoJSON: vi.fn(),
}));

vi.mock('./SpatialMap', () => ({
  SpatialMap: () => <div data-testid="spatial-map" />
}));

describe('SpatialVisualizationPanel', () => {
  const mockColumns = ['id', 'lat', 'lng', 'val'];
  const mockRows = [[1, 10, 20, 100], [2, -10, -20, 200]];

  it('renders "No Spatial Data" when no spatial data is detected', () => {
    vi.mocked(spatialService.detectSpatialData).mockReturnValue({ isSpatial: false, latIndex: -1, lngIndex: -1 });
    
    render(<SpatialVisualizationPanel columns={mockColumns} rows={mockRows} />);
    
    expect(screen.getByText('No Spatial Data Detected')).toBeInTheDocument();
  });

  describe('with spatial data', () => {
    beforeEach(() => {
      vi.mocked(spatialService.detectSpatialData).mockReturnValue({ isSpatial: true, latIndex: 1, lngIndex: 2 });
      vi.mocked(spatialService.transformToSpatialData).mockReturnValue([
        { lat: 10, lng: 20, label: '1', value: 100 },
        { lat: -10, lng: -20, label: '2', value: 200 }
      ]);
      vi.mocked(spatialService.calculateBounds).mockReturnValue({ minLat: -10, maxLat: 10, minLng: -20, maxLng: 20 });
      vi.mocked(spatialService.getCenter).mockReturnValue([0, 0]);
      vi.mocked(spatialService.calculateZoom).mockReturnValue(2);
    });

    it('renders the map and controls', () => {
      render(<SpatialVisualizationPanel columns={mockColumns} rows={mockRows} question="Test Question" />);
      
      expect(screen.getByTestId('spatial-map')).toBeInTheDocument();
      expect(screen.getByText('Spatial Visualization')).toBeInTheDocument();
      expect(screen.getByText('Test Question')).toBeInTheDocument();
      
      // Data Summary verification
      expect(screen.getByText('Data Points')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // 2 points
      expect(screen.getByText('-10.00° to 10.00°')).toBeInTheDocument();
      expect(screen.getByText('-20.00° to 20.00°')).toBeInTheDocument();
    });

    it('toggles heatmap style', () => {
      render(<SpatialVisualizationPanel columns={mockColumns} rows={mockRows} />);
      
      const heatmapButton = screen.getByText('Heatmap');
      fireEvent.click(heatmapButton);
      
      // Checking class change or text update to ensure it reacted
      expect(screen.getByText('Colored circles show value intensity')).toBeInTheDocument();
      
      const markersButton = screen.getByText('Markers');
      fireEvent.click(markersButton);
      expect(screen.getByText('Standard markers for each data point')).toBeInTheDocument();
    });

    it('exports geojson successfully', () => {
      vi.mocked(spatialService.exportAsGeoJSON).mockReturnValue('{"type":"FeatureCollection"}');
      
      // Mock URL and createElement for downloading
      const mockCreateObjectURL = vi.fn();
      global.URL.createObjectURL = mockCreateObjectURL;
      
      const mockClick = vi.fn();
      const originalCreateElement = document.createElement.bind(document);
      const mockCreateElement = vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'a') return { click: mockClick, href: '', download: '' } as any;
        return originalCreateElement(tag);
      });

      render(<SpatialVisualizationPanel columns={mockColumns} rows={mockRows} />);
      
      const exportButton = screen.getByText('Export as GeoJSON');
      fireEvent.click(exportButton);
      
      expect(spatialService.exportAsGeoJSON).toHaveBeenCalled();
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      
      mockCreateElement.mockRestore();
    });

    it('handles geojson export error', () => {
      vi.mocked(spatialService.exportAsGeoJSON).mockImplementation(() => {
        throw new Error('Export error');
      });
      
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      render(<SpatialVisualizationPanel columns={mockColumns} rows={mockRows} />);
      
      const exportButton = screen.getByText('Export as GeoJSON');
      fireEvent.click(exportButton);
      
      expect(alertSpy).toHaveBeenCalledWith('Failed to export GeoJSON. Please try again.');
      
      alertSpy.mockRestore();
    });

    it('calls onClose when close button is clicked', () => {
      const mockOnClose = vi.fn();
      render(<SpatialVisualizationPanel columns={mockColumns} rows={mockRows} onClose={mockOnClose} />);
      
      const closeButton = screen.getByTitle('Close spatial visualization');
      fireEvent.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
