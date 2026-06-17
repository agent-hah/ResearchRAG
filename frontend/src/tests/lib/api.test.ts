import { describe, it, expect, vi } from 'vitest';
import { getErrorMessage, api } from '@/lib/api';

describe('api module', () => {
  describe('api instance defaults', () => {
    it('has correct baseURL', () => {
      expect(api.defaults.baseURL).toBe('/api/v1');
    });

    it('has correct timeout', () => {
      expect(api.defaults.timeout).toBe(120000);
    });

    it('has Content-Type header', () => {
      expect(api.defaults.headers['Content-Type']).toBe('application/json');
    });
  });

  describe('request interceptor', () => {
    it('removes Content-Type for FormData', () => {
      // The request interceptor removes Content-Type for FormData
      const formData = new FormData();
      const config = {
        data: formData,
        headers: { 'Content-Type': 'application/json' } as any,
      };

      // Get the request interceptor handlers
      const requestInterceptors = (api.interceptors.request as any).handlers;
      const interceptor = requestInterceptors[0];
      const result = interceptor.fulfilled(config);

      expect(result.headers['Content-Type']).toBeUndefined();
    });

    it('keeps Content-Type for non-FormData', () => {
      const config = {
        data: { key: 'value' },
        headers: { 'Content-Type': 'application/json' } as any,
      };

      const requestInterceptors = (api.interceptors.request as any).handlers;
      const interceptor = requestInterceptors[0];
      const result = interceptor.fulfilled(config);

      expect(result.headers['Content-Type']).toBe('application/json');
    });

    it('rejects on request error', async () => {
      const requestInterceptors = (api.interceptors.request as any).handlers;
      const interceptor = requestInterceptors[0];
      const error = new Error('Request setup failed');

      await expect(interceptor.rejected(error)).rejects.toThrow('Request setup failed');
    });
  });

  describe('response interceptor', () => {
    it('passes through successful responses', () => {
      const responseInterceptors = (api.interceptors.response as any).handlers;
      const interceptor = responseInterceptors[0];
      const response = { data: { result: 'ok' }, status: 200 };
      const result = interceptor.fulfilled(response);

      expect(result).toEqual(response);
    });

    it('logs and rejects 401 errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const responseInterceptors = (api.interceptors.response as any).handlers;
      const interceptor = responseInterceptors[0];
      const error = { response: { status: 401 } };

      await expect(interceptor.rejected(error)).rejects.toEqual(error);
      expect(consoleSpy).toHaveBeenCalledWith('Unauthorized access');
      consoleSpy.mockRestore();
    });

    it('logs and rejects 500+ errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const responseInterceptors = (api.interceptors.response as any).handlers;
      const interceptor = responseInterceptors[0];
      const error = { response: { status: 500, data: { detail: 'Internal error' } } };

      await expect(interceptor.rejected(error)).rejects.toEqual(error);
      expect(consoleSpy).toHaveBeenCalledWith('Server error:', { detail: 'Internal error' });
      consoleSpy.mockRestore();
    });

    it('rejects other errors without logging', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const responseInterceptors = (api.interceptors.response as any).handlers;
      const interceptor = responseInterceptors[0];
      const error = { response: { status: 400, data: {} } };

      await expect(interceptor.rejected(error)).rejects.toEqual(error);
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('getErrorMessage', () => {
    it('extracts detail from response', () => {
      const error = { response: { data: { detail: 'Custom error' } } };
      expect(getErrorMessage(error)).toBe('Custom error');
    });

    it('falls back to error.message', () => {
      const error = { message: 'Network error' };
      expect(getErrorMessage(error)).toBe('Network error');
    });

    it('provides default message for unknown errors', () => {
      expect(getErrorMessage({})).toBe('An unexpected error occurred');
    });

    it('handles error with response but no detail or message', () => {
      const error = { response: { data: {} } };
      expect(getErrorMessage(error)).toBe('An unexpected error occurred');
    });
  });
});
