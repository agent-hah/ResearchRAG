import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NoteEditor } from './NoteEditor';
import userEvent from '@testing-library/user-event';

describe('NoteEditor', () => {
  it('renders initial state correctly', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    render(<NoteEditor onSave={onSave} onCancel={onCancel} />);

    expect(screen.getByPlaceholderText(/Write your note here/i)).toHaveValue('');
    expect(screen.getByPlaceholderText(/Add a tag/i)).toHaveValue('');
    expect(screen.getByRole('button', { name: /save note/i })).toBeDisabled();
  });

  it('populates with initial content and tags', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    render(
      <NoteEditor
        initialContent="Test note"
        initialTags={['tag1', 'tag2']}
        onSave={onSave}
        onCancel={onCancel}
      />
    );

    expect(screen.getByPlaceholderText(/Write your note here/i)).toHaveValue('Test note');
    expect(screen.getByText('tag1')).toBeInTheDocument();
    expect(screen.getByText('tag2')).toBeInTheDocument();
  });

  it('updates content on change', async () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    render(<NoteEditor onSave={onSave} onCancel={onCancel} />);

    const textarea = screen.getByPlaceholderText(/Write your note here/i);
    await userEvent.type(textarea, 'New note content');
    
    expect(textarea).toHaveValue('New note content');
    expect(screen.getByRole('button', { name: /save note/i })).not.toBeDisabled();
  });

  it('adds and removes tags correctly', async () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    render(<NoteEditor onSave={onSave} onCancel={onCancel} />);

    const tagInput = screen.getByPlaceholderText(/Add a tag/i);
    const addButton = screen.getByRole('button', { name: 'Add' });

    // Add via button
    await userEvent.type(tagInput, 'newTag1');
    await userEvent.click(addButton);
    expect(screen.getByText('newTag1')).toBeInTheDocument();
    expect(tagInput).toHaveValue('');

    // Add via Enter key
    await userEvent.type(tagInput, 'newTag2{enter}');
    expect(screen.getByText('newTag2')).toBeInTheDocument();

    // Try adding duplicate
    await userEvent.type(tagInput, 'newTag1{enter}');
    // Should still only have one
    expect(screen.getAllByText('newTag1')).toHaveLength(1);

    // Remove tag
    const removeButtons = screen.getAllByTitle('Remove tag');
    await userEvent.click(removeButtons[0]); // Removes first tag
    expect(screen.queryByText('newTag1')).not.toBeInTheDocument();
    expect(screen.getByText('newTag2')).toBeInTheDocument();
  });

  it('calls onSave with correct content and tags', async () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    render(<NoteEditor onSave={onSave} onCancel={onCancel} />);

    await userEvent.type(screen.getByPlaceholderText(/Write your note here/i), 'Final note content');
    await userEvent.type(screen.getByPlaceholderText(/Add a tag/i), 'finalTag{enter}');
    
    await userEvent.click(screen.getByRole('button', { name: /save note/i }));

    expect(onSave).toHaveBeenCalledWith('Final note content', ['finalTag']);
  });

  it('calls onCancel when cancel is clicked', async () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    render(<NoteEditor onSave={onSave} onCancel={onCancel} />);

    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('disables inputs when isLoading is true', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    render(<NoteEditor onSave={onSave} onCancel={onCancel} isLoading={true} />);

    expect(screen.getByPlaceholderText(/Write your note here/i)).toBeDisabled();
    expect(screen.getByPlaceholderText(/Add a tag/i)).toBeDisabled();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /saving\.\.\./i })).toBeDisabled();
  });
});
