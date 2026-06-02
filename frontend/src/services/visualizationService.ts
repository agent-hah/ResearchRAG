export type ChartType = 'line' | 'bar' | 'scatter' | 'area' | 'pie'

export interface ChartData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    color?: string
  }[]
}

export interface ChartConfig {
  type: ChartType
  title: string
  xAxisLabel?: string
  yAxisLabel?: string
  showLegend?: boolean
  showGrid?: boolean
}

/**
 * Auto-detect the best chart type based on data characteristics
 */
export function detectChartType(
  columns: string[],
  rows: any[][],
  rowCount: number
): ChartType {
  if (columns.length < 2 || rows.length === 0) {
    return 'bar'
  }

  // Check if first column is categorical (strings/dates)
  const firstColumnValues = rows.map(row => row[0])
  const hasCategories = firstColumnValues.some(val => 
    typeof val === 'string' || val instanceof Date
  )

  // Check if we have numeric data
  const numericColumns = columns.slice(1).filter((_, idx) => {
    return rows.every(row => typeof row[idx + 1] === 'number')
  })

  if (numericColumns.length === 0) {
    return 'bar'
  }

  // Time series detection (dates in first column)
  const hasTimeSeries = firstColumnValues.some(val => {
    if (typeof val === 'string') {
      return !isNaN(Date.parse(val))
    }
    return val instanceof Date
  })

  if (hasTimeSeries) {
    return 'line'
  }

  // Scatter plot for two numeric columns
  if (numericColumns.length >= 2 && !hasCategories) {
    return 'scatter'
  }

  // Pie chart for small categorical data with single numeric column
  if (hasCategories && numericColumns.length === 1 && rowCount <= 10) {
    return 'pie'
  }

  // Default to bar chart for categorical data
  if (hasCategories) {
    return 'bar'
  }

  // Area chart for continuous data
  return 'area'
}

/**
 * Transform query results into chart data format
 */
export function transformToChartData(
  columns: string[],
  rows: any[][],
  chartType: ChartType
): ChartData {
  if (columns.length < 2 || rows.length === 0) {
    return { labels: [], datasets: [] }
  }

  // For pie charts, use first column as labels and second as values
  if (chartType === 'pie') {
    return {
      labels: rows.map(row => String(row[0])),
      datasets: [{
        label: columns[1] || 'Value',
        data: rows.map(row => Number(row[1]) || 0),
        color: '#3b82f6'
      }]
    }
  }

  // For other charts, first column is x-axis (labels)
  const labels = rows.map(row => String(row[0]))
  
  // Remaining columns are datasets
  const datasets = columns.slice(1).map((column, idx) => ({
    label: column,
    data: rows.map(row => Number(row[idx + 1]) || 0),
    color: CHART_COLORS[idx % CHART_COLORS.length]
  }))

  return { labels, datasets }
}

/**
 * Generate default chart configuration
 */
export function generateChartConfig(
  columns: string[],
  chartType: ChartType,
  question?: string
): ChartConfig {
  return {
    type: chartType,
    title: question || 'Data Visualization',
    xAxisLabel: columns[0] || 'X Axis',
    yAxisLabel: columns[1] || 'Y Axis',
    showLegend: true,
    showGrid: true
  }
}

/**
 * Export chart data as JSON
 */
export function exportChartJSON(
  data: ChartData,
  config: ChartConfig
): string {
  return JSON.stringify({ data, config }, null, 2)
}

/**
 * Export chart data as CSV
 */
export function exportChartCSV(data: ChartData): string {
  const headers = ['Label', ...data.datasets.map(d => d.label)]
  const rows = data.labels.map((label, idx) => {
    return [label, ...data.datasets.map(d => d.data[idx])]
  })
  
  return [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')
}

// Color palette for multiple datasets
const CHART_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
]
