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
    const response = await api.post<FileUploadResponse>('/query/datasets/upload/', formData)
    
    return response.data
  },

  uploadPDF: async (file: File): Promise<FileUploadResponse> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', 'pdf')
    
    // Don't set Content-Type header - let browser set it with boundary
    const response = await api.post<FileUploadResponse>('/literature/upload/', formData)
    
    return response.data
  },

  // List files
  listFiles: async (): Promise<FileListResponse> => {
    const [datasetsRes, literatureRes] = await Promise.all([
      api.get<Dataset[]>('/query/datasets/'),
      api.get<Literature[]>('/literature/')
    ])
    
    return {
      datasets: datasetsRes.data,
      literature: literatureRes.data,
      total_datasets: datasetsRes.data.length,
      total_literature: literatureRes.data.length
    }
  },

  listDatasets: async (): Promise<Dataset[]> => {
    const response = await api.get<Dataset[]>('/query/datasets/')
    return response.data
  },

  listLiterature: async (): Promise<Literature[]> => {
    const response = await api.get<Literature[]>('/literature/')
    return response.data
  },

  // Get single file
  getDataset: async (id: number): Promise<Dataset> => {
    const response = await api.get<Dataset>(`/query/datasets/${id}/`)
    return response.data
  },

  getLiterature: async (id: number): Promise<Literature> => {
    const response = await api.get<Literature>(`/literature/${id}/`)
    return response.data
  },

  // Get dataset preview
  getDatasetPreview: async (id: number, limit: number = 100) => {
    const response = await api.get(`/query/datasets/${id}/preview/`, {
      params: { limit },
    })
    return response.data
  },

  getDatasetVizData: async (id: number, limit: number = 1000) => {
    const response = await api.get(`/query/datasets/${id}/viz_data/`, {
      params: { limit },
    })
    return response.data
  },

  getDatasetSpatialData: async (id: number, limit: number = 1000) => {
    const response = await api.get(`/query/datasets/${id}/spatial_data/`, {
      params: { limit },
    })
    return response.data
  },

  // Delete files
  deleteDataset: async (id: number): Promise<void> => {
    await api.delete(`/query/datasets/${id}/`)
  },

  deleteLiterature: async (id: number): Promise<void> => {
    await api.delete(`/literature/${id}/`)
  },

  // Reprocess files
  reprocessDataset: async (id: number): Promise<void> => {
    await api.post(`/query/datasets/${id}/reprocess/`)
  },

  reprocessLiterature: async (id: number): Promise<void> => {
    await api.post(`/literature/${id}/reprocess/`)
  },
}