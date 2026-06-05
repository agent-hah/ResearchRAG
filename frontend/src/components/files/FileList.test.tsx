import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FileList } from './FileList';
import { fileService } from '@/services/fileService';
import toast from 'react-hot-toast';
import type { Dataset, Literature } from '@/types';

vi.mock('@/services/fileService', () => ({
  fileService: {
    deleteDataset: vi.fn(),
    deleteLiterature: vi.fn(),
    reprocessDataset: vi.fn(),
    reprocessLiterature: vi.fn(),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const mockDatasets: Dataset[] = [
  {
    id: 1,
    filename: 'test_dataset.csv',
    file_size: 1024,
    created_at: '2023-01-01T00:00:00Z',
    table_name: 'test_table',
    row_count: 100,
    column_count: 5,
  },
];

const mockLiterature: Literature[] = [
  {
    id: 1,
    filename: 'test_doc.pdf',
    file_size: 2048,
    created_at: '2023-01-01T00:00:00Z',
    processing_status: 'completed',
    page_count: 10,
    indexed_at: '2023-01-02T00:00:00Z',
  },
  {
    id: 2,
    filename: 'processing_doc.pdf',
    file_size: 2048,
    created_at: '2023-01-01T00:00:00Z',
    processing_status: 'processing',
    indexing_progress: 0.5,
  },
  {
    id: 3,
    filename: 'failed_doc.pdf',
    file_size: 2048,
    created_at: '2023-01-01T00:00:00Z',
    processing_status: 'failed',
  },
  {
    id: 4,
    filename: 'pending_doc.pdf',
    file_size: 2048,
    created_at: '2023-01-01T00:00:00Z',
    processing_status: 'pending',
  },
  {
    id: 5,
    filename: 'indexed_doc.pdf',
    file_size: 2048,
    created_at: '2023-01-01T00:00:00Z',
    processing_status: 'indexed',
  }
];

describe('FileList', () => {
  const onPreview = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
  });

  const renderComponent = (datasets: Dataset[] = [], literature: Literature[] = []) => {
    const queryClient = createTestQueryClient();
    return render(
      <QueryClientProvider client={queryClient}>
        <FileList datasets={datasets} literature={literature} onPreview={onPreview} />
      </QueryClientProvider>
    );
  };

  it('renders empty states', () => {
    renderComponent([], []);
    expect(screen.getByText('No datasets uploaded yet')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText(/Literature/));
    expect(screen.getByText('No literature uploaded yet')).toBeInTheDocument();
  });

  it('renders datasets and handles preview click', () => {
    renderComponent(mockDatasets, []);
    expect(screen.getByText('test_dataset.csv')).toBeInTheDocument();
    expect(screen.getByText('Table: test_table')).toBeInTheDocument();
    expect(screen.getByText(/100 rows/)).toBeInTheDocument();

    const previewBtn = screen.getByTitle('Preview data');
    fireEvent.click(previewBtn);
    expect(onPreview).toHaveBeenCalledWith(1, 'dataset');
  });

  it('handles dataset reprocess', async () => {
    (fileService.reprocessDataset as any).mockResolvedValueOnce({});
    renderComponent(mockDatasets, []);

    const reprocessBtn = screen.getByTitle('Reprocess');
    fireEvent.click(reprocessBtn);

    await waitFor(() => {
      expect(fileService.reprocessDataset).toHaveBeenCalledWith(1, expect.anything());
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Dataset reprocessing started');
    });
  });

  it('handles dataset reprocess error', async () => {
    (fileService.reprocessDataset as any).mockRejectedValueOnce(new Error('Failed'));
    renderComponent(mockDatasets, []);

    const reprocessBtn = screen.getByTitle('Reprocess');
    fireEvent.click(reprocessBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to reprocess dataset');
    });
  });

  it('handles dataset delete', async () => {
    (fileService.deleteDataset as any).mockResolvedValueOnce({});
    renderComponent(mockDatasets, []);

    const deleteBtn = screen.getByTitle('Delete');
    fireEvent.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalled();
    
    await waitFor(() => {
      expect(fileService.deleteDataset).toHaveBeenCalledWith(1, expect.anything());
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Dataset deleted successfully');
    });
  });

  it('handles dataset delete abort', async () => {
    vi.spyOn(window, 'confirm').mockImplementation(() => false);
    renderComponent(mockDatasets, []);

    const deleteBtn = screen.getByTitle('Delete');
    fireEvent.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalled();
    expect(fileService.deleteDataset).not.toHaveBeenCalled();
  });

  it('handles dataset delete error', async () => {
    (fileService.deleteDataset as any).mockRejectedValueOnce(new Error('Failed'));
    renderComponent(mockDatasets, []);

    const deleteBtn = screen.getByTitle('Delete');
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to delete dataset');
    });
  });

  it('renders literature and various statuses', () => {
    renderComponent([], mockLiterature);
    fireEvent.click(screen.getByText(/Literature/));

    expect(screen.getByText('test_doc.pdf')).toBeInTheDocument();
    expect(screen.getByText('Upload Complete')).toBeInTheDocument();
    
    expect(screen.getByText('processing_doc.pdf')).toBeInTheDocument();
    expect(screen.getByText('Indexing...')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();

    expect(screen.getByText('failed_doc.pdf')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();

    expect(screen.getByText('pending_doc.pdf')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();

    expect(screen.getByText('indexed_doc.pdf')).toBeInTheDocument();
    expect(screen.getByText('Indexed')).toBeInTheDocument();
  });

  it('handles literature reprocess', async () => {
    (fileService.reprocessLiterature as any).mockResolvedValueOnce({});
    renderComponent([], mockLiterature);
    fireEvent.click(screen.getByText(/Literature/));

    const reprocessBtns = screen.getAllByTitle('Reprocess');
    fireEvent.click(reprocessBtns[0]);

    await waitFor(() => {
      expect(fileService.reprocessLiterature).toHaveBeenCalledWith(1, expect.anything());
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Literature reprocessing started');
    });
  });

  it('handles literature reprocess error', async () => {
    (fileService.reprocessLiterature as any).mockRejectedValueOnce(new Error('Failed'));
    renderComponent([], mockLiterature);
    fireEvent.click(screen.getByText(/Literature/));

    const reprocessBtns = screen.getAllByTitle('Reprocess');
    fireEvent.click(reprocessBtns[0]);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to reprocess literature');
    });
  });

  it('handles literature delete', async () => {
    (fileService.deleteLiterature as any).mockResolvedValueOnce({});
    renderComponent([], mockLiterature);
    fireEvent.click(screen.getByText(/Literature/));

    const deleteBtns = screen.getAllByTitle('Delete');
    fireEvent.click(deleteBtns[0]);

    expect(window.confirm).toHaveBeenCalled();

    await waitFor(() => {
      expect(fileService.deleteLiterature).toHaveBeenCalledWith(1, expect.anything());
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Literature deleted successfully');
    });
  });

  it('handles literature delete error', async () => {
    (fileService.deleteLiterature as any).mockRejectedValueOnce(new Error('Failed'));
    renderComponent([], mockLiterature);
    fireEvent.click(screen.getByText(/Literature/));

    const deleteBtns = screen.getAllByTitle('Delete');
    fireEvent.click(deleteBtns[0]);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to delete literature');
    });
  });
});
