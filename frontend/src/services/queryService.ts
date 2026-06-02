import { api } from '@/lib/api'
import type { QueryHistoryResponse } from '@/types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export interface QueryRequest {
  query: string
  dataset_ids?: number[]
  literature_ids?: number[]
  include_literature?: boolean
  max_literature_results?: number
}

export interface QueryResult {
  query_id: string
  question: string
  sql_query: string
  sql_confidence: number
  data_results: {
    columns: string[]
    rows: any[][]
    row_count: number
  }
  literature_context: LiteratureContext[]
  synthesis: string
  created_at: string
}

export interface LiteratureContext {
  literature_id: string
  title: string
  relevance_score: number
  excerpt: string
}

export interface QueryHistory {
  query_id: string
  question: string
  created_at: string
  sql_query: string
  row_count: number
}

export interface DatabaseSchema {
  tables: TableSchema[]
}

export interface TableSchema {
  table_name: string
  columns: ColumnSchema[]
  row_count: number
}

export interface ColumnSchema {
  column_name: string
  data_type: string
  nullable: boolean
}

export const queryService = {
  /**
   * Execute a natural language query
   */
  async executeQuery(request: QueryRequest): Promise<QueryResult> {
    const response = await api.post('/query/process', request)
    return response.data
  },

  /**
   * Get query history with pagination
   */
  async getQueryHistory(skip: number = 0, limit: number = 20): Promise<QueryHistoryResponse> {
    const response = await api.get('/query/history', {
      params: { skip, limit }
    })
    return response.data
  },

  /**
   * Get database schema information
   */
  async getDatabaseSchema(): Promise<DatabaseSchema> {
    const response = await api.get('/query/schema')
    return response.data
  },

  /**
   * Execute raw SQL query (SELECT only)
   */
  async executeRawSQL(sql: string): Promise<{
    columns: string[]
    rows: any[][]
    row_count: number
  }> {
    const response = await api.post('/query/sql/execute', { sql })
    return response.data
  }
}
