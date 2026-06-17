import { useState, useRef } from 'react'
import { ChartRenderer } from './ChartRenderer'
import { ChartControls } from './ChartControls'
import { RefinementPanel } from './RefinementPanel'
import { BarChart3, X, Sparkles, Maximize2, Minimize2 } from 'lucide-react'
import {
  detectChartType,
  transformToChartData,
  generateChartConfig,
  exportChartJSON,
  exportChartCSV,
  type ChartConfig
} from '../../services/visualizationService'
import { toPng } from 'html-to-image'
interface VisualizationPanelProps {
  columns: string[]
  rows: any[][]
  question?: string
  onClose?: () => void
}

export function VisualizationPanel({ columns, rows, question, onClose }: VisualizationPanelProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  const [showRefinement, setShowRefinement] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  
  // Auto-detect chart type and generate initial config
  const initialChartType = detectChartType(columns, rows, rows.length)
  const [config, setConfig] = useState<ChartConfig>(
    generateChartConfig(columns, initialChartType, question)
  )
  
  // Transform data based on current chart config
  const chartData = transformToChartData(columns, rows, config)

  const handleConfigChange = (updates: Partial<ChartConfig> | ChartConfig) => {
    // Check if it's a complete config or just updates
    if ('type' in updates && 'title' in updates && 'showLegend' in updates) {
      // Complete config from refinement
      setConfig(updates as ChartConfig)
    } else {
      // Partial updates from manual controls
      setConfig(prev => {
        const newConfig = { ...prev, ...updates }
        
        // If chart type changed, regenerate data
        if (updates.type && updates.type !== prev.type) {
          // Data will be regenerated on next render
        }
        
        return newConfig
      })
    }
  }

  const handleExport = async (format: 'png' | 'json' | 'csv') => {
    try {
      switch (format) {
        case 'png':
          await exportAsPNG()
          break
        case 'json':
          exportAsJSON()
          break
        case 'csv':
          exportAsCSV()
          break
      }
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export chart. Please try again.')
    }
  }

  const getExportFilename = (extension: string) => {
    const baseName = config.title 
      ? config.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() 
      : 'chart'
    return `${baseName}.${extension}`
  }

  const exportAsPNG = async () => {
    if (!chartRef.current) return

    const dataUrl = await toPng(chartRef.current, {
      backgroundColor: '#ffffff',
      pixelRatio: 2
    })

    const link = document.createElement('a')
    link.download = getExportFilename('png')
    link.href = dataUrl
    link.click()
  }

  const exportAsJSON = () => {
    const json = exportChartJSON(chartData, config)
    const blob = new Blob([json], { type: 'application/json' })
    const link = document.createElement('a')
    link.download = getExportFilename('json')
    link.href = URL.createObjectURL(blob)
    link.click()
  }

  const exportAsCSV = () => {
    const csv = exportChartCSV(chartData)
    const blob = new Blob([csv], { type: 'text/csv' })
    const link = document.createElement('a')
    link.download = getExportFilename('csv')
    link.href = URL.createObjectURL(blob)
    link.click()
  }

  if (columns.length < 2 || rows.length === 0) {
    return (
      <div className="card border-amber-200 bg-amber-50">
        <div className="card-content">
          <div className="flex items-start gap-3">
            <BarChart3 className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-amber-800">
                Insufficient Data for Visualization
              </h3>
              <p className="text-sm text-amber-700 mt-1">
                At least 2 columns and 1 row of data are required to generate a chart.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={isFullscreen ? "fixed inset-0 z-50 bg-gray-100 p-6 overflow-auto space-y-6" : "space-y-6"}>
      {/* Chart Display */}
      <div className={isFullscreen ? "card shadow-2xl h-full flex flex-col" : "card"}>
        <div className="card-header flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-900">Visualization</h3>
            <button type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1 ml-1 text-gray-400 hover:text-gray-600 rounded-md transition-colors"
              title={isFullscreen ? "Exit full screen" : "Full screen"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex items-center gap-2">
            {onClose && (
              <button type="button"
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-md"
                title="Close visualization"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
        <div className={isFullscreen ? "card-content flex-grow flex flex-col min-h-0 pt-2" : "card-content pt-2"}>
          <div ref={chartRef} className={isFullscreen ? "bg-white p-2 rounded-lg flex-grow overflow-auto" : "bg-white p-2 rounded-lg"}>
            <ChartRenderer data={chartData} config={config} />
          </div>
        </div>
      </div>

      {/* Chart Controls */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Customize Chart</h3>
            <p className="text-sm text-gray-500 mt-1">
              Adjust chart type, labels, and export options
            </p>
          </div>
          <button type="button"
            onClick={() => setShowRefinement(!showRefinement)}
            className={`px-4 py-2 text-sm rounded-md border transition-colors flex items-center gap-2 ${
              showRefinement
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white text-gray-700 border-gray-300 hover:border-primary-500'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            {showRefinement ? 'Manual Controls' : 'AI Refinement'}
          </button>
        </div>
        <div className="card-content">
          {showRefinement ? (
            <RefinementPanel
              config={config}
              onConfigChange={handleConfigChange}
            />
          ) : (
            <ChartControls
              config={config}
              columns={columns}
              onConfigChange={handleConfigChange}
              onExport={handleExport}
            />
          )}
        </div>
      </div>

      {/* Data Summary */}
      <div className="text-sm text-gray-500 text-center">
        Visualizing {rows.length} rows × {columns.length} columns
      </div>
    </div>
  )
}
