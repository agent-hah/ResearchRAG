import { api } from '@/lib/api'

export type RelationshipType = 'references' | 'derived_from' | 'related_to' | 'contradicts' | 'supports' | 'questions'
export type EntityType = 'note' | 'query' | 'dataset' | 'literature' | 'visualization'

export interface Note {
  id: number
  content: string
  tags: string[] | null
  dataset_id: number | null
  literature_id: number | null
  query_id: number | null
  created_at: string
  updated_at: string
}

export interface NoteCreate {
  content: string
  tags?: string[]
  dataset_id?: number
  literature_id?: number
  query_id?: number
}

export interface NoteUpdate {
  content?: string
  tags?: string[]
}

export interface Relationship {
  id: number
  note_id: number
  target_type: string
  target_id: number
  relationship_type: string
  description: string | null
  created_at: string
}

export interface RelationshipCreate {
  target_type: EntityType
  target_id: number
  relationship_type: RelationshipType
  description?: string
}

export interface NoteGraph {
  nodes: Array<{
    id: number
    type: string
    content: string
    tags: string[]
  }>
  edges: Array<{
    source: number
    target: string
    type: string
    description: string | null
  }>
}

export const notesService = {
  /**
   * Create a new note
   */
  async createNote(note: NoteCreate): Promise<Note> {
    const response = await api.post('/notes', note)
    return response.data
  },

  /**
   * List notes with optional filtering
   */
  async listNotes(
    skip: number = 0,
    limit: number = 50,
    tags?: string,
    search?: string
  ): Promise<Note[]> {
    const params: any = { skip, limit }
    if (tags) params.tags = tags
    if (search) params.search = search
    
    const response = await api.get('/notes', { params })
    return response.data
  },

  /**
   * Get a specific note
   */
  async getNote(noteId: number): Promise<Note> {
    const response = await api.get(`/notes/${noteId}`)
    return response.data
  },

  /**
   * Update a note
   */
  async updateNote(noteId: number, update: NoteUpdate): Promise<Note> {
    const response = await api.put(`/notes/${noteId}`, update)
    return response.data
  },

  /**
   * Delete a note
   */
  async deleteNote(noteId: number): Promise<void> {
    await api.delete(`/notes/${noteId}`)
  },

  /**
   * Create a relationship
   */
  async createRelationship(
    noteId: number,
    relationship: RelationshipCreate
  ): Promise<Relationship> {
    const response = await api.post(
      `/notes/${noteId}/relationships`,
      relationship
    )
    return response.data
  },

  /**
   * Get note relationships
   */
  async getRelationships(noteId: number): Promise<Relationship[]> {
    const response = await api.get(`/notes/${noteId}/relationships`)
    return response.data
  },

  /**
   * Get note graph
   */
  async getNoteGraph(noteId: number, depth: number = 2): Promise<NoteGraph> {
    const response = await api.get(`/notes/${noteId}/graph`, {
      params: { depth }
    })
    return response.data
  },

  /**
   * Get related notes for an entity
   */
  async getRelatedNotes(targetType: EntityType, targetId: number): Promise<Note[]> {
    const response = await api.get(
      `/notes/related/${targetType}/${targetId}`
    )
    return response.data
  }
}
