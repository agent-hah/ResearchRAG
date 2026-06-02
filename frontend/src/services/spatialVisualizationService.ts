export interface SpatialDataPoint {
  lat: number
  lng: number
  label: string
  value?: number
  metadata?: Record<string, any>
}

export interface SpatialBounds {
  minLat: number
  maxLat: number
  minLng: number
  maxLng: number
}

/**
 * Detect if data contains spatial/geographic information
 */
export function detectSpatialData(
  columns: string[],
  rows: any[][]
): { isSpatial: boolean; latIndex: number; lngIndex: number } {
  if (columns.length < 2 || rows.length === 0) {
    return { isSpatial: false, latIndex: -1, lngIndex: -1 }
  }

  // Look for latitude/longitude column patterns
  const latPatterns = /^(lat|latitude|y|coord_y)$/i
  const lngPatterns = /^(lng|lon|long|longitude|x|coord_x)$/i

  let latIndex = -1
  let lngIndex = -1

  // Check column names
  columns.forEach((col, idx) => {
    if (latPatterns.test(col)) latIndex = idx
    if (lngPatterns.test(col)) lngIndex = idx
  })

  // If found by name, validate data is numeric
  if (latIndex >= 0 && lngIndex >= 0) {
    const hasValidCoords = rows.every(row => {
      const lat = Number(row[latIndex])
      const lng = Number(row[lngIndex])
      return !isNaN(lat) && !isNaN(lng) &&
             lat >= -90 && lat <= 90 &&
             lng >= -180 && lng <= 180
    })

    if (hasValidCoords) {
      return { isSpatial: true, latIndex, lngIndex }
    }
  }

  // Fallback: check if first two numeric columns are valid coordinates
  const numericColumns = columns
    .map((_, idx) => idx)
    .filter(idx => rows.every(row => typeof row[idx] === 'number'))

  if (numericColumns.length >= 2) {
    const [idx1, idx2] = numericColumns
    const hasValidCoords = rows.every(row => {
      const val1 = Number(row[idx1])
      const val2 = Number(row[idx2])
      return val1 >= -90 && val1 <= 90 &&
             val2 >= -180 && val2 <= 180
    })

    if (hasValidCoords) {
      return { isSpatial: true, latIndex: idx1, lngIndex: idx2 }
    }
  }

  return { isSpatial: false, latIndex: -1, lngIndex: -1 }
}

/**
 * Transform query results into spatial data points
 */
export function transformToSpatialData(
  columns: string[],
  rows: any[][],
  latIndex: number,
  lngIndex: number
): SpatialDataPoint[] {
  return rows.map((row, idx) => {
    const lat = Number(row[latIndex])
    const lng = Number(row[lngIndex])
    
    // Find a label column (first string column or row index)
    let label = `Point ${idx + 1}`
    for (let i = 0; i < row.length; i++) {
      if (i !== latIndex && i !== lngIndex && typeof row[i] === 'string') {
        label = row[i]
        break
      }
    }

    // Find a value column (first numeric column that's not lat/lng)
    let value: number | undefined
    for (let i = 0; i < row.length; i++) {
      if (i !== latIndex && i !== lngIndex && typeof row[i] === 'number') {
        value = row[i]
        break
      }
    }

    // Collect metadata from other columns
    const metadata: Record<string, any> = {}
    columns.forEach((col, i) => {
      if (i !== latIndex && i !== lngIndex) {
        metadata[col] = row[i]
      }
    })

    return { lat, lng, label, value, metadata }
  })
}

/**
 * Calculate bounds for spatial data
 */
export function calculateBounds(points: SpatialDataPoint[]): SpatialBounds {
  if (points.length === 0) {
    return { minLat: -90, maxLat: 90, minLng: -180, maxLng: 180 }
  }

  const lats = points.map(p => p.lat)
  const lngs = points.map(p => p.lng)

  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs)
  }
}

/**
 * Get center point for map
 */
export function getCenter(bounds: SpatialBounds): [number, number] {
  return [
    (bounds.minLat + bounds.maxLat) / 2,
    (bounds.minLng + bounds.maxLng) / 2
  ]
}

/**
 * Calculate appropriate zoom level based on bounds
 */
export function calculateZoom(bounds: SpatialBounds): number {
  const latDiff = bounds.maxLat - bounds.minLat
  const lngDiff = bounds.maxLng - bounds.minLng
  const maxDiff = Math.max(latDiff, lngDiff)

  if (maxDiff > 100) return 2
  if (maxDiff > 50) return 3
  if (maxDiff > 20) return 4
  if (maxDiff > 10) return 5
  if (maxDiff > 5) return 6
  if (maxDiff > 2) return 7
  if (maxDiff > 1) return 8
  if (maxDiff > 0.5) return 9
  if (maxDiff > 0.1) return 10
  return 12
}

/**
 * Get color for data point based on value
 */
export function getPointColor(value: number | undefined, min: number, max: number): string {
  if (value === undefined) return '#3b82f6' // default blue

  const normalized = (value - min) / (max - min)
  
  // Color gradient from blue (low) to red (high)
  if (normalized < 0.25) return '#3b82f6' // blue
  if (normalized < 0.5) return '#10b981' // green
  if (normalized < 0.75) return '#f59e0b' // amber
  return '#ef4444' // red
}

/**
 * Export spatial data as GeoJSON
 */
export function exportAsGeoJSON(points: SpatialDataPoint[]): string {
  const features = points.map(point => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [point.lng, point.lat]
    },
    properties: {
      label: point.label,
      value: point.value,
      ...point.metadata
    }
  }))

  const geoJSON = {
    type: 'FeatureCollection',
    features
  }

  return JSON.stringify(geoJSON, null, 2)
}
