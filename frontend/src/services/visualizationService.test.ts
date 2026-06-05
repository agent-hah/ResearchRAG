import { describe, it, expect } from 'vitest';
import { detectChartType, transformToChartData, generateChartConfig, exportChartJSON, exportChartCSV, getChartColors } from './visualizationService';

describe('visualizationService', () => {
  describe('detectChartType', () => {
    it('detects bar chart for larger categorical data', () => {
      const rows = Array.from({length: 15}).map((_, i) => [`Cat${i}`, 10]);
      expect(detectChartType(['cat', 'val'], rows, 15)).toBe('bar');
    });

    it('detects pie chart for small categorical data', () => {
      expect(detectChartType(['cat', 'val'], [['A', 10], ['B', 20]], 2)).toBe('pie');
    });

    it('detects line chart for time series', () => {
      expect(detectChartType(['date', 'val'], [['2023-01-01', 10]], 1)).toBe('line');
    });

    it('detects scatter chart for at least two numeric value columns (3 total)', () => {
      expect(detectChartType(['id', 'x', 'y'], [[1, 2, 3], [4, 5, 6]], 2)).toBe('scatter');
    });

    it('defaults to area appropriately', () => {
      expect(detectChartType(['val1', 'val2'], [[1, 2]], 1)).toBe('area');
    });
  });

  describe('transformToChartData', () => {
    it('transforms data for bar chart', () => {
      const columns = ['name', 'value'];
      const rows = [['A', 10], ['B', 20]];
      const config: any = { type: 'bar' };
      
      const result = transformToChartData(columns, rows, config);
      expect(result.labels).toEqual(['A', 'B']);
      expect(result.datasets[0].data).toEqual([10, 20]);
    });

    it('transforms data for pie chart', () => {
      const columns = ['name', 'value'];
      const rows = [['A', 10]];
      const config: any = { type: 'pie' };
      
      const result = transformToChartData(columns, rows, config);
      expect(result.labels).toEqual(['A']);
      expect(result.datasets[0].data).toEqual([10]);
    });

    it('transforms data for heatmap', () => {
      const columns = ['x', 'y', 'z'];
      const rows = [['A', 'B', 10]];
      const config: any = { type: 'heatmap', zAxisLabel: 'z' };
      
      const result = transformToChartData(columns, rows, config);
      expect(result.labels).toEqual(['A']);
      expect(result.datasets[0].label).toBe('B');
      expect(result.datasets[0].data).toEqual([10]);
    });

    it('transforms data for heatmap with aggregation and numeric sorting', () => {
      const columns = ['x', 'y', 'z'];
      const rows = [
        [2, 'B', 10],
        [1, 'B', 20],
        [2, 'B', 30]
      ];
      const config: any = { type: 'heatmap', zAxisLabel: 'z' };
      
      const result = transformToChartData(columns, rows, config);
      expect(result.labels).toEqual(['1', '2']);
      expect(result.datasets[0].label).toBe('B');
      expect(result.datasets[0].data).toEqual([20, 20]);
    });

    it('samples data if more than 1000 points', () => {
      const columns = ['name', 'value'];
      const rows = Array.from({ length: 2000 }).map((_, i) => [`Item ${i}`, i]);
      const config: any = { type: 'bar' };
      const result = transformToChartData(columns, rows, config);
      expect(result.labels.length).toBe(1000);
    });

    it('transforms data for scatter chart with numeric x', () => {
      const columns = ['x', 'y'];
      const rows = [[1, 10], [2, 20]];
      const config: any = { type: 'scatter' };
      const result = transformToChartData(columns, rows, config);
      expect(result.labels).toEqual([1, 2]);
    });

    it('defaults to first non-x columns if no numeric columns found', () => {
      const columns = ['name', 'cat1', 'cat2'];
      const rows = [['A', 'X', 'Y']];
      const config: any = { type: 'bar' };
      const result = transformToChartData(columns, rows, config);
      expect(result.datasets.length).toBe(2);
      expect(result.datasets[0].label).toBe('cat1');
      expect(result.datasets[1].label).toBe('cat2');
    });
  });

  describe('generateChartConfig', () => {
    it('generates config', () => {
      const config = generateChartConfig(['A', 'B'], 'bar', 'Test');
      expect(config.type).toBe('bar');
      expect(config.title).toBe('Test');
      expect(config.xAxisLabel).toBe('A');
      expect(config.yAxisLabel).toBe('B');
    });
  });

  describe('export functions', () => {
    const data = { labels: ['A'], datasets: [{ label: 'B', data: [1] }] };
    
    it('exportChartJSON works', () => {
      const config: any = { type: 'bar', title: 'test' };
      const json = exportChartJSON(data, config);
      expect(JSON.parse(json)).toHaveProperty('data');
    });

    it('exportChartCSV works', () => {
      const csv = exportChartCSV(data);
      expect(csv).toContain('Label,B');
      expect(csv).toContain('A,1');
    });
  });

  describe('getChartColors', () => {
    it('returns color palettes', () => {
      expect(getChartColors('red')).toContain('#ef4444');
      expect(getChartColors('viridis')).toContain('#22a884');
      expect(getChartColors('inferno')).toContain('#dd513a');
      expect(getChartColors('black')).toContain('#000000');
      expect(getChartColors('unknown')).toContain('#3b82f6'); // default blue
    });
  });
});
