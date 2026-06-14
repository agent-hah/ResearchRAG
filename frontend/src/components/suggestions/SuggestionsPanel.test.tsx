import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SuggestionsPanel } from './SuggestionsPanel';
import { suggestionsService } from '../../services/suggestionsService';

vi.mock('../../services/suggestionsService', () => ({
  suggestionsService: {
    getDatasetSuggestions: vi.fn(),
    getGenerationStatus: vi.fn(),
    generateSuggestions: vi.fn(),
    updateFeedback: vi.fn(),
  },
}));

vi.mock('./SuggestionCard', () => ({
  SuggestionCard: ({ suggestion, onMarkRelevant, onMarkIrrelevant, onDismiss, onImport }: any) => (
    <div data-testid="suggestion-card">
      {suggestion.title}
      <button onClick={() => onMarkRelevant(suggestion.id)}>Relevant</button>
      <button onClick={() => onMarkIrrelevant(suggestion.id)}>Irrelevant</button>
      <button onClick={() => onDismiss(suggestion.id)}>Dismiss</button>
      <button onClick={() => onImport(suggestion.id)}>Import</button>
    </div>
  )
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

describe('SuggestionsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    (suggestionsService.getGenerationStatus as any).mockResolvedValue({ progress: 0 });
  });

  const renderComponent = (props: any = {}) => {
    const queryClient = createTestQueryClient();
    return render(
      <QueryClientProvider client={queryClient}>
        <SuggestionsPanel {...props} />
      </QueryClientProvider>
    );
  };

  it('renders loading state initially', () => {
    (suggestionsService.getDatasetSuggestions as any).mockReturnValue(new Promise(() => {}));
    renderComponent();
    expect(screen.getAllByRole('button', { name: /Generate Suggestions/i })[0]).toBeInTheDocument();
  });

  it('renders error state and handles retry', async () => {
    (suggestionsService.getDatasetSuggestions as any).mockRejectedValueOnce(new Error('Failed'));
    (suggestionsService.getDatasetSuggestions as any).mockResolvedValueOnce([]);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Failed to load suggestions')).toBeInTheDocument();
    });

    const retryBtn = screen.getByText('Retry');
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(suggestionsService.getDatasetSuggestions).toHaveBeenCalledTimes(2);
    });
  });

  it('renders empty state when no suggestions', async () => {
    (suggestionsService.getDatasetSuggestions as any).mockResolvedValue([]);
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('No suggestions yet')).toBeInTheDocument();
    });
  });

  it('renders suggestions and handles actions', async () => {
    const mockSuggestions = [
      { id: 1, title: 'Paper 1', is_dismissed: false },
      { id: 2, title: 'Paper 2', is_dismissed: true },
    ];
    (suggestionsService.getDatasetSuggestions as any).mockResolvedValue(mockSuggestions);
    (suggestionsService.updateFeedback as any).mockResolvedValue({});

    renderComponent({ datasetIds: [1], datasetNames: ['Test Dataset'], isGlobal: false });

    await waitFor(() => {
      expect(screen.getByText('Paper 1')).toBeInTheDocument();
      expect(screen.queryByText('Paper 2')).not.toBeInTheDocument(); // dismissed
    });

    expect(screen.getByText('For datasets: Test Dataset')).toBeInTheDocument();

    const relevantBtn = screen.getByText('Relevant');
    fireEvent.click(relevantBtn);

    await waitFor(() => {
      expect(suggestionsService.updateFeedback).toHaveBeenCalledWith(1, { is_relevant: true });
    });

    const irrelevantBtn = screen.getByText('Irrelevant');
    fireEvent.click(irrelevantBtn);
    await waitFor(() => {
      expect(suggestionsService.updateFeedback).toHaveBeenCalledWith(1, { is_relevant: false });
    });

    const dismissBtn = screen.getByText('Dismiss');
    fireEvent.click(dismissBtn);
    await waitFor(() => {
      expect(suggestionsService.updateFeedback).toHaveBeenCalledWith(1, { is_dismissed: true });
    });

    const importBtn = screen.getByText('Import');
    fireEvent.click(importBtn);
    await waitFor(() => {
      expect(suggestionsService.updateFeedback).toHaveBeenCalledWith(1, { is_imported: true });
    });
    expect(window.alert).toHaveBeenCalled();
  });

  it('toggles include dismissed', async () => {
    const mockSuggestions = [
      { id: 1, title: 'Paper 1', is_dismissed: false },
      { id: 2, title: 'Paper 2', is_dismissed: true },
    ];
    (suggestionsService.getDatasetSuggestions as any).mockResolvedValue(mockSuggestions);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Show Dismissed (1)')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Show Dismissed (1)'));

    await waitFor(() => {
      expect(screen.getByText('Hide Dismissed (1)')).toBeInTheDocument();
    });
  });


  it('handles generate suggestions and progress', async () => {
    (suggestionsService.getDatasetSuggestions as any).mockResolvedValue([]);
    (suggestionsService.generateSuggestions as any).mockResolvedValue({});
    (suggestionsService.getGenerationStatus as any).mockResolvedValue({ status: 'Processing', progress: 50 });

    renderComponent();

    const generateBtn = screen.getAllByText('Generate Suggestions')[0]; // There could be two (one in empty state)
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(suggestionsService.generateSuggestions).toHaveBeenCalled();
    });

    // Wait for the status to show Processing
    await waitFor(() => {
      expect(screen.getByText('Processing')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    // Now complete it
    (suggestionsService.getGenerationStatus as any).mockResolvedValue({ status: 'Done', progress: 100 });
    
    await waitFor(() => {
      expect(screen.queryByText('Processing')).not.toBeInTheDocument();
    });
  });

  it('handles progress reset on failure', async () => {
    (suggestionsService.getDatasetSuggestions as any).mockResolvedValue([]);
    (suggestionsService.generateSuggestions as any).mockResolvedValue({});
    (suggestionsService.getGenerationStatus as any).mockResolvedValue({ status: 'Failed', progress: 0 });

    renderComponent();

    fireEvent.click(screen.getAllByText('Generate Suggestions')[0]);

    await waitFor(() => {
      expect(screen.getAllByText('Generate Suggestions')[0]).not.toBeDisabled();
    });
  });
});
