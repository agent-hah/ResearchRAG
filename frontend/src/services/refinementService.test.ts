import { describe, it, expect, vi, beforeEach } from 'vitest';
import { refinementService } from './refinementService';
import axios from 'axios';

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
  }
}));

describe('refinementService', () => {
  const API_BASE_URL = 'http://localhost:8000'; // based on fallback

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('refineVisualization calls axios.post and returns data', async () => {
    const mockResponse: any = { data: { updates: {}, refined_config: { type: 'bar', title: 'test' }, explanation: 'test' } };
    (axios.post as any).mockResolvedValueOnce(mockResponse);
    
    const currentConfig: any = { type: 'bar', title: 'test' };
    const result = await refinementService.refineVisualization('test command', currentConfig);
    
    expect(axios.post).toHaveBeenCalledWith(`${API_BASE_URL}/api/refinement/refine`, {
      command: 'test command',
      current_config: currentConfig
    });
    expect(result).toEqual(mockResponse.data);
  });

  it('getSuggestions calls axios.post and returns suggestions array', async () => {
    const mockResponse: any = { data: { suggestions: ['suggestion 1'] } };
    (axios.post as any).mockResolvedValueOnce(mockResponse);
    
    const dataSummary = { key: 'value' };
    const result = await refinementService.getSuggestions('bar', dataSummary);
    
    expect(axios.post).toHaveBeenCalledWith(`${API_BASE_URL}/api/refinement/suggestions`, {
      chart_type: 'bar',
      data_summary: dataSummary
    });
    expect(result).toEqual(['suggestion 1']);
  });

  it('getSuggestions uses default dataSummary when not provided', async () => {
    const mockResponse: any = { data: { suggestions: ['suggestion 2'] } };
    (axios.post as any).mockResolvedValueOnce(mockResponse);
    
    const result = await refinementService.getSuggestions('bar');
    
    expect(axios.post).toHaveBeenCalledWith(`${API_BASE_URL}/api/refinement/suggestions`, {
      chart_type: 'bar',
      data_summary: {}
    });
    expect(result).toEqual(['suggestion 2']);
  });
});
