import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../lib/api';
import { suggestionsService } from './suggestionsService';

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));
const mockedApi = vi.mocked(api);

describe('suggestionsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getGenerationStatus gets status for a dataset', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { status: 'COMPLETED', progress: 100 } });
    const res = await suggestionsService.getGenerationStatus(10);
    expect(mockedApi.get).toHaveBeenCalledWith('/query/suggestions/dataset/10/status');
    expect(res.status).toBe('COMPLETED');
  });

  it('generateSuggestions posts payload', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { success: true } });
    await suggestionsService.generateSuggestions({ dataset_id: '5', max_per_keyword: 2 });
    expect(mockedApi.post).toHaveBeenCalledWith(
      '/query/suggestions/generate',
      { dataset_id: '5', max_per_keyword: 2 }
    );
  });

  it('getDatasetSuggestions gets list', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [{ id: 1 }] });
    await suggestionsService.getDatasetSuggestions(10, true);
    expect(mockedApi.get).toHaveBeenCalledWith(
      '/query/suggestions/',
      { params: { dataset_id: 10, include_dismissed: true } }
    );
  });

  it('getDatasetKeywords gets keywords', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { keywords: ['quantum'] } });
    await suggestionsService.getDatasetKeywords('global' as any);
    expect(mockedApi.get).toHaveBeenCalledWith('/query/suggestions/dataset/global/keywords');
  });

  it('updateFeedback puts feedback', async () => {
    mockedApi.put.mockResolvedValueOnce({ data: { id: 1, is_relevant: true } });
    await suggestionsService.updateFeedback(1, { is_relevant: true });
    expect(mockedApi.put).toHaveBeenCalledWith(
      '/query/suggestions/1/feedback/',
      { is_relevant: true }
    );
  });

  it('deleteDatasetSuggestions deletes', async () => {
    mockedApi.delete.mockResolvedValueOnce({});
    await suggestionsService.deleteDatasetSuggestions(10);
    expect(mockedApi.delete).toHaveBeenCalledWith('/query/suggestions/dataset/10/');
  });

  it('getSuggestion gets single suggestion', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { id: 42 } });
    const res = await suggestionsService.getSuggestion(42);
    expect(mockedApi.get).toHaveBeenCalledWith('/query/suggestions/42/');
    expect(res.id).toBe(42);
  });
});
