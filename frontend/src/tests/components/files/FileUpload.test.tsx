import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FileUpload } from '@/components/files/FileUpload';
import { fileService } from '@/services/fileService';
import toast from 'react-hot-toast';

vi.mock('@/services/fileService', () => ({
  fileService: {
    uploadCSV: vi.fn(),
    uploadPDF: vi.fn(),
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

describe('FileUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (type: 'csv' | 'pdf', onUploadComplete?: () => void) => {
    const queryClient = createTestQueryClient();
    return render(
      <QueryClientProvider client={queryClient}>
        <FileUpload type={type} onUploadComplete={onUploadComplete} />
      </QueryClientProvider>
    );
  };

  it('renders upload area for CSV', () => {
    renderComponent('csv');
    expect(screen.getByText(/Drop CSV files here/i)).toBeInTheDocument();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input.accept).toContain('.csv');
  });

  it('renders upload area for PDF', () => {
    renderComponent('pdf');
    expect(screen.getByText(/Drop PDF files here/i)).toBeInTheDocument();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input.accept).toContain('.pdf');
  });

  it('handles drag events', () => {
    renderComponent('csv');
    const dropZone = screen.getByText(/Drop CSV files here/i).closest('label')?.parentElement;
    expect(dropZone).not.toHaveClass('border-primary-500');

    fireEvent.dragOver(dropZone!);
    expect(dropZone).toHaveClass('border-primary-500');

    fireEvent.dragLeave(dropZone!);
    expect(dropZone).not.toHaveClass('border-primary-500');
  });

  it('handles file drop and validates extension', async () => {
    renderComponent('csv');
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const dropZone = screen.getByText(/Drop CSV files here/i).closest('label')?.parentElement;

    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [file],
      },
    });

    expect(toast.error).toHaveBeenCalledWith('test.pdf is not a CSV file');
    expect(fileService.uploadCSV).not.toHaveBeenCalled();
  });

  it('handles successful file upload via input', async () => {
    const onUploadComplete = vi.fn();
    (fileService.uploadCSV as any).mockResolvedValueOnce({ message: 'Success' });
    
    renderComponent('csv', onUploadComplete);
    
    const file = new File(['csv content'], 'data.csv', { type: 'text/csv' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    await userEvent.upload(input, file);

    expect(screen.getByText('Uploading Files (1)')).toBeInTheDocument();
    expect(screen.getByText('data.csv')).toBeInTheDocument();

    await waitFor(() => {
      expect(fileService.uploadCSV).toHaveBeenCalledWith(file);
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('data.csv uploaded successfully');
    });
    
    expect(onUploadComplete).toHaveBeenCalled();
  });

  it('handles successful PDF upload', async () => {
    (fileService.uploadPDF as any).mockResolvedValueOnce({ message: 'Success' });
    
    renderComponent('pdf');
    
    const file = new File(['pdf content'], 'doc.pdf', { type: 'application/pdf' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(fileService.uploadPDF).toHaveBeenCalledWith(file);
    });
  });

  it('handles validation error response format', async () => {
    const errorResponse = {
      response: {
        data: {
          detail: [{ loc: ['body', 'file'], msg: 'File is empty' }]
        }
      }
    };
    (fileService.uploadCSV as any).mockRejectedValueOnce(errorResponse);
    
    renderComponent('csv');
    
    const file = new File([''], 'empty.csv', { type: 'text/csv' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to upload empty.csv: body → file: File is empty');
    });
  });

  it('handles string detail error response format', async () => {
    const errorResponse = {
      response: {
        data: {
          detail: 'Not allowed'
        }
      }
    };
    (fileService.uploadCSV as any).mockRejectedValueOnce(errorResponse);
    
    renderComponent('csv');
    
    const file = new File(['content'], 'test.csv', { type: 'text/csv' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to upload test.csv: Not allowed');
    });
  });

  it('handles generic message error response format', async () => {
    const errorResponse = {
      response: {
        data: {
          message: 'Internal error'
        }
      }
    };
    (fileService.uploadCSV as any).mockRejectedValueOnce(errorResponse);
    
    renderComponent('csv');
    
    const file = new File(['content'], 'test.csv', { type: 'text/csv' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to upload test.csv: Internal error');
    });
  });

  it('handles native Error fallback', async () => {
    const error = new Error('Network Error');
    (fileService.uploadCSV as any).mockRejectedValueOnce(error);
    
    renderComponent('csv');
    
    const file = new File(['content'], 'test.csv', { type: 'text/csv' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to upload test.csv: Network Error');
    });
  });

  it('removes file from uploading list on button click', async () => {
    const errorResponse = new Error('error');
    (fileService.uploadCSV as any).mockRejectedValueOnce(errorResponse);
    
    renderComponent('csv');
    
    const file = new File(['content'], 'test.csv', { type: 'text/csv' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText('Uploading Files (1)')).toBeInTheDocument();
    });

    // The cross icon (lucide X) button
    const removeButtons = screen.getAllByRole('button');
    const removeBtn = removeButtons[removeButtons.length - 1];
    
    fireEvent.click(removeBtn);

    expect(screen.queryByText('Uploading Files (1)')).not.toBeInTheDocument();
  });

  it('clicks hidden input when select files button is clicked', () => {
    renderComponent('csv');
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const button = screen.getByText('Select Files');
    
    const clickSpy = vi.spyOn(input, 'click');
    fireEvent.click(button);
    expect(clickSpy).toHaveBeenCalled();
  });
});
