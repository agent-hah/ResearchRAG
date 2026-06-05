import { describe, it, expect, vi, beforeEach } from 'vitest';
import { queryService } from './queryService';
import { api } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  }
}));

describe('queryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('executeQuery calls POST /query/execute/', async () => {
    const mockResult = { query_id: '123', question: 'test' };
    vi.mocked(api.post).mockResolvedValueOnce({ data: mockResult });

    const req = { query: 'test query' };
    const result = await queryService.executeQuery(req);

    expect(api.post).toHaveBeenCalledWith('/query/execute/', req);
    expect(result).toEqual(mockResult);
  });

  it('getQueryHistory calls GET /query/history/ with pagination', async () => {
    const mockResult = { items: [], total: 0 };
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockResult });

    const result = await queryService.getQueryHistory(10, 50);

    expect(api.get).toHaveBeenCalledWith('/query/history/', {
      params: { skip: 10, limit: 50 }
    });
    expect(result).toEqual(mockResult);
  });

  it('getDatabaseSchema calls GET /query/schema/', async () => {
    const mockSchema = { tables: [] };
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockSchema });

    const result = await queryService.getDatabaseSchema();

    expect(api.get).toHaveBeenCalledWith('/query/schema/');
    expect(result).toEqual(mockSchema);
  });

  it('executeRawSQL calls POST /query/sql/execute/', async () => {
    const mockResult = { columns: [], rows: [], row_count: 0 };
    vi.mocked(api.post).mockResolvedValueOnce({ data: mockResult });

    const sql = 'SELECT * FROM test';
    const result = await queryService.executeRawSQL(sql);

    expect(api.post).toHaveBeenCalledWith('/query/sql/execute/', { sql });
    expect(result).toEqual(mockResult);
  });
});
