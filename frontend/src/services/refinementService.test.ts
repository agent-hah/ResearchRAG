import { describe, it, expect, vi, beforeEach } from 'vitest';
import { refinementService } from './refinementService';
import { api } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  api: {
    post: vi.fn(),
  }
}));

describe('refinementService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('refineVisualization calls api.post and returns data', async () => {
    const mockResponse: any = { data: { updates: {}, refined_config: { type: 'bar', title: 'test' }, explanation: 'test' } };
    (api.post as any).mockResolvedValueOnce(mockResponse);
    
    const currentConfig: any = { type: 'bar', title: 'test' };
    const result = await refinementService.refineVisualization('test command', currentConfig);
    
    expect(api.post).toHaveBeenCalledWith(`/refinement/refine/`, {
      command: 'test command',
      current_config: currentConfig
    });
    expect(result).toEqual(mockResponse.data);
  });

  it('getSuggestions calls api.post and returns suggestions array', async () => {
    const mockResponse: any = { data: { suggestions: ['suggestion 1'] } };
    (api.post as any).mockResolvedValueOnce(mockResponse);
    
    const dataSummary = { key: 'value' };
    const result = await refinementService.getSuggestions('bar', dataSummary);
    
    expect(api.post).toHaveBeenCalledWith(`/refinement/suggestions/`, {
      chart_type: 'bar',
      data_summary: dataSummary
    });
    expect(result).toEqual(['suggestion 1']);
  });

  it('getSuggestions uses default dataSummary when not provided', async () => {
    const mockResponse: any = { data: { suggestions: ['suggestion 2'] } };
    (api.post as any).mockResolvedValueOnce(mockResponse);
    
    const result = await refinementService.getSuggestions('bar');
    
    expect(api.post).toHaveBeenCalledWith(`/refinement/suggestions/`, {
      chart_type: 'bar',
      data_summary: {}
    });
    expect(result).toEqual(['suggestion 2']);
  });
});
