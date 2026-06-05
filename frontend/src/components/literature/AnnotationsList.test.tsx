import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AnnotationsList } from './AnnotationsList';
import userEvent from '@testing-library/user-event';
import { Annotation } from '../../services/annotationsService';

describe('AnnotationsList', () => {
  const mockAnnotations: Annotation[] = [
    {
      id: 1,
      literature_id: 100,
      annotation_type: 'highlight',
      highlighted_text: 'Important text',
      page_number: 1,
      color: 'yellow',
      created_at: '2023-11-01T10:00:00Z',
      updated_at: '2023-11-01T10:00:00Z',
    },
    {
      id: 2,
      literature_id: 100,
      annotation_type: 'comment',
      content: 'Needs review',
      page_number: 2,
      color: 'blue',
      created_at: '2023-11-02T10:00:00Z',
      updated_at: '2023-11-02T10:00:00Z',
    },
    {
      id: 3,
      literature_id: 100,
      annotation_type: 'note',
      highlighted_text: 'Some concept',
      content: 'Detailed note about the concept',
      page_number: 3,
      color: 'green',
      created_at: '2023-11-03T10:00:00Z',
      updated_at: '2023-11-03T10:00:00Z',
    }
  ];

  it('renders empty state when no annotations are provided', () => {
    render(<AnnotationsList annotations={[]} onEdit={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText('No annotations on this page')).toBeInTheDocument();
    expect(screen.getByText('Click "Annotate" to add one')).toBeInTheDocument();
  });

  it('renders a list of annotations', () => {
    render(
      <AnnotationsList 
        annotations={mockAnnotations} 
        onEdit={vi.fn()} 
        onDelete={vi.fn()} 
      />
    );

    // Highlight annotation
    expect(screen.getByText('highlight')).toBeInTheDocument();
    expect(screen.getByText('"Important text"')).toBeInTheDocument();
    expect(screen.getByText(/Page 1/)).toBeInTheDocument();

    // Comment annotation
    expect(screen.getByText('comment')).toBeInTheDocument();
    expect(screen.getByText('Needs review')).toBeInTheDocument();
    expect(screen.getByText(/Page 2/)).toBeInTheDocument();

    // Note annotation
    expect(screen.getByText('note')).toBeInTheDocument();
    expect(screen.getByText('"Some concept"')).toBeInTheDocument();
    expect(screen.getByText('Detailed note about the concept')).toBeInTheDocument();
    expect(screen.getByText(/Page 3/)).toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', async () => {
    const onEdit = vi.fn();
    render(
      <AnnotationsList 
        annotations={mockAnnotations} 
        onEdit={onEdit} 
        onDelete={vi.fn()} 
      />
    );

    const editButtons = screen.getAllByTitle('Edit annotation');
    expect(editButtons).toHaveLength(3);

    await userEvent.click(editButtons[0]);

    expect(onEdit).toHaveBeenCalledWith(mockAnnotations[0]);
  });

  it('calls onDelete when delete button is clicked', async () => {
    const onDelete = vi.fn();
    render(
      <AnnotationsList 
        annotations={mockAnnotations} 
        onEdit={vi.fn()} 
        onDelete={onDelete} 
      />
    );

    const deleteButtons = screen.getAllByTitle('Delete annotation');
    expect(deleteButtons).toHaveLength(3);

    await userEvent.click(deleteButtons[1]);

    expect(onDelete).toHaveBeenCalledWith(mockAnnotations[1].id);
  });
});
