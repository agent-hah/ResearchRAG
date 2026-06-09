import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotesPanel } from './NotesPanel';
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

// Mock ReactMarkdown used by NoteCard to avoid issues
vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <div>{children}</div>,
}));

// Setup QueryClient
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false, // Turn off retries for faster tests
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

describe('NotesPanel', () => {
  const mockNotes: Note[] = [
    {
      id: 1,

      content: 'Note 1 content',
      tags: ['tag1', 'tag2'],
      dataset_id: null,
      literature_id: null,
      query_id: null,
      created_at: '2023-10-01T10:00:00Z',
      updated_at: '2023-10-01T10:00:00Z',
    },
    {
      id: 2,

      content: 'Note 2 content',
      tags: ['tag2', 'tag3'],
      dataset_id: null,
      literature_id: null,
      query_id: null,
      created_at: '2023-10-02T10:00:00Z',
      updated_at: '2023-10-02T10:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    // Return a promise that doesn't resolve immediately
    vi.mocked(notesService.listNotes).mockImplementation(() => new Promise(() => {}));
    renderWithClient(<NotesPanel />);
    expect(screen.getByText('Notes')).toBeInTheDocument();
  });

  it('renders empty state when no notes exist', async () => {
    vi.mocked(notesService.listNotes).mockResolvedValue([]);
    renderWithClient(<NotesPanel />);

    await waitFor(() => {
      expect(screen.getByText('No notes yet')).toBeInTheDocument();
    });
  });

  it('renders notes and unique tags', async () => {
    vi.mocked(notesService.listNotes).mockResolvedValue(mockNotes);
    renderWithClient(<NotesPanel />);

    await waitFor(() => {
      expect(screen.getByText('Note 1 content')).toBeInTheDocument();
      expect(screen.getByText('Note 2 content')).toBeInTheDocument();
    });

    // Check unique tags
    expect(screen.getAllByText('tag1')[0]).toBeInTheDocument(); // Tag filter
    expect(screen.getAllByText('tag2').length).toBeGreaterThan(0);
    expect(screen.getAllByText('tag3')[0]).toBeInTheDocument();
  });

  it('can search for notes', async () => {
    vi.mocked(notesService.listNotes).mockResolvedValue(mockNotes);
    renderWithClient(<NotesPanel />);

    await waitFor(() => {
      expect(screen.getByText('Note 1 content')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search notes...');
    await userEvent.type(searchInput, 'Note 1');

    // Should call listNotes again with the search query
    await waitFor(() => {
      expect(notesService.listNotes).toHaveBeenCalledWith(0, 50, undefined, 'Note 1');
    });
  });

  it('can filter by tags', async () => {
    vi.mocked(notesService.listNotes).mockResolvedValue(mockNotes);
    renderWithClient(<NotesPanel />);

    await waitFor(() => {
      expect(screen.getByText('Note 1 content')).toBeInTheDocument();
    });

    // Get the tag filter button for 'tag1'
    const tag1Buttons = screen.getAllByText('tag1');
    // Assuming the first one is the filter button and others are inside NoteCard
    await userEvent.click(tag1Buttons[0]);

    await waitFor(() => {
      expect(notesService.listNotes).toHaveBeenCalledWith(0, 50, 'tag1', undefined);
    });
  });

  it('toggles note editor for new note', async () => {
    vi.mocked(notesService.listNotes).mockResolvedValue(mockNotes);
    renderWithClient(<NotesPanel />);

    await waitFor(() => {
      expect(screen.getByText('Note 1 content')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: /new note/i }));

    expect(screen.getByText('Create New Note')).toBeInTheDocument();
  });

  it('creates a new note', async () => {
    vi.mocked(notesService.listNotes).mockResolvedValue(mockNotes);
    vi.mocked(notesService.createNote).mockResolvedValue({
      id: 3,

      content: 'New Note',
      tags: [],
      dataset_id: null,
      literature_id: null,
      query_id: null,
      created_at: '2023-10-03T10:00:00Z',
      updated_at: '2023-10-03T10:00:00Z',
    });
    
    renderWithClient(<NotesPanel queryId={10} datasetId={20} literatureId={30} />);

    await waitFor(() => {
      expect(screen.getByText('Note 1 content')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: /new note/i }));
    
    // Type in editor
    const textarea = screen.getByPlaceholderText(/Write your note here/i);
    await userEvent.type(textarea, 'New Note Content');

    await userEvent.click(screen.getByRole('button', { name: /save note/i }));

    await waitFor(() => {
      expect(notesService.createNote).toHaveBeenCalledWith({
        content: 'New Note Content',
        tags: [],
        query_id: 10,
        dataset_id: 20,
        literature_id: 30,
      });
    });
  });

  it('edits an existing note', async () => {
    vi.mocked(notesService.listNotes).mockResolvedValue(mockNotes);
    vi.mocked(notesService.updateNote).mockResolvedValue({
      ...mockNotes[0],
      content: 'Updated Note 1 content',
    });

    renderWithClient(<NotesPanel />);

    await waitFor(() => {
      expect(screen.getByText('Note 1 content')).toBeInTheDocument();
    });

    // Click edit on the first note
    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    await userEvent.click(editButtons[0]);

    expect(screen.getByText('Edit Note')).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText(/Write your note here/i);
    await userEvent.clear(textarea);
    await userEvent.type(textarea, 'Updated Note 1 content');

    await userEvent.click(screen.getByRole('button', { name: /save note/i }));

    await waitFor(() => {
      expect(notesService.updateNote).toHaveBeenCalledWith(1, {
        content: 'Updated Note 1 content',
        tags: ['tag1', 'tag2'],
      });
    });
  });

  it('deletes a note', async () => {
    vi.mocked(notesService.listNotes).mockResolvedValue(mockNotes);
    vi.mocked(notesService.deleteNote).mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockImplementation(() => true);

    renderWithClient(<NotesPanel />);

    await waitFor(() => {
      expect(screen.getByText('Note 1 content')).toBeInTheDocument();
    });

    // Click delete on the first note
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    await userEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(notesService.deleteNote).toHaveBeenCalledWith(1);
    });

    vi.restoreAllMocks();
  });

  it('shows error state if listNotes fails', async () => {
    vi.mocked(notesService.listNotes).mockRejectedValue(new Error('Network error'));
    
    // Silence React Query errors in console
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderWithClient(<NotesPanel />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load notes/i)).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });
});
