import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnnotationForm } from '@/components/literature/AnnotationForm';
import userEvent from '@testing-library/user-event';
import { Annotation } from '@/services/annotationsService';

describe('AnnotationForm', () => {
  const defaultProps = {
    literatureId: 1,
    pageNumber: 5,
    onSave: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders initial state for a new annotation', () => {
    render(<AnnotationForm {...defaultProps} />);
    
    expect(screen.getByText('Add Annotation')).toBeInTheDocument();
    expect(screen.getByLabelText(/Type/i)).toHaveValue('highlight');
    expect(screen.getByLabelText(/Highlighted Text/i)).toHaveValue('');
    expect(screen.getByRole('textbox', { name: /Add your thoughts/i })).toHaveTextContent('');
  });

  it('populates initial text from window.getSelection', () => {
    const mockGetSelection = vi.fn().mockReturnValue({
      toString: () => 'Selected text from PDF',
      rangeCount: 1,
      getRangeAt: () => ({
        getClientRects: () => [],
      }),
    });
    vi.spyOn(window, 'getSelection').mockImplementation(mockGetSelection as any);

    render(<AnnotationForm {...defaultProps} />);
    
    expect(screen.getByLabelText(/Highlighted Text/i)).toHaveValue('Selected text from PDF');

    vi.restoreAllMocks();
  });

  it('renders with existing annotation data when editing', () => {
    const editingAnnotation: Annotation = {
      id: 10,
      literature_id: 1,
      annotation_type: 'comment',
      content: 'Existing comment',
      highlighted_text: 'Existing highlighted text',
      page_number: 5,
      color: 'blue',
      created_at: '2023-11-01T10:00:00Z',
      updated_at: '2023-11-01T10:00:00Z',
      note_id: 1,
      x_position: 10,
      y_position: 10,
      width: 100,
      height: 100,
    };

    render(<AnnotationForm {...defaultProps} editingAnnotation={editingAnnotation} />);

    expect(screen.getByText('Edit Annotation')).toBeInTheDocument();
    expect(screen.getByLabelText(/Type/i)).toHaveValue('comment');
    expect(screen.getByLabelText(/Highlighted Text/i)).toHaveValue('Existing highlighted text');
    expect(screen.getByRole('textbox', { name: /Add your thoughts/i })).toHaveTextContent('Existing comment');
  });

  it('updates form fields', async () => {
    render(<AnnotationForm {...defaultProps} />);

    // Change Type
    const typeSelect = screen.getByLabelText(/Type/i);
    await userEvent.selectOptions(typeSelect, 'note');
    expect(typeSelect).toHaveValue('note');

    // Change Highlighted Text
    const highlightInput = screen.getByLabelText(/Highlighted Text/i);
    await userEvent.type(highlightInput, 'New highlighted text');
    expect(highlightInput).toHaveValue('New highlighted text');

    // Change Content
    const contentInput = screen.getByRole('textbox', { name: /Add your thoughts/i });
    await userEvent.type(contentInput, 'New comment');
    expect(contentInput).toHaveTextContent('New comment');

    // Change Color
    const blueColorButton = screen.getByTitle('Blue');
    await userEvent.click(blueColorButton);
    expect(blueColorButton).toHaveClass('border-gray-900'); // Selected state class
  });

  it('submits correctly', async () => {
    render(<AnnotationForm {...defaultProps} />);

    await userEvent.type(screen.getByLabelText(/Highlighted Text/i), 'Test highlight');
    await userEvent.type(screen.getByRole('textbox', { name: /Add your thoughts/i }), 'Test comment');
    await userEvent.click(screen.getByRole('button', { name: /Save/i }));

    expect(defaultProps.onSave).toHaveBeenCalledWith({
      literature_id: 1,
      annotation_type: 'highlight',
      content: 'Test comment',
      highlighted_text: 'Test highlight',
      page_number: 5,
      color: 'yellow',
    });
  });

  it('cancels via Cancel button', async () => {
    render(<AnnotationForm {...defaultProps} />);
    
    await userEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it('cancels via X (close) button', async () => {
    render(<AnnotationForm {...defaultProps} />);
    
    // The X icon button doesn't have text but has an SVG child, we can target it by finding the button that contains an svg and is located near 'Add Annotation'
    // There are 2 buttons, close is the first one without name text.
    const closeButton = screen.getAllByRole('button')[0]; 
    await userEvent.click(closeButton);
    
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });
});
