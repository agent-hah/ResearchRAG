import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PDFViewer } from './PDFViewer';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { annotationsService } from '../../services/annotationsService';

// Mock annotationsService
vi.mock('../../services/annotationsService', () => ({
  annotationsService: {
    getLiteratureAnnotations: vi.fn(),
    createAnnotation: vi.fn(),
    updateAnnotation: vi.fn(),
    deleteAnnotation: vi.fn(),
  },
}));

// Mock react-pdf
vi.mock('react-pdf', () => {
  // @ts-ignore
  const { useEffect } = require('react');
  return {
    pdfjs: {
      GlobalWorkerOptions: {
        workerSrc: '',
      },
    },
    Document: ({ children, onLoadSuccess, file }: any) => {
      useEffect(() => {
        if (onLoadSuccess) onLoadSuccess({ numPages: 5 });
      }, []);
      return <div data-testid="pdf-document" data-file={file}>{children}</div>;
    },
    Page: ({ pageNumber, scale }: any) => (
      <div data-testid="pdf-page" data-page={pageNumber} data-scale={scale}>
        Page {pageNumber}
      </div>
    ),
  };
});

// Mock vite query param import
vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({
  default: 'mock-worker-url',
}));

// Setup QueryClient
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderWithClient = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
};

describe('PDFViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockAnnotations: any = [
    {
      id: 1,
      literature_id: 10,
      annotation_type: 'highlight',
      content: 'Test comment',
      highlighted_text: 'Test highlight',
      page_number: 1,
      color: 'yellow',
      created_at: '2023-11-01T10:00:00Z',
      updated_at: '2023-11-01T10:00:00Z',
    }
  ];

  it('renders the viewer and loads document', async () => {
    vi.mocked(annotationsService.getLiteratureAnnotations).mockResolvedValue([]);
    
    renderWithClient(<PDFViewer fileUrl="test.pdf" literatureId={10} />);

    await waitFor(() => {
      expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
      // Should display loaded pages from onLoadSuccess
      expect(screen.getByText('Page 1 of 5')).toBeInTheDocument();
    });
  });

  it('fetches and displays annotations for current page', async () => {
    vi.mocked(annotationsService.getLiteratureAnnotations).mockResolvedValue(mockAnnotations);

    renderWithClient(<PDFViewer fileUrl="test.pdf" literatureId={10} />);

    // The annotations are rendered — wait for them to appear
    await waitFor(() => {
      expect(screen.getByText('"Test highlight"')).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getByText('Test comment')).toBeInTheDocument();
    // Verify the annotation count text (split across text nodes)
    expect(screen.getByText(/1\s*annotation/)).toBeInTheDocument();
  });

  it('handles pagination', async () => {
    vi.mocked(annotationsService.getLiteratureAnnotations).mockResolvedValue([]);
    
    renderWithClient(<PDFViewer fileUrl="test.pdf" literatureId={10} />);

    await waitFor(() => {
      expect(screen.getByText('Page 1 of 5')).toBeInTheDocument();
    });

    const nextButton = screen.getByTitle('Next page');
    const prevButton = screen.getByTitle('Previous page');

    expect(prevButton).toBeDisabled();

    // Go to next page
    await userEvent.click(nextButton);
    await waitFor(() => {
      expect(screen.getByText('Page 2 of 5')).toBeInTheDocument();
    });
    expect(prevButton).not.toBeDisabled();

    // Go back
    await userEvent.click(prevButton);
    await waitFor(() => {
      expect(screen.getByText('Page 1 of 5')).toBeInTheDocument();
    });
  });

  it('handles zoom controls', async () => {
    vi.mocked(annotationsService.getLiteratureAnnotations).mockResolvedValue([]);
    
    renderWithClient(<PDFViewer fileUrl="test.pdf" literatureId={10} />);

    await waitFor(() => {
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    const zoomInButton = screen.getByTitle('Zoom in');
    await userEvent.click(zoomInButton);

    await waitFor(() => {
      expect(screen.getByText('120%')).toBeInTheDocument();
    });

    const zoomOutButton = screen.getByTitle('Zoom out');
    await userEvent.click(zoomOutButton);
    await userEvent.click(zoomOutButton);

    await waitFor(() => {
      expect(screen.getByText('80%')).toBeInTheDocument();
    });
  });

  it('toggles annotations sidebar', async () => {
    vi.mocked(annotationsService.getLiteratureAnnotations).mockResolvedValue([]);
    
    renderWithClient(<PDFViewer fileUrl="test.pdf" literatureId={10} />);

    await waitFor(() => {
      expect(screen.getByTitle('Hide annotations')).toBeInTheDocument();
      expect(screen.getByText('Annotations')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTitle('Hide annotations'));

    expect(screen.queryByText('Annotations')).not.toBeInTheDocument();
    expect(screen.getByTitle('Show annotations')).toBeInTheDocument();
  });

  it('opens and uses annotation form to create', async () => {
    vi.mocked(annotationsService.getLiteratureAnnotations).mockResolvedValue([]);
    vi.mocked(annotationsService.createAnnotation).mockResolvedValue({} as any);
    
    renderWithClient(<PDFViewer fileUrl="test.pdf" literatureId={10} />);

    await waitFor(() => {
      expect(screen.getByTitle('Add annotation')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTitle('Add annotation'));

    expect(screen.getByText('Add Annotation')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/Comment \/ Note/i), 'New comment');
    await userEvent.click(screen.getByRole('button', { name: /Save/i }));

    await waitFor(() => {
      expect(annotationsService.createAnnotation).toHaveBeenCalledWith({
        literature_id: 10,
        page_number: 1,
        annotation_type: 'highlight',
        content: 'New comment',
        color: 'yellow',
      }, expect.anything());
    });
  });

  it('edits an annotation', async () => {
    vi.mocked(annotationsService.getLiteratureAnnotations).mockResolvedValue(mockAnnotations);
    vi.mocked(annotationsService.updateAnnotation).mockResolvedValue({} as any);

    renderWithClient(<PDFViewer fileUrl="test.pdf" literatureId={10} />);

    await waitFor(() => {
      expect(screen.getByText('Test comment')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTitle('Edit annotation'));

    expect(screen.getByText('Edit Annotation')).toBeInTheDocument();

    const input = await screen.findByLabelText(/Comment \/ Note/i);
    await userEvent.clear(input);
    await userEvent.type(input, 'Updated comment');

    await userEvent.click(screen.getByRole('button', { name: /Save/i }));

    await waitFor(() => {
      expect(annotationsService.updateAnnotation).toHaveBeenCalledWith(1, {
        content: 'Updated comment',
        color: 'yellow',
      });
    });
  });

  it('deletes an annotation', async () => {
    vi.mocked(annotationsService.getLiteratureAnnotations).mockResolvedValue(mockAnnotations);
    vi.mocked(annotationsService.deleteAnnotation).mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockImplementation(() => true);

    renderWithClient(<PDFViewer fileUrl="test.pdf" literatureId={10} />);

    await waitFor(() => {
      expect(screen.getByText('Test comment')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTitle('Delete annotation'));

    await waitFor(() => {
      expect(annotationsService.deleteAnnotation).toHaveBeenCalledWith(1, expect.anything());
    });

    vi.restoreAllMocks();
  });
});
