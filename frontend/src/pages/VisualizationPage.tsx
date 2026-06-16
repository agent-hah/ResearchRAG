import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, Database, ChevronDown } from 'lucide-react'
import { fileService } from '../services/fileService'
import { VisualizationPanel } from '../components/visualization/VisualizationPanel'

export function VisualizationPage() {
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const { data: datasets, isLoading: datasetsLoading } = useQuery({
    queryKey: ['datasets'],
    queryFn: () => fileService.listDatasets()
  })

  const { data: vizData, isLoading: vizLoading, error: vizError } = useQuery({
    queryKey: ['dataset-viz', selectedDatasetId],
    queryFn: () => fileService.getDatasetVizData(selectedDatasetId!, 1000),
    enabled: selectedDatasetId !== null,
  })

  const chartColumns = vizData?.columns || []
  const chartRows = vizData?.data?.map((row: any) => chartColumns.map((col: string) => row[col])) || []

  const selectedDataset = datasets?.find(d => d.id === selectedDatasetId)
  const selectedDatasetName = selectedDataset ? `${selectedDataset.filename} (${selectedDataset.row_count} rows)` : '-- Select a dataset --'

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
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                className="mt-1 relative w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm hover:border-gray-400 transition-colors"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <span className="block truncate text-gray-900">{selectedDatasetName}</span>
                <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <ChevronDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </span>
              </button>

              {isDropdownOpen && (
                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                  <div
                    className={`cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-primary-50 transition-colors ${!selectedDatasetId ? 'text-primary-600 bg-primary-50' : 'text-gray-900'}`}
                    onClick={() => {
                      setSelectedDatasetId(null)
                      setIsDropdownOpen(false)
                    }}
                  >
                    <span className={`block truncate ${!selectedDatasetId ? 'font-semibold' : 'font-normal'}`}>-- Select a dataset --</span>
                  </div>
                  {datasets?.map((dataset) => (
                    <div
                      key={dataset.id}
                      className={`cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-primary-50 transition-colors ${selectedDatasetId === dataset.id ? 'text-primary-600 bg-primary-50' : 'text-gray-900'}`}
                      onClick={() => {
                        setSelectedDatasetId(dataset.id)
                        setIsDropdownOpen(false)
                      }}
                    >
                      <span className={`block truncate ${selectedDatasetId === dataset.id ? 'font-semibold' : 'font-normal'}`}>
                        {dataset.filename} ({dataset.row_count} rows)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {selectedDatasetId && (
        <div className="card">
          <div className="p-6">
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
          </div>
        </div>
      )}
    </div>
  )
}