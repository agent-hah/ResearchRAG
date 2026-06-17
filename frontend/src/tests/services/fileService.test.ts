import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fileService } from '@/services/fileService';
import { api } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  }
}));

describe('fileService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uploadCSV sends FormData to /query/datasets/upload/', async () => {
    const file = new File(['data'], 'test.csv', { type: 'text/csv' });
    const responseData = { id: 1, filename: 'test.csv' };
    vi.mocked(api.post).mockResolvedValueOnce({ data: responseData });

    const result = await fileService.uploadCSV(file);

    expect(api.post).toHaveBeenCalledTimes(1);
    const [url, formData] = vi.mocked(api.post).mock.calls[0];
    expect(url).toBe('/query/datasets/upload/');
    expect(formData instanceof FormData).toBe(true);
    expect(result).toEqual(responseData);
  });

  it('uploadPDF sends FormData with type=pdf to /literature/upload/', async () => {
    const file = new File(['pdf data'], 'test.pdf', { type: 'application/pdf' });
    const responseData = { id: 2, filename: 'test.pdf' };
    vi.mocked(api.post).mockResolvedValueOnce({ data: responseData });

    const result = await fileService.uploadPDF(file);

    expect(api.post).toHaveBeenCalledTimes(1);
    const [url, formData] = vi.mocked(api.post).mock.calls[0];
    expect(url).toBe('/literature/upload/');
    expect(formData instanceof FormData).toBe(true);
    expect((formData as FormData).get('type')).toBe('pdf');
    expect(result).toEqual(responseData);
  });

  it('listFiles fetches datasets and literature', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: [{ id: 1 }] }); // datasets
    vi.mocked(api.get).mockResolvedValueOnce({ data: [{ id: 2 }, { id: 3 }] }); // literature

    const result = await fileService.listFiles();

    expect(api.get).toHaveBeenCalledTimes(2);
    expect(api.get).toHaveBeenCalledWith('/query/datasets/');
    expect(api.get).toHaveBeenCalledWith('/literature/');
    expect(result.total_datasets).toBe(1);
    expect(result.total_literature).toBe(2);
    expect(result.datasets[0].id).toBe(1);
  });

  it('listDatasets returns dataset array', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: [{ id: 1 }, { id: 2 }] });
    const result = await fileService.listDatasets();
    expect(api.get).toHaveBeenCalledWith('/query/datasets/');
    expect(result).toHaveLength(2);
  });

  it('listLiterature returns literature array', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: [{ id: 10 }] });
    const result = await fileService.listLiterature();
    expect(api.get).toHaveBeenCalledWith('/literature/');
    expect(result).toHaveLength(1);
  });

  it('getDataset returns dataset', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { id: 42 } });
    const res = await fileService.getDataset(42);
    expect(api.get).toHaveBeenCalledWith('/query/datasets/42/');
    expect(res.id).toBe(42);
  });

  it('getLiterature returns literature', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { id: 55, title: 'Paper' } });
    const res = await fileService.getLiterature(55);
    expect(api.get).toHaveBeenCalledWith('/literature/55/');
    expect(res.id).toBe(55);
  });

  it('getDatasetPreview uses default limit', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { rows: [] } });
    await fileService.getDatasetPreview(1);
    expect(api.get).toHaveBeenCalledWith('/query/datasets/1/preview/', { params: { limit: 100 } });
  });

  it('getDatasetPreview uses custom limit', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { rows: [] } });
    await fileService.getDatasetPreview(1, 50);
    expect(api.get).toHaveBeenCalledWith('/query/datasets/1/preview/', { params: { limit: 50 } });
  });

  it('getDatasetVizData uses default limit', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { rows: [] } });
    await fileService.getDatasetVizData(2);
    expect(api.get).toHaveBeenCalledWith('/query/datasets/2/viz_data/', { params: { limit: 1000 } });
  });



  it('deleteDataset calls delete API', async () => {
    vi.mocked(api.delete).mockResolvedValueOnce({});
    await fileService.deleteDataset(10);
    expect(api.delete).toHaveBeenCalledWith('/query/datasets/10/');
  });

  it('deleteLiterature calls delete API', async () => {
    vi.mocked(api.delete).mockResolvedValueOnce({});
    await fileService.deleteLiterature(20);
    expect(api.delete).toHaveBeenCalledWith('/literature/20/');
  });

  it('reprocessDataset calls post API', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({});
    await fileService.reprocessDataset(5);
    expect(api.post).toHaveBeenCalledWith('/query/datasets/5/reprocess/');
  });

  it('reprocessLiterature calls post API', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({});
    await fileService.reprocessLiterature(7);
    expect(api.post).toHaveBeenCalledWith('/literature/7/reprocess/');
  });
});
