import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { suggestionsService } from './suggestionsService';

vi.mock('axios');
const mockedAxios: any = vi.mocked(axios);

describe('suggestionsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getGenerationStatus gets status for a dataset', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { status: 'COMPLETED', progress: 100 } });
    const res = await suggestionsService.getGenerationStatus(10);
    expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:8000/api/v1/query/suggestions/dataset/10/status');
    expect(res.status).toBe('COMPLETED');
  });

  it('generateSuggestions posts payload', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: { success: true } });
    await suggestionsService.generateSuggestions({ dataset_id: '5', max_per_keyword: 2 });
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/query/suggestions/generate',
      { dataset_id: '5', max_per_keyword: 2 }
    );
  });

  it('getDatasetSuggestions gets list', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: [{ id: 1 }] });
    await suggestionsService.getDatasetSuggestions(10, true);
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/query/suggestions/',
      { params: { dataset_id: 10, include_dismissed: true } }
    );
  });

  it('getDatasetKeywords gets keywords', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { keywords: ['quantum'] } });
    await suggestionsService.getDatasetKeywords('global' as any);
    expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:8000/api/v1/query/suggestions/dataset/global/keywords');
  });

  it('updateFeedback puts feedback', async () => {
    mockedAxios.put.mockResolvedValueOnce({ data: { id: 1, is_relevant: true } });
    await suggestionsService.updateFeedback(1, { is_relevant: true });
    expect(mockedAxios.put).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/query/suggestions/1/feedback/',
      { is_relevant: true }
    );
  });

  it('deleteDatasetSuggestions deletes', async () => {
    mockedAxios.delete.mockResolvedValueOnce({});
    await suggestionsService.deleteDatasetSuggestions(10);
    expect(mockedAxios.delete).toHaveBeenCalledWith('http://localhost:8000/api/v1/query/suggestions/dataset/10/');
  });

  it('getSuggestion gets single suggestion', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { id: 42 } });
    const res = await suggestionsService.getSuggestion(42);
    expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:8000/api/v1/query/suggestions/42/');
    expect(res.id).toBe(42);
  });
});
