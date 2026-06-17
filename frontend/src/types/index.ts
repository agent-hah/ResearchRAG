// Common types
export interface BaseEntity {
  id: number
  created_at: string
  updated_at: string
}

// File types
export type FileType = 'csv' | 'pdf'
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'indexed' | 'failed'

export interface Dataset extends BaseEntity {
  filename: string
  file_path: string
  file_size: number
  row_count?: number
  column_count?: number
  columns?: string[]
  table_name?: string
  metadata?: {
    row_count?: number
    column_count?: number
    page_count?: number
    [key: string]: any
  }
}

export interface Literature extends BaseEntity {
  filename: string
  file_path: string
  file_size: number
  page_count?: number
  processing_status: ProcessingStatus
  indexing_progress?: number
  indexed_at?: string
  metadata?: {
    page_count?: number
    [key: string]: any
  }
}

export interface FileUploadResponse {
  id: number
  filename: string
  file_type: FileType
  file_size: number
  status: ProcessingStatus
  message: string
}

export interface FileListResponse {
  datasets: Dataset[]
  literature: Literature[]
  total_datasets: number
  total_literature: number
}

// RAG types
export interface RAGSearchRequest {
  query: string
  top_k?: number
  literature_ids?: number[]
}

export interface RAGSearchResult {
  literature_id: number
  filename: string
  text: string
  page?: number
  score: number
  metadata: Record<string, any>
}

export interface RAGSearchResponse {
  query: string
  results: RAGSearchResult[]
  total_results: number
  search_time_ms: number
}

export interface RAGStatsResponse {
  total_indexed: number
  total_chunks: number
  collection_name: string
  embedding_model: string
  chunk_size: number
  chunk_overlap: number
}

// Query types
export interface QueryRequest {
  query: string
  dataset_ids?: number[]
  literature_ids?: number[]
  include_literature?: boolean
  max_literature_results?: number
}

export interface SQLGeneration {
  sql_query: string
  explanation: string
  tables_used: string[]
  columns_used: string[]
  confidence: number
}

export interface DataResult {
  rows: Record<string, any>[]
  row_count: number
  columns: string[]
  execution_time_ms: number
}

export interface LiteratureContext {
  literature_id: number
  filename: string
  text: string
  relevance_score: number
  metadata: Record<string, any>
}

export interface QuerySynthesis {
  summary: string
  key_findings: string[]
  data_insights: string[]
  literature_insights: string[]
  methodology_notes?: string
  limitations?: string
}

export interface QueryResponse {
  query: string
  sql_generation: SQLGeneration
  data_result: DataResult
  literature_context: LiteratureContext[]
  synthesis: QuerySynthesis
  total_processing_time_ms: number
  timestamp: string
}

export interface QueryHistoryItem extends BaseEntity {
  query: string
  row_count: number
  literature_count: number
  processing_time_ms: number
  data_results?: DataResult
  literature_context?: LiteratureContext[]
  synthesis?: QuerySynthesis
}

export interface QueryHistoryResponse {
  queries: QueryHistoryItem[]
  total_count: number
  page: number
  page_size: number
}

export interface SchemaInfo {
  table_name: string
  columns: Array<{
    name: string
    type: string
    nullable: boolean
  }>
  row_count: number
  sample_data: Record<string, any>[]
}

export interface DatabaseSchemaResponse {
  schemas: SchemaInfo[]
  total_tables: number
}

// UI types
export interface NavItem {
  title: string
  href: string
  icon?: React.ComponentType<{ className?: string }>
  description?: string
}

export interface LoadingState {
  isLoading: boolean
  message?: string
}

export interface ErrorState {
  hasError: boolean
  message?: string
  details?: string
}

// Chart types (for future visualization)
export interface ChartData {
  id: string
  type: 'line' | 'bar' | 'scatter' | 'pie' | 'area'
  title: string
  data: any[]
  config: Record<string, any>
}

// Note types (for future notes feature)
export interface Note extends BaseEntity {
  title: string
  content: string
  tags: string[]
  dataset_id?: number
  literature_id?: number
  query_id?: number
}