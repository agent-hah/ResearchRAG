import { vi } from 'vitest';
import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { ChartRenderer } from '@/components/visualization/ChartRenderer';

vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  };
});

describe('ChartRenderer', () => {
  const mockData = {
    labels: ['A', 'B', 'C'],
    datasets: [{
      label: 'Values',
      data: [10, 20, 30],
      color: '#ff0000'
    }]
  };

  const mockConfig = {
    type: 'bar' as const,
    title: 'Test Chart',
    xAxisLabel: 'Category',
    yAxisLabel: 'Value',
    showLegend: true,
    showGrid: true,
  };

  it('renders chart with title', () => {
    render(<ChartRenderer data={mockData} config={mockConfig} />);
    expect(screen.getByText('Test Chart')).toBeInTheDocument();
  });

  it('renders line chart', () => {
    const config = { ...mockConfig, type: 'line' as const };
    render(<ChartRenderer data={mockData} config={config} />);
    expect(screen.getByText('Test Chart')).toBeInTheDocument();
  });

  it('renders pie chart', () => {
    const config = { ...mockConfig, type: 'pie' as const };
    render(<ChartRenderer data={mockData} config={config} />);
    expect(screen.getByText('Test Chart')).toBeInTheDocument();
  });

  it('renders area chart', () => {
    const config = { ...mockConfig, type: 'area' as const };
    render(<ChartRenderer data={mockData} config={config} />);
    expect(screen.getByText('Test Chart')).toBeInTheDocument();
  });

  it('renders scatter chart', () => {
    const config = { ...mockConfig, type: 'scatter' as const };
    render(<ChartRenderer data={mockData} config={config} />);
    expect(screen.getByText('Test Chart')).toBeInTheDocument();
  });

  it('renders scatter chart with trendline for numeric X axis', () => {
    const numericData = {
      labels: [1, 2, 3],
      datasets: [{
        label: 'Values',
        data: [10, 20, 30],
        color: '#ff0000'
      }]
    };
    const config = { ...mockConfig, type: 'scatter' as const, showTrendline: true };
    render(<ChartRenderer data={numericData} config={config} />);
    expect(screen.getByText('Test Chart')).toBeInTheDocument();
  });

  it('handles scatter trendline with insufficient data', () => {
    const numericData = {
      labels: [1],
      datasets: [{
        label: 'Values',
        data: [10],
        color: '#ff0000'
      }]
    };
    const config = { ...mockConfig, type: 'scatter' as const, showTrendline: true };
    render(<ChartRenderer data={numericData} config={config} />);
    expect(screen.getByText('Test Chart')).toBeInTheDocument();
  });

  it('handles scatter trendline with zero variance', () => {
    const numericData = {
      labels: [1, 1, 1], // Same X value causes denominator to be 0
      datasets: [{
        label: 'Values',
        data: [10, 20, 30],
        color: '#ff0000'
      }]
    };
    const config = { ...mockConfig, type: 'scatter' as const, showTrendline: true };
    render(<ChartRenderer data={numericData} config={config} />);
    expect(screen.getByText('Test Chart')).toBeInTheDocument();
  });

  it('renders heatmap chart with different color schemes', () => {
    const schemes = ['blue', 'red', 'viridis', 'inferno', 'black'];
    const hmData = {
      labels: ['A', 'B'],
      datasets: [{ label: '1', data: [10, 20] }]
    };
    
    const { rerender } = render(
      <ChartRenderer data={hmData} config={{ ...mockConfig, type: 'heatmap', colorScheme: schemes[0] }} />
    );
    expect(screen.getByText('Test Chart')).toBeInTheDocument();
    
    for (let i = 1; i < schemes.length; i++) {
      const config = { ...mockConfig, type: 'heatmap' as const, colorScheme: schemes[i] };
      rerender(<ChartRenderer data={hmData} config={config} />);
      expect(screen.getByText('Test Chart')).toBeInTheDocument();
    }
  });

  it('renders heatmap chart with min === max', () => {
    const config = { ...mockConfig, type: 'heatmap' as const, colorScheme: 'blue' };
    const hmData = {
      labels: ['A', 'B'],
      datasets: [{ label: '1', data: [10, 10] }]
    };
    render(<ChartRenderer data={hmData} config={config} />);
    expect(screen.getByText('Test Chart')).toBeInTheDocument();
  });

  it('renders unsupported chart type', () => {
    const config = { ...mockConfig, type: 'unknown' as any };
    render(<ChartRenderer data={mockData} config={config} />);
    expect(screen.getByText('Unsupported chart type')).toBeInTheDocument();
  });

  it('handles empty data gracefully', () => {
    const emptyData = {
      labels: [],
      datasets: []
    };
    render(<ChartRenderer data={emptyData} config={mockConfig} />);
    expect(screen.getByText('Test Chart')).toBeInTheDocument();
  });

  it('handles large datasets (disables animation)', () => {
    const largeData = {
      labels: Array(600).fill('Label'),
      datasets: [{
        label: 'Values',
        data: Array(600).fill(10),
        color: '#000'
      }]
    };
    render(<ChartRenderer data={largeData} config={mockConfig} />);
    expect(screen.getByText('Test Chart')).toBeInTheDocument();
  });
});
