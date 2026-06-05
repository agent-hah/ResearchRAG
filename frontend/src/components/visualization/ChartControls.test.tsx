import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChartControls } from './ChartControls';
import type { ChartConfig } from '../../services/visualizationService';

describe('ChartControls', () => {
  const mockColumns = ['col1', 'col2', 'col3'];
  const mockConfig: ChartConfig = {
    type: 'bar',
    title: 'Test Chart',
    xAxisLabel: 'col1',
    yAxisLabel: 'col2',
    showLegend: true,
    showGrid: false,
    colorScheme: 'blue'
  };

  it('renders correctly with given config', () => {
    render(<ChartControls config={mockConfig} columns={mockColumns} onConfigChange={vi.fn()} onExport={vi.fn()} />);
    
    expect(screen.getByDisplayValue('Test Chart')).toBeInTheDocument();
    expect(screen.getByText('Bar Chart')).toBeInTheDocument(); // The active type
  });

  it('calls onConfigChange when changing chart type', () => {
    const onConfigChange = vi.fn();
    render(<ChartControls config={mockConfig} columns={mockColumns} onConfigChange={onConfigChange} onExport={vi.fn()} />);
    
    const lineButton = screen.getByText('Line Chart');
    fireEvent.click(lineButton);
    
    expect(onConfigChange).toHaveBeenCalledWith({ type: 'line' });
  });

  it('calls onConfigChange when changing title', () => {
    const onConfigChange = vi.fn();
    render(<ChartControls config={mockConfig} columns={mockColumns} onConfigChange={onConfigChange} onExport={vi.fn()} />);
    
    const titleInput = screen.getByPlaceholderText('Enter chart title');
    fireEvent.change(titleInput, { target: { value: 'New Title' } });
    
    expect(onConfigChange).toHaveBeenCalledWith({ title: 'New Title' });
  });

  it('calls onConfigChange when toggling legend and grid', () => {
    const onConfigChange = vi.fn();
    render(<ChartControls config={mockConfig} columns={mockColumns} onConfigChange={onConfigChange} onExport={vi.fn()} />);
    
    const legendCheck = screen.getByLabelText('Show Legend');
    const gridCheck = screen.getByLabelText('Show Grid');
    
    fireEvent.click(legendCheck);
    expect(onConfigChange).toHaveBeenCalledWith({ showLegend: false }); // It was true
    
    fireEvent.click(gridCheck);
    expect(onConfigChange).toHaveBeenCalledWith({ showGrid: true }); // It was false
  });

  it('shows trendline option for scatter chart and toggles it', () => {
    const onConfigChange = vi.fn();
    const scatterConfig: ChartConfig = { ...mockConfig, type: 'scatter', showTrendline: false };
    render(<ChartControls config={scatterConfig} columns={mockColumns} onConfigChange={onConfigChange} onExport={vi.fn()} />);
    
    const trendlineCheck = screen.getByLabelText('Show Trendline');
    fireEvent.click(trendlineCheck);
    expect(onConfigChange).toHaveBeenCalledWith({ showTrendline: true });
  });

  it('calls onConfigChange when choosing color scheme', () => {
    const onConfigChange = vi.fn();
    render(<ChartControls config={mockConfig} columns={mockColumns} onConfigChange={onConfigChange} onExport={vi.fn()} />);
    
    // The red color scheme radio
    const redRadio = screen.getByDisplayValue('red');
    fireEvent.click(redRadio);
    expect(onConfigChange).toHaveBeenCalledWith({ colorScheme: 'red' });
  });

  it('calls onExport with correct format when export buttons are clicked', () => {
    const onExport = vi.fn();
    render(<ChartControls config={mockConfig} columns={mockColumns} onConfigChange={vi.fn()} onExport={onExport} />);
    
    fireEvent.click(screen.getByText('Export as PNG'));
    expect(onExport).toHaveBeenCalledWith('png');
    
    fireEvent.click(screen.getByText('Export as JSON'));
    expect(onExport).toHaveBeenCalledWith('json');
    
    fireEvent.click(screen.getByText('Export as CSV'));
    expect(onExport).toHaveBeenCalledWith('csv');
  });

  it('handles custom axis titles', () => {
    const onConfigChange = vi.fn();
    render(<ChartControls config={mockConfig} columns={mockColumns} onConfigChange={onConfigChange} onExport={vi.fn()} />);
    
    const xTitleInput = screen.getAllByPlaceholderText('Default based on data')[0];
    const yTitleInput = screen.getAllByPlaceholderText('Default based on data')[1];
    
    fireEvent.change(xTitleInput, { target: { value: 'X Custom' } });
    expect(onConfigChange).toHaveBeenCalledWith({ xAxisTitle: 'X Custom' });
    
    fireEvent.change(yTitleInput, { target: { value: 'Y Custom' } });
    expect(onConfigChange).toHaveBeenCalledWith({ yAxisTitle: 'Y Custom' });
  });

  it('handles heatmap z-axis', () => {
    const onConfigChange = vi.fn();
    const heatmapConfig: ChartConfig = { ...mockConfig, type: 'heatmap' };
    render(<ChartControls config={heatmapConfig} columns={mockColumns} onConfigChange={onConfigChange} onExport={vi.fn()} />);
    
    expect(screen.getByText('Z-Axis Data (Value)')).toBeInTheDocument();
  });
  
  it('opens and closes dropdown correctly', async () => {
    const user = userEvent.setup();
    const onConfigChange = vi.fn();
    render(<ChartControls config={mockConfig} columns={mockColumns} onConfigChange={onConfigChange} onExport={vi.fn()} />);
    
    // CheckboxDropdown displays its currently selected value ('col1')
    const xDropdown = screen.getByText('col1');
    await user.click(xDropdown);
    
    // Now dropdown is open, click another column
    const col3Option = screen.getByText('col3');
    await user.click(col3Option);
    
    expect(onConfigChange).toHaveBeenCalledWith({ xAxisLabel: 'col1, col3' });
    
    // Click outside to close (simulated by clicking the document body or another input)
    await user.click(document.body);
  });
});
