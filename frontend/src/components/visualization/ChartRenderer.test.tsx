import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChartRenderer } from './ChartRenderer';

describe('ChartRenderer', () => {
  const mockData = {
    labels: ['A', 'B', 'C'],
    datasets: [{
      label: 'Values',
      data: [10, 20, 30]
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

  it('renders with different chart types', () => {
    const lineConfig = { ...mockConfig, type: 'line' as const };
    const { rerender } = render(<ChartRenderer data={mockData} config={lineConfig} />);
    
    expect(screen.getByText('Test Chart')).toBeInTheDocument();
    
    const pieConfig = { ...mockConfig, type: 'pie' as const };
    rerender(<ChartRenderer data={mockData} config={pieConfig} />);
    
    expect(screen.getByText('Test Chart')).toBeInTheDocument();
  });

  it('handles empty data gracefully', () => {
    const emptyData = {
      labels: [],
      datasets: []
    };
    render(<ChartRenderer data={emptyData} config={mockConfig} />);
    
    // Should still render without crashing
    expect(screen.getByText('Test Chart')).toBeInTheDocument();
  });
});
