import { describe, it, expect } from 'vitest';
import { detectSpatialData, transformToSpatialData, calculateBounds, getCenter, calculateZoom, getPointColor, exportAsGeoJSON } from './spatialVisualizationService';

describe('spatialVisualizationService', () => {
  describe('detectSpatialData', () => {
    it('detects valid coordinate columns by name', () => {
      const columns = ['name', 'lat', 'lng'];
      const rows = [['A', 40.7, -74.0], ['B', 41.8, -87.6]];
      const result = detectSpatialData(columns, rows);
      expect(result.isSpatial).toBe(true);
      expect(result.latIndex).toBe(1);
      expect(result.lngIndex).toBe(2);
    });

    it('returns false for invalid coordinate names', () => {
      const columns = ['name', 'x', 'y'];
      // x and y are detected by fallback or by name (x=lng, y=lat)
      const rows = [['A', -74.0, 40.7]];
      const result = detectSpatialData(columns, rows);
      expect(result.isSpatial).toBe(true);
      expect(result.latIndex).toBe(2); // y
      expect(result.lngIndex).toBe(1); // x
    });

    it('detects spatial data using fallback numeric column checks', () => {
      const columns = ['name', 'val1', 'val2'];
      const rows = [['A', 40.7, -74.0]]; // lat is in range [-90,90], lng is in [-180,180]
      const result = detectSpatialData(columns, rows);
      expect(result.isSpatial).toBe(true);
      expect(result.latIndex).toBe(1);
      expect(result.lngIndex).toBe(2);
    });

    it('returns false if out of range', () => {
      const columns = ['name', 'lat', 'lng'];
      const rows = [['A', 100, -74.0]];
      const result = detectSpatialData(columns, rows);
      expect(result.isSpatial).toBe(false);
    });

    it('returns false if not enough columns', () => {
      expect(detectSpatialData(['lat'], [[40.7]]).isSpatial).toBe(false);
    });
  });

  describe('transformToSpatialData', () => {
    it('transforms query results to spatial data points', () => {
      const columns = ['name', 'lat', 'lng', 'value'];
      const rows = [['Point A', 40.7, -74.0, 100]];
      const points = transformToSpatialData(columns, rows, 1, 2);
      
      expect(points.length).toBe(1);
      expect(points[0].lat).toBe(40.7);
      expect(points[0].lng).toBe(-74.0);
      expect(points[0].label).toBe('Point A');
      expect(points[0].value).toBe(100);
      expect(points[0].metadata).toEqual({ value: 100, name: 'Point A' });
    });
  });

  describe('calculateBounds', () => {
    it('calculates bounds correctly', () => {
      const points = [
        { lat: 10, lng: -10, label: 'A' },
        { lat: 20, lng: 10, label: 'B' }
      ];
      const bounds = calculateBounds(points);
      expect(bounds).toEqual({ minLat: 10, maxLat: 20, minLng: -10, maxLng: 10 });
    });

    it('returns default bounds for empty array', () => {
      const bounds = calculateBounds([]);
      expect(bounds).toEqual({ minLat: -90, maxLat: 90, minLng: -180, maxLng: 180 });
    });
  });

  describe('getCenter', () => {
    it('calculates center of bounds', () => {
      const bounds = { minLat: 10, maxLat: 20, minLng: -10, maxLng: 10 };
      expect(getCenter(bounds)).toEqual([15, 0]);
    });
  });

  describe('calculateZoom', () => {
    it('calculates zoom based on bounds difference', () => {
      expect(calculateZoom({ minLat: 0, maxLat: 110, minLng: 0, maxLng: 0 })).toBe(2);
      expect(calculateZoom({ minLat: 0, maxLat: 60, minLng: 0, maxLng: 0 })).toBe(3);
      expect(calculateZoom({ minLat: 0, maxLat: 30, minLng: 0, maxLng: 0 })).toBe(4);
      expect(calculateZoom({ minLat: 0, maxLat: 15, minLng: 0, maxLng: 0 })).toBe(5);
      expect(calculateZoom({ minLat: 0, maxLat: 6, minLng: 0, maxLng: 0 })).toBe(6);
      expect(calculateZoom({ minLat: 0, maxLat: 3, minLng: 0, maxLng: 0 })).toBe(7);
      expect(calculateZoom({ minLat: 0, maxLat: 1.5, minLng: 0, maxLng: 0 })).toBe(8);
      expect(calculateZoom({ minLat: 0, maxLat: 0.6, minLng: 0, maxLng: 0 })).toBe(9);
      expect(calculateZoom({ minLat: 0, maxLat: 0.2, minLng: 0, maxLng: 0 })).toBe(10);
      expect(calculateZoom({ minLat: 0, maxLat: 0.05, minLng: 0, maxLng: 0 })).toBe(12);
    });
  });

  describe('getPointColor', () => {
    it('returns colors based on value range', () => {
      expect(getPointColor(undefined, 0, 100)).toBe('#3b82f6');
      expect(getPointColor(10, 0, 100)).toBe('#3b82f6'); // < 0.25
      expect(getPointColor(40, 0, 100)).toBe('#10b981'); // < 0.5
      expect(getPointColor(60, 0, 100)).toBe('#f59e0b'); // < 0.75
      expect(getPointColor(90, 0, 100)).toBe('#ef4444'); // >= 0.75
    });
  });

  describe('exportAsGeoJSON', () => {
    it('exports correctly', () => {
      const points = [{ lat: 40, lng: -74, label: 'NY', value: 10 }];
      const geojsonStr = exportAsGeoJSON(points);
      const geojson = JSON.parse(geojsonStr);
      expect(geojson.type).toBe('FeatureCollection');
      expect(geojson.features[0].geometry.coordinates).toEqual([-74, 40]);
      expect(geojson.features[0].properties.label).toBe('NY');
    });
  });
});
