import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, Map as MapIcon, Database } from 'lucide-react'
import { fileService } from '../services/fileService'
import { VisualizationPanel } from '../components/visualization/VisualizationPanel'
import { SpatialMap } from '../components/visualization/SpatialMap'
import { calculateBounds, getCenter, calculateZoom } from '../services/spatialVisualizationService'

export function VisualizationPage() {
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'chart' | 'map'>('chart')

  const { data: datasets, isLoading: datasetsLoading } = useQuery({
    queryKey: ['datasets'],
    queryFn: () => fileService.listDatasets()
  })

  const { data: vizData, isLoading: vizLoading, error: vizError } = useQuery({
    queryKey: ['dataset-viz', selectedDatasetId],
    queryFn: () => fileService.getDatasetVizData(selectedDatasetId!, 1000),
    enabled: selectedDatasetId !== null && activeTab === 'chart',
  })

  const { data: spatialData, isLoading: spatialLoading, error: spatialError } = useQuery({
    queryKey: ['dataset-spatial', selectedDatasetId],
    queryFn: () => fileService.getDatasetSpatialData(selectedDatasetId!, 1000),
    enabled: selectedDatasetId !== null && activeTab === 'map',
  })

  const chartColumns = vizData?.columns || []
  const chartRows = vizData?.data?.map((row: any) => chartColumns.map((col: string) => row[col])) || []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Visualization Engine</h1>
        <p className="mt-2 text-lg text-gray-600">
          Select a dataset to generate and customize data visualizations
        </p>
      </div>

      <div className="card">
        <div className="card-header flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-900">Dataset Selection</h3>
          </div>
        </div>
        <div className="card-content">
          {datasetsLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="loading-spinner h-6 w-6" />
              <span className="ml-3 text-gray-600">Loading datasets...</span>
            </div>
          ) : (
            <select
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
              value={selectedDatasetId || ''}
              onChange={(e) => setSelectedDatasetId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">-- Select a dataset --</option>
              {datasets?.map((dataset) => (
                <option key={dataset.id} value={dataset.id}>
                  {dataset.filename} ({dataset.row_count} rows)
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {selectedDatasetId && (
        <div className="card">
          <div className="border-b border-gray-200 px-6 pt-4">
            <div className="flex space-x-8">
              <button
                onClick={() => setActiveTab('chart')}
                className={`pb-4 flex items-center space-x-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'chart'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Chart</span>
              </button>
              <button
                onClick={() => setActiveTab('map')}
                className={`pb-4 flex items-center space-x-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'map'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <MapIcon className="w-4 h-4" />
                <span>Spatial Map</span>
              </button>
            </div>
          </div>
          
          <div className="p-6">
            {activeTab === 'chart' && (
              <>
                {vizLoading && (
                  <div className="flex items-center justify-center py-12">
                    <div className="loading-spinner h-8 w-8" />
                    <span className="ml-3 text-gray-600">Loading chart data...</span>
                  </div>
                )}
                {vizError && (
                  <div className="text-center py-12">
                    <p className="text-red-600">Failed to load chart data</p>
                  </div>
                )}
                {vizData && chartColumns.length > 0 && chartRows.length > 0 && (
                  <VisualizationPanel columns={chartColumns} rows={chartRows} />
                )}
              </>
            )}

            {activeTab === 'map' && (
              <>
                {spatialLoading && (
                  <div className="flex items-center justify-center py-12">
                    <div className="loading-spinner h-8 w-8" />
                    <span className="ml-3 text-gray-600">Loading spatial data...</span>
                  </div>
                )}
                {spatialError && (
                  <div className="text-center py-12">
                    <p className="text-red-600">Failed to load spatial data</p>
                  </div>
                )}
                {spatialData && !spatialData.is_spatial && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <MapIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="text-sm font-medium text-amber-800">
                          No Spatial Data Detected
                        </h3>
                        <p className="text-sm text-amber-700 mt-1">
                          This dataset does not contain recognizable geographic coordinates (latitude/longitude).
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {spatialData && spatialData.is_spatial && spatialData.points && (
                  <div className="space-y-4">
                    <SpatialMap 
                      points={spatialData.points} 
                      center={getCenter(calculateBounds(spatialData.points))} 
                      zoom={calculateZoom(calculateBounds(spatialData.points))} 
                    />
                    <div className="text-sm text-gray-500 text-center">
                      Visualizing {spatialData.total_points} geographic data points
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}