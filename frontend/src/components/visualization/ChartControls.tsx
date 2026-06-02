import { Download, Settings } from 'lucide-react'
import type { ChartType, ChartConfig } from '../../services/visualizationService'

interface ChartControlsProps {
  config: ChartConfig
  onConfigChange: (config: Partial<ChartConfig>) => void
  onExport: (format: 'png' | 'json' | 'csv') => void
}

export function ChartControls({ config, onConfigChange, onExport }: ChartControlsProps) {
  const chartTypes: { value: ChartType; label: string }[] = [
    { value: 'line', label: 'Line Chart' },
    { value: 'bar', label: 'Bar Chart' },
    { value: 'scatter', label: 'Scatter Plot' },
    { value: 'area', label: 'Area Chart' },
    { value: 'pie', label: 'Pie Chart' },
  ]

  return (
    <div className="space-y-4">
      {/* Chart Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Settings className="w-4 h-4 inline mr-1" />
          Chart Type
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {chartTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => onConfigChange({ type: type.value })}
              className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                config.type === type.value
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-primary-500'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="chart-title" className="block text-sm font-medium text-gray-700 mb-1">
            Chart Title
          </label>
          <input
            id="chart-title"
            type="text"
            value={config.title}
            onChange={(e) => onConfigChange({ title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Enter chart title"
          />
        </div>

        <div>
          <label htmlFor="x-axis-label" className="block text-sm font-medium text-gray-700 mb-1">
            X-Axis Label
          </label>
          <input
            id="x-axis-label"
            type="text"
            value={config.xAxisLabel || ''}
            onChange={(e) => onConfigChange({ xAxisLabel: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Enter x-axis label"
          />
        </div>

        <div>
          <label htmlFor="y-axis-label" className="block text-sm font-medium text-gray-700 mb-1">
            Y-Axis Label
          </label>
          <input
            id="y-axis-label"
            type="text"
            value={config.yAxisLabel || ''}
            onChange={(e) => onConfigChange({ yAxisLabel: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Enter y-axis label"
          />
        </div>

        <div className="flex items-end gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.showLegend}
              onChange={(e) => onConfigChange({ showLegend: e.target.checked })}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Show Legend</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.showGrid}
              onChange={(e) => onConfigChange({ showGrid: e.target.checked })}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Show Grid</span>
          </label>
        </div>
      </div>

      {/* Export Options */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Download className="w-4 h-4 inline mr-1" />
          Export Chart
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onExport('png')}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            Export as PNG
          </button>
          <button
            onClick={() => onExport('json')}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            Export as JSON
          </button>
          <button
            onClick={() => onExport('csv')}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            Export as CSV
          </button>
        </div>
      </div>
    </div>
  )
}
