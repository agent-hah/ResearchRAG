import { useState, useRef, useEffect } from 'react'
import { Download, Settings, ChevronDown } from 'lucide-react'
import type { ChartType, ChartConfig } from '../../services/visualizationService'

interface ChartControlsProps {
  config: ChartConfig
  columns?: string[]
  onConfigChange: (config: Partial<ChartConfig>) => void
  onExport: (format: 'png' | 'json' | 'csv') => void
}

function CheckboxDropdown({ options = [], value = '', onChange, placeholder = 'Select...' }: { options: string[], value: string, onChange: (val: string) => void, placeholder?: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const selected = value ? value.split(', ').filter(Boolean) : []
  
  const toggleOption = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter(s => s !== opt).join(', '))
    } else {
      onChange([...selected, opt].join(', '))
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <div 
        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white cursor-pointer flex justify-between items-center"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate">{value || placeholder}</span>
        <ChevronDown className="w-4 h-4 text-gray-500" />
      </div>
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {options.map(opt => (
            <label key={opt} className="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm">
              <input 
                type="checkbox" 
                checked={selected.includes(opt)} 
                onChange={() => toggleOption(opt)}
                className="mr-2 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="truncate">{opt}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

export function ChartControls({ config, columns = [], onConfigChange, onExport }: ChartControlsProps) {
  const chartTypes: { value: ChartType; label: string }[] = [
    { value: 'line', label: 'Line Chart' },
    { value: 'bar', label: 'Bar Chart' },
    { value: 'scatter', label: 'Scatter Plot' },
    { value: 'area', label: 'Area Chart' },
    { value: 'pie', label: 'Pie Chart' },
    { value: 'heatmap', label: 'Heat Map' },
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
      <div className="space-y-6">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm">
          {/* X Axis Group */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900 border-b border-gray-300 pb-1">X-Axis Settings</h4>
            <div>
              <label htmlFor="x-axis-label" className="block text-xs font-medium text-gray-600 mb-1">
                Data Column
              </label>
              <CheckboxDropdown 
                options={columns}
                value={config.xAxisLabel || ''}
                onChange={(val) => onConfigChange({ xAxisLabel: val })}
                placeholder="Select columns"
              />
            </div>
            <div>
              <label htmlFor="x-axis-title" className="block text-xs font-medium text-gray-600 mb-1">
                Custom Axis Title
              </label>
              <input
                id="x-axis-title"
                type="text"
                value={config.xAxisTitle || ''}
                onChange={(e) => onConfigChange({ xAxisTitle: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 text-sm"
                placeholder="Default based on data"
              />
            </div>
          </div>

          {/* Y Axis Group */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900 border-b border-gray-300 pb-1">Y-Axis Settings</h4>
            <div>
              <label htmlFor="y-axis-label" className="block text-xs font-medium text-gray-600 mb-1">
                Data Column
              </label>
              <CheckboxDropdown 
                options={columns}
                value={config.yAxisLabel || ''}
                onChange={(val) => onConfigChange({ yAxisLabel: val })}
                placeholder="Select columns"
              />
            </div>
            <div>
              <label htmlFor="y-axis-title" className="block text-xs font-medium text-gray-600 mb-1">
                Custom Axis Title
              </label>
              <input
                id="y-axis-title"
                type="text"
                value={config.yAxisTitle || ''}
                onChange={(e) => onConfigChange({ yAxisTitle: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 text-sm"
                placeholder="Default based on data"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm">
          {/* Color Scheme */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900 border-b border-gray-300 pb-1">Color Scheme</h4>
            <div className="flex items-center gap-4 pt-1">
              {[
                { id: 'blue', gradient: 'linear-gradient(to bottom right, #bfdbfe 0%, #3b82f6 100%)', solid: '#3b82f6', name: 'Blue' },
                { id: 'red', gradient: 'linear-gradient(to bottom right, #fca5a5 0%, #ef4444 100%)', solid: '#ef4444', name: 'Red' },
                { id: 'viridis', gradient: 'linear-gradient(to bottom right, #440154 0%, #21918c 50%, #fde725 100%)', solid: '#21918c', name: 'Viridis' },
                { id: 'inferno', gradient: 'linear-gradient(to bottom right, #000004 0%, #bb3754 50%, #fcffa4 100%)', solid: '#bb3754', name: 'Inferno' },
                { id: 'black', gradient: 'linear-gradient(to bottom right, #4b5563 0%, #000000 100%)', solid: '#000000', name: 'Black' }
              ].map(scheme => (
                <label key={scheme.id} className="relative cursor-pointer flex items-center justify-center" title={scheme.name}>
                  <input
                    type="radio"
                    name="colorScheme"
                    value={scheme.id}
                    checked={(config.colorScheme || 'blue') === scheme.id}
                    onChange={(e) => onConfigChange({ colorScheme: e.target.value })}
                    className="sr-only"
                  />
                  <span 
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${(config.colorScheme || 'blue') === scheme.id ? 'border-gray-900 ring-2 ring-gray-900 ring-offset-2 scale-110' : 'border-transparent opacity-80 hover:opacity-100 hover:scale-105 shadow-sm'}`} 
                    style={{ background: config.type === 'heatmap' ? scheme.gradient : scheme.solid }}
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Heatmap Z-Axis */}
          {config.type === 'heatmap' && (
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900 border-b border-gray-300 pb-1">Z-Axis Data (Value)</h4>
              <div>
                <CheckboxDropdown 
                  options={columns}
                  value={config.zAxisLabel || ''}
                  onChange={(val) => onConfigChange({ zAxisLabel: val })}
                  placeholder="Select column"
                />
              </div>
            </div>
          )}
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

          {config.type === 'scatter' && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.showTrendline || false}
                onChange={(e) => onConfigChange({ showTrendline: e.target.checked })}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Show Trendline</span>
            </label>
          )}
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
