import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NoteCard } from './NoteCard';
import userEvent from '@testing-library/user-event';
import { Note } from '../../services/notesService';

// Mock ReactMarkdown since it's an external library
vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <div>{children}</div>,
}));

describe('NoteCard', () => {
  const mockNote: Note = {
    id: 1,
    content: 'This is a test note.',
    tags: ['test1', 'test2'],
    created_at: '2023-10-27T10:00:00Z',
    updated_at: '2023-10-27T10:00:00Z',
  };

  it('renders note content and metadata correctly', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    
    render(<NoteCard note={mockNote} onEdit={onEdit} onDelete={onDelete} />);

    expect(screen.getByText('This is a test note.')).toBeInTheDocument();
    expect(screen.getByText('test1')).toBeInTheDocument();
    expect(screen.getByText('test2')).toBeInTheDocument();
    expect(screen.getByText(/10\/27\/2023|27\/10\/2023/)).toBeInTheDocument(); // Flexible date format
  });

  it('truncates long content and toggles full content', async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const longNote = {
      ...mockNote,
      content: 'a'.repeat(300),
    };

    render(<NoteCard note={longNote} onEdit={onEdit} onDelete={onDelete} />);

    // Initially truncated
    expect(screen.getByText('a'.repeat(200) + '...')).toBeInTheDocument();
    
    const showMoreButton = screen.getByRole('button', { name: 'Show more' });
    await userEvent.click(showMoreButton);

    // Shows full content
    expect(screen.getByText('a'.repeat(300))).toBeInTheDocument();
    
    const showLessButton = screen.getByRole('button', { name: 'Show less' });
    await userEvent.click(showLessButton);

    // Back to truncated
    expect(screen.getByText('a'.repeat(200) + '...')).toBeInTheDocument();
  });

  it('renders Linked indicator when linked to a resource', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const linkedNote = {
      ...mockNote,
      dataset_id: 1,
    };

    render(<NoteCard note={linkedNote} onEdit={onEdit} onDelete={onDelete} />);
    expect(screen.getByText('Linked')).toBeInTheDocument();
  });

  it('calls onEdit when Edit button is clicked', async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    
    render(<NoteCard note={mockNote} onEdit={onEdit} onDelete={onDelete} />);
    
    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    expect(onEdit).toHaveBeenCalledWith(mockNote);
  });

  it('calls onDelete when Delete button is clicked and confirmed', async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    
    // Mock window.confirm to return true
    vi.spyOn(window, 'confirm').mockImplementation(() => true);

    render(<NoteCard note={mockNote} onEdit={onEdit} onDelete={onDelete} />);
    
    await userEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(window.confirm).toHaveBeenCalled();
    expect(onDelete).toHaveBeenCalledWith(mockNote.id);
    
    vi.restoreAllMocks();
  });

  it('does not call onDelete when Delete is cancelled', async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    
    // Mock window.confirm to return false
    vi.spyOn(window, 'confirm').mockImplementation(() => false);

    render(<NoteCard note={mockNote} onEdit={onEdit} onDelete={onDelete} />);
    
    await userEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(window.confirm).toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
    
    vi.restoreAllMocks();
  });

  it('renders and calls onViewRelationships when provided', async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const onViewRelationships = vi.fn();
    
    render(
      <NoteCard 
        note={mockNote} 
        onEdit={onEdit} 
        onDelete={onDelete} 
        onViewRelationships={onViewRelationships} 
      />
    );
    
    const relationsButton = screen.getByRole('button', { name: /relationships/i });
    expect(relationsButton).toBeInTheDocument();
    
    await userEvent.click(relationsButton);
    expect(onViewRelationships).toHaveBeenCalledWith(mockNote.id);
  });
});
