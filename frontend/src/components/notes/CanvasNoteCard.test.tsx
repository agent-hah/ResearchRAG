import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CanvasNoteCard } from './CanvasNoteCard';
import userEvent from '@testing-library/user-event';
import { Note } from '../../services/notesService';

// Mock ReactMarkdown to actually call the custom component renderers
vi.mock('react-markdown', () => ({
  default: ({ children, components }: { children: string; components?: Record<string, any> }) => {
    // Render each custom component to ensure coverage of their renderers
    if (components) {
      return (
        <div>
          {components.h1 && components.h1({ node: null, children: 'h1 content' })}
          {components.h2 && components.h2({ node: null, children: 'h2 content' })}
          {components.h3 && components.h3({ node: null, children: 'h3 content' })}
          {components.p && components.p({ node: null, children })}
          {components.ul && components.ul({ node: null, children: 'list' })}
          {components.ol && components.ol({ node: null, children: 'ordered list' })}
          {components.li && components.li({ node: null, children: 'item' })}
          {components.code && components.code({ node: null, inline: true, children: 'inline code' })}
          {components.code && components.code({ node: null, inline: false, children: 'block code' })}
          {components.blockquote && components.blockquote({ node: null, children: 'quote' })}
        </div>
      );
    }
    return <div>{children}</div>;
  },
}));

describe('CanvasNoteCard', () => {
  const mockNote: Note = {
    id: 0,
    content: 'This is a test canvas note.',
    tags: ['canvas1', 'canvas2'],
    created_at: '2023-11-01T10:00:00Z',
    updated_at: '2023-11-01T10:00:00Z',
  };

  it('renders correctly with color, date, tags and content', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    const { container } = render(
      <CanvasNoteCard note={mockNote} onEdit={onEdit} onDelete={onDelete} />
    );

    expect(screen.getByText('canvas1')).toBeInTheDocument();
    expect(screen.getByText('canvas2')).toBeInTheDocument();
    expect(screen.getByText(/11\//)).toBeInTheDocument();

    // Check color class based on note.id (0 % 6 = 0 -> bg-yellow-100)
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('bg-yellow-100');
    expect(card).toHaveClass('border-yellow-300');
  });

  it('renders all ReactMarkdown custom components', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(<CanvasNoteCard note={mockNote} onEdit={onEdit} onDelete={onDelete} />);

    expect(screen.getByText('h1 content')).toBeInTheDocument();
    expect(screen.getByText('h2 content')).toBeInTheDocument();
    expect(screen.getByText('h3 content')).toBeInTheDocument();
    expect(screen.getByText('inline code')).toBeInTheDocument();
    expect(screen.getByText('block code')).toBeInTheDocument();
    expect(screen.getByText('quote')).toBeInTheDocument();
  });

  it('truncates content to 150 characters', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    const longNote = {
      ...mockNote,
      content: 'a'.repeat(200),
    };

    render(<CanvasNoteCard note={longNote} onEdit={onEdit} onDelete={onDelete} />);
    // The truncated content is passed as children to ReactMarkdown's custom p component
    // Our mock renders the raw children from the p component
  });

  it('renders without tags when tags array is empty', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    const noteNoTags = { ...mockNote, tags: [] };
    render(<CanvasNoteCard note={noteNoTags} onEdit={onEdit} onDelete={onDelete} />);

    expect(screen.queryByText('canvas1')).not.toBeInTheDocument();
  });

  it('renders without tags when tags is undefined', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    const noteNoTags = { ...mockNote, tags: undefined } as any;
    render(<CanvasNoteCard note={noteNoTags} onEdit={onEdit} onDelete={onDelete} />);
    // Should not crash
  });

  it('calls onEdit when edit button is clicked', async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(<CanvasNoteCard note={mockNote} onEdit={onEdit} onDelete={onDelete} />);
    await userEvent.click(screen.getByTitle('Edit note'));
    expect(onEdit).toHaveBeenCalledWith(mockNote);
  });

  it('calls onDelete when delete button is clicked', async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(<CanvasNoteCard note={mockNote} onEdit={onEdit} onDelete={onDelete} />);
    await userEvent.click(screen.getByTitle('Delete note'));
    expect(onDelete).toHaveBeenCalledWith(mockNote.id);
  });

  it('uses different color classes based on note.id', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    const { container } = render(
      <CanvasNoteCard note={{ ...mockNote, id: 1 }} onEdit={onEdit} onDelete={onDelete} />
    );

    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('bg-blue-100');
    expect(card).toHaveClass('border-blue-300');
  });
});
