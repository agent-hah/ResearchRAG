import { api } from '@/lib/api'
import type {
  FileListResponse,
  FileUploadResponse,
  Dataset,
  Literature,
} from '@/types'

export const fileService = {
  // Upload files
  uploadCSV: async (file: File): Promise<FileUploadResponse> => {
    const formData = new FormData()
    formData.append('file', file)
    
    // Don't set Content-Type header - let browser set it with boundary
    const response = await api.post<FileUploadResponse>('/files/upload/csv', formData)
    
    return response.data
  },

  uploadPDF: async (file: File): Promise<FileUploadResponse> => {
    const formData = new FormData()
    formData.append('file', file)
    
    // Don't set Content-Type header - let browser set it with boundary
    const response = await api.post<FileUploadResponse>('/files/upload/pdf', formData)
    
    return response.data
  },

  // List files
  listFiles: async (): Promise<FileListResponse> => {
    const response = await api.get<FileListResponse>('/files/list')
    return response.data
  },

  listDatasets: async (): Promise<Dataset[]> => {
    const response = await api.get<Dataset[]>('/files/datasets')
    return response.data
  },

  listLiterature: async (): Promise<Literature[]> => {
    const response = await api.get<Literature[]>('/files/literature')
    return response.data
  },

  // Get single file
  getDataset: async (id: number): Promise<Dataset> => {
    const response = await api.get<Dataset>(`/files/datasets/${id}`)
    return response.data
  },

  getLiterature: async (id: number): Promise<Literature> => {
    const response = await api.get<Literature>(`/files/literature/${id}`)
    return response.data
  },

  // Get dataset preview
  getDatasetPreview: async (id: number, limit: number = 100) => {
    const response = await api.get(`/files/datasets/${id}/preview`, {
      params: { limit },
    })
    return response.data
  },

  // Delete files
  deleteDataset: async (id: number): Promise<void> => {
    await api.delete(`/files/datasets/${id}`)
  },

  deleteLiterature: async (id: number): Promise<void> => {
    await api.delete(`/files/literature/${id}`)
  },

  // Reprocess files
  reprocessDataset: async (id: number): Promise<void> => {
    await api.post(`/files/datasets/${id}/reprocess`)
  },

  reprocessLiterature: async (id: number): Promise<void> => {
    await api.post(`/files/literature/${id}/reprocess`)
  },
}