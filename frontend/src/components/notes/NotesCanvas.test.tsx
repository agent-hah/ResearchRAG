import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotesCanvas } from './NotesCanvas';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { notesService, Note } from '../../services/notesService';

// Mock notesService
vi.mock('../../services/notesService', () => ({
  notesService: {
    listNotes: vi.fn(),
    createNote: vi.fn(),
    updateNote: vi.fn(),
    deleteNote: vi.fn(),
  },
}));

// Mock ReactMarkdown used by CanvasNoteCard
vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <div>{children}</div>,
}));

// Mock react-draggable
vi.mock('react-draggable', () => {
  return {
    __esModule: true,
    default: ({ children }: any) => <div data-testid="draggable">{children}</div>,
  };
});

// Setup QueryClient
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false, // Turn off retries
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

describe('NotesCanvas', () => {
  const mockNotes: Note[] = [
    {
      id: 1,
      title: 'Canvas Note 1 Title',
      content: 'Canvas Note 1 Content',
      tags: ['canvas'],
      dataset_id: null,
      literature_id: null,
      query_id: null,
      created_at: '2023-11-01T10:00:00Z',
      updated_at: '2023-11-01T10:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    vi.mocked(notesService.listNotes).mockImplementation(() => new Promise(() => {}));
    renderWithClient(<NotesCanvas />);
    expect(screen.getByText('Loading notes...')).toBeInTheDocument();
  });

  it('renders empty state when no notes exist', async () => {
    vi.mocked(notesService.listNotes).mockResolvedValue([]);
    renderWithClient(<NotesCanvas />);

    await waitFor(() => {
      expect(screen.getByText('Your canvas is empty')).toBeInTheDocument();
    });
  });

  it('renders notes on canvas', async () => {
    vi.mocked(notesService.listNotes).mockResolvedValue(mockNotes);
    renderWithClient(<NotesCanvas />);

    await waitFor(() => {
      expect(screen.getByText('Canvas Note 1 Title')).toBeInTheDocument();
    });
    
    // Check that we rendered the draggable wrapper
    expect(screen.getAllByTestId('draggable')).toHaveLength(1);
  });

  it('can open create note editor from empty state', async () => {
    vi.mocked(notesService.listNotes).mockResolvedValue([]);
    renderWithClient(<NotesCanvas />);

    await waitFor(() => {
      expect(screen.getByText('Create Your First Note')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: /create your first note/i }));

    expect(screen.getByText('Create New Note')).toBeInTheDocument();
  });

  it('can open create note editor from toolbar', async () => {
    vi.mocked(notesService.listNotes).mockResolvedValue(mockNotes);
    renderWithClient(<NotesCanvas />);

    await waitFor(() => {
      expect(screen.getByText('Canvas Note 1 Title')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: /new note/i }));
    expect(screen.getByText('Create New Note')).toBeInTheDocument();
  });

  it('creates a new note', async () => {
    vi.mocked(notesService.listNotes).mockResolvedValue(mockNotes);
    vi.mocked(notesService.createNote).mockResolvedValue({
      id: 2,
      title: 'Untitled Note',
      content: 'New Canvas Note',
      tags: [],
      dataset_id: null,
      literature_id: null,
      query_id: null,
      created_at: '2023-11-02T10:00:00Z',
      updated_at: '2023-11-02T10:00:00Z',
    });

    renderWithClient(<NotesCanvas queryId={100} datasetId={200} literatureId={300} />);

    await waitFor(() => {
      expect(screen.getByText('Canvas Note 1 Title')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: /new note/i }));
    
    const textarea = screen.getByPlaceholderText(/Write your note here/i);
    await userEvent.type(textarea, 'New Canvas Note Content');
    await userEvent.click(screen.getByRole('button', { name: /save note/i }));

    await waitFor(() => {
      expect(notesService.createNote).toHaveBeenCalledWith({
        title: 'Untitled Note',
        content: 'New Canvas Note Content',
        tags: [],
        query_id: 100,
        dataset_id: 200,
        literature_id: 300,
      });
    });
  });

  it('edits an existing note', async () => {
    vi.mocked(notesService.listNotes).mockResolvedValue(mockNotes);
    vi.mocked(notesService.updateNote).mockResolvedValue({
      ...mockNotes[0],
      content: 'Updated Canvas Note',
    });

    renderWithClient(<NotesCanvas />);

    await waitFor(() => {
      expect(screen.getByText('Canvas Note 1 Title')).toBeInTheDocument();
    });

    // Click edit
    const editButton = screen.getByTitle('Edit note');
    await userEvent.click(editButton);

    expect(screen.getByText('Edit Note')).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText(/Write your note here/i);
    await userEvent.clear(textarea);
    await userEvent.type(textarea, 'Updated Canvas Note Content');

    await userEvent.click(screen.getByRole('button', { name: /save note/i }));

    await waitFor(() => {
      expect(notesService.updateNote).toHaveBeenCalledWith(1, {
        title: 'Canvas Note 1 Title',
        content: 'Updated Canvas Note Content',
        tags: ['canvas']
      });
    });
  });

  it('deletes a note', async () => {
    vi.mocked(notesService.listNotes).mockResolvedValue(mockNotes);
    vi.mocked(notesService.deleteNote).mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockImplementation(() => true);

    renderWithClient(<NotesCanvas />);

    await waitFor(() => {
      expect(screen.getByText('Canvas Note 1 Title')).toBeInTheDocument();
    });

    const deleteButton = screen.getByTitle('Delete note');
    await userEvent.click(deleteButton);

    await waitFor(() => {
      expect(notesService.deleteNote).toHaveBeenCalledWith(1);
    });

    vi.restoreAllMocks();
  });

  it('handles zoom controls', async () => {
    vi.mocked(notesService.listNotes).mockResolvedValue(mockNotes);
    renderWithClient(<NotesCanvas />);

    await waitFor(() => {
      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    const zoomInButton = screen.getByTitle('Zoom in');
    await userEvent.click(zoomInButton);

    expect(screen.getByText('100%')).toBeInTheDocument();

    const zoomOutButton = screen.getByTitle('Zoom out');
    await userEvent.click(zoomOutButton);
    await userEvent.click(zoomOutButton); // now 50%

    expect(screen.getByText('50%')).toBeInTheDocument();

    const resetZoomButton = screen.getByTitle('Reset zoom');
    await userEvent.click(resetZoomButton);

    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('toggles grid view', async () => {
    vi.mocked(notesService.listNotes).mockResolvedValue(mockNotes);
    renderWithClient(<NotesCanvas />);

    await waitFor(() => {
      expect(screen.getByTitle('Hide grid')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTitle('Hide grid'));
    expect(screen.getByTitle('Show grid')).toBeInTheDocument();
  });
});
