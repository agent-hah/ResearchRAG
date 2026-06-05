import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { SpatialMap } from './SpatialMap';

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: any) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ children, position }: any) => (
    <div data-testid="marker" data-position={JSON.stringify(position)}>
      {children}
    </div>
  ),
  Popup: ({ children }: any) => <div data-testid="popup">{children}</div>,
  CircleMarker: ({ children, center }: any) => (
    <div data-testid="circle-marker" data-center={JSON.stringify(center)}>
      {children}
    </div>
  ),
  useMap: () => ({
    fitBounds: vi.fn(),
  }),
}));

vi.mock('../../services/spatialVisualizationService', () => ({
  getPointColor: vi.fn().mockReturnValue('#ff0000'),
}));

describe('SpatialMap', () => {
  const mockPoints = [
    { lat: 10, lng: 20, label: 'Point A', value: 100, metadata: { extra: 'info' } },
    { lat: -10, lng: -20, label: 'Point B', value: 200 }
  ];

  it('renders empty state when no points are provided', () => {
    render(<SpatialMap points={[]} center={[0, 0]} zoom={2} />);
    expect(screen.getByText('No spatial data to display')).toBeInTheDocument();
  });

  it('renders standard markers when showHeatmap is false', () => {
    render(<SpatialMap points={mockPoints} center={[0, 0]} zoom={2} showHeatmap={false} />);
    
    expect(screen.getAllByTestId('marker')).toHaveLength(2);
    expect(screen.getByText('Point A')).toBeInTheDocument();
    expect(screen.getByText('Value: 100.00')).toBeInTheDocument();
    expect(screen.getByText('extra: info')).toBeInTheDocument();
    
    expect(screen.getByText('Point B')).toBeInTheDocument();
  });

  it('renders circle markers when showHeatmap is true', () => {
    render(<SpatialMap points={mockPoints} center={[0, 0]} zoom={2} showHeatmap={true} />);
    
    expect(screen.getAllByTestId('circle-marker')).toHaveLength(2);
    expect(screen.getByText('Point A')).toBeInTheDocument();
    expect(screen.getByText('Point B')).toBeInTheDocument();
  });

  it('handles points with no values', () => {
    const pointsNoValues = [
      { lat: 10, lng: 20, label: 'No Value Point' }
    ];
    
    render(<SpatialMap points={pointsNoValues} center={[0, 0]} zoom={2} showHeatmap={true} />);
    
    // When showHeatmap is true, if point.value is undefined, it falls back to standard Marker
    expect(screen.getAllByTestId('marker')).toHaveLength(1);
    expect(screen.getByText('No Value Point')).toBeInTheDocument();
  });
});
