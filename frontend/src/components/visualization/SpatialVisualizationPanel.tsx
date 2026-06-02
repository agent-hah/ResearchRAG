import { useState } from 'react'
import { SpatialMap } from './SpatialMap'
import { Map, Download, X, Layers } from 'lucide-react'
import {
  detectSpatialData,
  transformToSpatialData,
  calculateBounds,
  getCenter,
  calculateZoom,
  exportAsGeoJSON,
  type SpatialDataPoint
} from '../../services/spatialVisualizationService'

interface SpatialVisualizationPanelProps {
  columns: string[]
  rows: any[][]
  question?: string
  onClose?: () => void
}

export function SpatialVisualizationPanel({
  columns,
  rows,
  question,
  onClose
}: SpatialVisualizationPanelProps) {
  const [showHeatmap, setShowHeatmap] = useState(false)

  // Detect spatial data
  const { isSpatial, latIndex, lngIndex } = detectSpatialData(columns, rows)

  if (!isSpatial) {
    return (
      <div className="card border-amber-200 bg-amber-50">
        <div className="card-content">
          <div className="flex items-start gap-3">
            <Map className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-amber-800">
                No Spatial Data Detected
              </h3>
              <p className="text-sm text-amber-700 mt-1">
                This dataset does not contain recognizable geographic coordinates (latitude/longitude).
                Spatial visualization requires columns named 'lat'/'latitude' and 'lng'/'longitude' with
                valid coordinate values.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Transform data to spatial points
  const spatialPoints: SpatialDataPoint[] = transformToSpatialData(
    columns,
    rows,
    latIndex,
    lngIndex
  )

  // Calculate map parameters
  const bounds = calculateBounds(spatialPoints)
  const center = getCenter(bounds)
  const zoom = calculateZoom(bounds)

  const handleExportGeoJSON = () => {
    try {
      const geoJSON = exportAsGeoJSON(spatialPoints)
      const blob = new Blob([geoJSON], { type: 'application/json' })
      const link = document.createElement('a')
      link.download = `spatial-data-${Date.now()}.geojson`
      link.href = URL.createObjectURL(blob)
      link.click()
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export GeoJSON. Please try again.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Map Display */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Map className="w-5 h-5 text-primary-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Spatial Visualization</h3>
              {question && (
                <p className="text-sm text-gray-500 mt-1">{question}</p>
              )}
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-md"
              title="Close spatial visualization"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        <div className="card-content">
          <SpatialMap
            points={spatialPoints}
            center={center}
            zoom={zoom}
            showHeatmap={showHeatmap}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">Map Controls</h3>
          <p className="text-sm text-gray-500 mt-1">
            Customize the spatial visualization
          </p>
        </div>
        <div className="card-content space-y-4">
          {/* Visualization Style */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Layers className="w-4 h-4 inline mr-1" />
              Visualization Style
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setShowHeatmap(false)}
                className={`px-4 py-2 text-sm rounded-md border transition-colors ${
                  !showHeatmap
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-primary-500'
                }`}
              >
                Markers
              </button>
              <button
                onClick={() => setShowHeatmap(true)}
                className={`px-4 py-2 text-sm rounded-md border transition-colors ${
                  showHeatmap
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-primary-500'
                }`}
              >
                Heatmap
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {showHeatmap
                ? 'Colored circles show value intensity'
                : 'Standard markers for each data point'}
            </p>
          </div>

          {/* Export */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Download className="w-4 h-4 inline mr-1" />
              Export Spatial Data
            </label>
            <button
              onClick={handleExportGeoJSON}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              Export as GeoJSON
            </button>
            <p className="text-xs text-gray-500 mt-2">
              GeoJSON format compatible with GIS tools
            </p>
          </div>

          {/* Data Summary */}
          <div className="pt-4 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Data Summary</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Data Points</p>
                <p className="font-semibold text-gray-900">{spatialPoints.length}</p>
              </div>
              <div>
                <p className="text-gray-500">Coordinate Columns</p>
                <p className="font-semibold text-gray-900">
                  {columns[latIndex]}, {columns[lngIndex]}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Latitude Range</p>
                <p className="font-semibold text-gray-900">
                  {bounds.minLat.toFixed(2)}° to {bounds.maxLat.toFixed(2)}°
                </p>
              </div>
              <div>
                <p className="text-gray-500">Longitude Range</p>
                <p className="font-semibold text-gray-900">
                  {bounds.minLng.toFixed(2)}° to {bounds.maxLng.toFixed(2)}°
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Map Instructions */}
      <div className="text-sm text-gray-500 text-center space-y-1">
        <p>Click markers to view details • Scroll to zoom • Drag to pan</p>
        <p>Visualizing {spatialPoints.length} geographic data points</p>
      </div>
    </div>
  )
}
