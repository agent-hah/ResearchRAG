import { describe, it, expect, vi, beforeEach } from 'vitest';
import { annotationsService, AnnotationCreate, AnnotationUpdate } from './annotationsService';
import { api } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

describe('annotationsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createAnnotation calls api.post and returns data', async () => {
    const mockAnnotation: any = { id: 1, annotation_type: 'highlight' };
    (api.post as any).mockResolvedValueOnce({ data: mockAnnotation });
    
    const annotationData: AnnotationCreate = { literature_id: 1, annotation_type: 'highlight', page_number: 1 };
    const result = await annotationsService.createAnnotation(annotationData);
    
    expect(api.post).toHaveBeenCalledWith('/annotations/', annotationData);
    expect(result).toEqual(mockAnnotation);
  });

  it('getLiteratureAnnotations calls api.get with pageNumber parameter', async () => {
    const mockAnnotations: any = [{ id: 1 }];
    (api.get as any).mockResolvedValueOnce({ data: mockAnnotations });
    
    const result = await annotationsService.getLiteratureAnnotations(1, 2);
    
    expect(api.get).toHaveBeenCalledWith('/annotations/', {
      params: { literature_id: 1, page_number: 2 }
    });
    expect(result).toEqual(mockAnnotations);
  });

  it('getLiteratureAnnotations calls api.get without pageNumber parameter', async () => {
    const mockAnnotations: any = [{ id: 1 }];
    (api.get as any).mockResolvedValueOnce({ data: mockAnnotations });
    
    const result = await annotationsService.getLiteratureAnnotations(1);
    
    expect(api.get).toHaveBeenCalledWith('/annotations/', {
      params: { literature_id: 1 }
    });
    expect(result).toEqual(mockAnnotations);
  });

  it('getAnnotation calls api.get and returns data', async () => {
    const mockAnnotation: any = { id: 1 };
    (api.get as any).mockResolvedValueOnce({ data: mockAnnotation });
    
    const result = await annotationsService.getAnnotation(1);
    
    expect(api.get).toHaveBeenCalledWith('/annotations/1/');
    expect(result).toEqual(mockAnnotation);
  });

  it('updateAnnotation calls api.put and returns data', async () => {
    const mockAnnotation: any = { id: 1, content: 'Updated' };
    (api.put as any).mockResolvedValueOnce({ data: mockAnnotation });
    
    const updateData: AnnotationUpdate = { content: 'Updated' };
    const result = await annotationsService.updateAnnotation(1, updateData);
    
    expect(api.put).toHaveBeenCalledWith('/annotations/1/', updateData);
    expect(result).toEqual(mockAnnotation);
  });

  it('deleteAnnotation calls api.delete', async () => {
    (api.delete as any).mockResolvedValueOnce({});
    
    await annotationsService.deleteAnnotation(1);
    
    expect(api.delete).toHaveBeenCalledWith('/annotations/1/');
  });
});
