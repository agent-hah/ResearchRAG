import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RefinementPanel } from '@/components/visualization/RefinementPanel';
import { refinementService } from '@/services/refinementService';
import type { ChartConfig } from '@/services/visualizationService';

vi.mock('@/services/refinementService', () => ({
  refinementService: {
    refineVisualization: vi.fn(),
  },
}));

describe('RefinementPanel', () => {
  const mockConfig: ChartConfig = {
    type: 'bar',
    title: 'Test Chart'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    render(<RefinementPanel config={mockConfig} onConfigChange={vi.fn()} />);
    expect(screen.getByPlaceholderText(/change to bar chart/i)).toBeInTheDocument();
  });

  it('handles example command click', () => {
    render(<RefinementPanel config={mockConfig} onConfigChange={vi.fn()} />);
    const exampleButton = screen.getByText('Change to bar chart');
    fireEvent.click(exampleButton);
    expect(screen.getByPlaceholderText(/change to bar chart/i)).toHaveValue('Change to bar chart');
  });

  it('submits refinement command successfully', async () => {
    const onConfigChange = vi.fn();
    const refinedConfig = { ...mockConfig, title: 'New Title' };
    
    vi.mocked(refinementService.refineVisualization).mockResolvedValueOnce({
      refined_config: refinedConfig,
      explanation: 'Changed title to New Title',
      updates: { title: 'New Title' }
    });

    render(<RefinementPanel config={mockConfig} onConfigChange={onConfigChange} />);
    
    const input = screen.getByPlaceholderText(/change to bar chart/i);
    fireEvent.change(input, { target: { value: 'update title' } });
    
    const submitButton = screen.getByTitle('Apply refinement');
    fireEvent.click(submitButton);
    
    expect(submitButton).toBeDisabled(); // while loading
    
    await waitFor(() => {
      expect(onConfigChange).toHaveBeenCalledWith(refinedConfig);
    });

    // Check history
    const historyButton = screen.getByText(/Refinement History/i);
    expect(historyButton).toBeInTheDocument();
    
    fireEvent.click(historyButton); // Toggle history
    expect(screen.getByText('"update title"')).toBeInTheDocument();
    expect(screen.getByText('Changed title to New Title')).toBeInTheDocument();
  });

  it('displays error message on refinement failure', async () => {
    vi.mocked(refinementService.refineVisualization).mockRejectedValueOnce({
      response: { data: { detail: 'Server error occurred' } }
    });

    render(<RefinementPanel config={mockConfig} onConfigChange={vi.fn()} />);
    
    const input = screen.getByPlaceholderText(/change to bar chart/i);
    fireEvent.change(input, { target: { value: 'make it cool' } });
    
    const submitButton = screen.getByTitle('Apply refinement');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Server error occurred')).toBeInTheDocument();
    });
  });

  it('displays fallback error message on general failure', async () => {
    vi.mocked(refinementService.refineVisualization).mockRejectedValueOnce(new Error('Network Error'));

    render(<RefinementPanel config={mockConfig} onConfigChange={vi.fn()} />);
    
    const input = screen.getByPlaceholderText(/change to bar chart/i);
    fireEvent.change(input, { target: { value: 'make it cool' } });
    
    fireEvent.click(screen.getByTitle('Apply refinement'));
    
    await waitFor(() => {
      expect(screen.getByText('Failed to refine visualization. Please try again.')).toBeInTheDocument();
    });
  });

  it('does not submit empty command', async () => {
    render(<RefinementPanel config={mockConfig} onConfigChange={vi.fn()} />);
    
    const submitButton = screen.getByTitle('Apply refinement');
    expect(submitButton).toBeDisabled();
    
    const input = screen.getByPlaceholderText(/change to bar chart/i);
    fireEvent.change(input, { target: { value: '   ' } });
    expect(submitButton).toBeDisabled();
  });
});
