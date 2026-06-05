import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notesService, NoteCreate, NoteUpdate, RelationshipCreate } from './notesService';
import { api } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

describe('notesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createNote calls api.post and returns data', async () => {
    const mockNote = { id: 1, content: 'Test Note' };
    (api.post as any).mockResolvedValueOnce({ data: mockNote });
    
    const noteData: NoteCreate = { content: 'Test Note' };
    const result = await notesService.createNote(noteData);
    
    expect(api.post).toHaveBeenCalledWith('/notes/notes/', noteData);
    expect(result).toEqual(mockNote);
  });

  it('listNotes calls api.get with parameters and returns data', async () => {
    const mockNotes = [{ id: 1, content: 'Test Note' }];
    (api.get as any).mockResolvedValueOnce({ data: mockNotes });
    
    const result = await notesService.listNotes(10, 20, 'tag1', 'search term');
    
    expect(api.get).toHaveBeenCalledWith('/notes/notes/', {
      params: { skip: 10, limit: 20, tags: 'tag1', search: 'search term' }
    });
    expect(result).toEqual(mockNotes);
  });

  it('listNotes calls api.get with default parameters', async () => {
    const mockNotes = [{ id: 1, content: 'Test Note' }];
    (api.get as any).mockResolvedValueOnce({ data: mockNotes });
    
    const result = await notesService.listNotes();
    
    expect(api.get).toHaveBeenCalledWith('/notes/notes/', {
      params: { skip: 0, limit: 50 }
    });
    expect(result).toEqual(mockNotes);
  });

  it('getNote calls api.get and returns data', async () => {
    const mockNote = { id: 1, content: 'Test Note' };
    (api.get as any).mockResolvedValueOnce({ data: mockNote });
    
    const result = await notesService.getNote(1);
    
    expect(api.get).toHaveBeenCalledWith('/notes/notes/1/');
    expect(result).toEqual(mockNote);
  });

  it('updateNote calls api.put and returns data', async () => {
    const mockNote = { id: 1, content: 'Updated Note' };
    (api.put as any).mockResolvedValueOnce({ data: mockNote });
    
    const updateData: NoteUpdate = { content: 'Updated Note' };
    const result = await notesService.updateNote(1, updateData);
    
    expect(api.put).toHaveBeenCalledWith('/notes/notes/1/', updateData);
    expect(result).toEqual(mockNote);
  });

  it('deleteNote calls api.delete', async () => {
    (api.delete as any).mockResolvedValueOnce({});
    
    await notesService.deleteNote(1);
    
    expect(api.delete).toHaveBeenCalledWith('/notes/notes/1/');
  });

  it('createRelationship calls api.post and returns data', async () => {
    const mockRelationship = { id: 1, note_id: 1, target_type: 'note', target_id: 2 };
    (api.post as any).mockResolvedValueOnce({ data: mockRelationship });
    
    const relationData: RelationshipCreate = { target_type: 'note', target_id: 2, relationship_type: 'references' };
    const result = await notesService.createRelationship(1, relationData);
    
    expect(api.post).toHaveBeenCalledWith('/notes/relationships/', { note_id: 1, ...relationData });
    expect(result).toEqual(mockRelationship);
  });

  it('getRelationships calls api.get and returns data', async () => {
    const mockRelationships = [{ id: 1, note_id: 1 }];
    (api.get as any).mockResolvedValueOnce({ data: mockRelationships });
    
    const result = await notesService.getRelationships(1);
    
    expect(api.get).toHaveBeenCalledWith('/notes/notes/1/relationships/');
    expect(result).toEqual(mockRelationships);
  });

  it('getNoteGraph calls api.get with depth parameter and returns data', async () => {
    const mockGraph = { nodes: [], edges: [] };
    (api.get as any).mockResolvedValueOnce({ data: mockGraph });
    
    const result = await notesService.getNoteGraph(1, 3);
    
    expect(api.get).toHaveBeenCalledWith('/notes/notes/1/graph/', {
      params: { depth: 3 }
    });
    expect(result).toEqual(mockGraph);
  });

  it('getNoteGraph calls api.get with default depth parameter', async () => {
    const mockGraph = { nodes: [], edges: [] };
    (api.get as any).mockResolvedValueOnce({ data: mockGraph });
    
    const result = await notesService.getNoteGraph(1);
    
    expect(api.get).toHaveBeenCalledWith('/notes/notes/1/graph/', {
      params: { depth: 2 }
    });
    expect(result).toEqual(mockGraph);
  });

  it('getRelatedNotes calls api.get and returns data', async () => {
    const mockNotes = [{ id: 1, content: 'Test' }];
    (api.get as any).mockResolvedValueOnce({ data: mockNotes });
    
    const result = await notesService.getRelatedNotes('query', 1);
    
    expect(api.get).toHaveBeenCalledWith('/notes/related/query/1/');
    expect(result).toEqual(mockNotes);
  });
});
