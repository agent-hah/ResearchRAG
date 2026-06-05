export type ChartType = 'line' | 'bar' | 'scatter' | 'area' | 'pie' | 'heatmap'

export interface ChartData {
  labels: (string | number)[]
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
  zAxisLabel?: string
  xAxisTitle?: string
  yAxisTitle?: string
  colorScheme?: string
  showLegend?: boolean
  showGrid?: boolean
  showTrendline?: boolean
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
  config: ChartConfig
): ChartData {
  if (columns.length < 2 || rows.length === 0) {
    return { labels: [], datasets: [] }
  }

  // Determine x-axis index
  const xColName = config.xAxisLabel || columns[0]
  const xIndex = columns.indexOf(xColName) !== -1 ? columns.indexOf(xColName) : 0
  
  // Determine y-axis indices
  let yIndices: number[] = []
  if (config.yAxisLabel) {
    const selectedYCols = config.yAxisLabel.split(', ').filter(Boolean)
    yIndices = selectedYCols.map(col => columns.indexOf(col)).filter(i => i !== -1)
  }
  
  const chartType = config.type

  // Heatmap Z-Axis Pivot Logic
  if (chartType === 'heatmap' && config.zAxisLabel) {
    const yColName = config.yAxisLabel?.split(', ')[0] || columns[1] || columns[0]
    const yCol = columns.indexOf(yColName) !== -1 ? columns.indexOf(yColName) : 1
    const zCol = columns.indexOf(config.zAxisLabel) !== -1 ? columns.indexOf(config.zAxisLabel) : 2

    // Get unique sorted X and Y values
    const uniqueX = Array.from(new Set(rows.map(r => r[xIndex])))
    const uniqueY = Array.from(new Set(rows.map(r => r[yCol])))
    
    const sortFn = (a: any, b: any) => {
      const isANum = typeof a === 'number' || (typeof a === 'string' && !isNaN(Number(a)))
      const isBNum = typeof b === 'number' || (typeof b === 'string' && !isNaN(Number(b)))
      if (isANum && isBNum) return Number(a) - Number(b)
      return String(a).localeCompare(String(b))
    }
    
    uniqueX.sort(sortFn)
    uniqueY.sort(sortFn)

    // O(N) Aggregation using a Map
    const aggMap = new Map<string, { sum: number, count: number }>();
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const key = `${r[xIndex]}|${r[yCol]}`;
      const val = Number(r[zCol]) || 0;
      const existing = aggMap.get(key);
      if (existing) {
        existing.sum += val;
        existing.count++;
      } else {
        aggMap.set(key, { sum: val, count: 1 });
      }
    }

    const datasets = uniqueY.map(y => {
      const dataForY = uniqueX.map(x => {
        const key = `${x}|${y}`;
        const agg = aggMap.get(key);
        if (!agg) return 0;
        return agg.sum / agg.count;
      });
      
      return {
        label: String(y),
        data: dataForY,
        color: '#3b82f6'
      }
    })

    return { labels: uniqueX.map(String), datasets }
  }
  
  if (yIndices.length === 0) {
    // Default: find numeric columns to auto-select, max 10
    const numericIndices = columns.map((_, i) => i).filter(i => {
      if (i === xIndex) return false;
      const firstVal = rows.find(r => r[i] !== null && r[i] !== undefined)?.[i];
      return typeof firstVal === 'number' || (typeof firstVal === 'string' && !isNaN(Number(firstVal)));
    });
    
    if (numericIndices.length > 0) {
      yIndices = numericIndices.slice(0, 10);
    } else {
      yIndices = columns.map((_, i) => i).filter(i => i !== xIndex).slice(0, 5);
    }
  }

  // Determine if x-axis is numeric based on first non-null/undefined value
  const firstXValue = rows.find(row => row[xIndex] !== null && row[xIndex] !== undefined)?.[xIndex]
  const isXNumeric = typeof firstXValue === 'number' || (typeof firstXValue === 'string' && !isNaN(Number(firstXValue)))

  // Sample data to a maximum of 1000 points for non-heatmap charts to prevent UI freezing
  const MAX_POINTS = 1000;
  let sampledRows = rows;
  if (rows.length > MAX_POINTS) {
    const step = Math.ceil(rows.length / MAX_POINTS);
    sampledRows = rows.filter((_, i) => i % step === 0);
  }

  // Sort rows alphabetically by X-axis if it's a string variable
  const processingRows = isXNumeric ? sampledRows : [...sampledRows].sort((a, b) => {
    const valA = String(a[xIndex] || '');
    const valB = String(b[xIndex] || '');
    return valA.localeCompare(valB);
  });



  // For pie charts, use first selected y column or first numeric column
  const colors = getChartColors(config.colorScheme)
  if (chartType === 'pie') {
    const yIdx = yIndices[0] || 1
    return {
      labels: processingRows.map(row => String(row[xIndex])),
      datasets: [{
        label: columns[yIdx] || 'Value',
        data: processingRows.map(row => Number(row[yIdx]) || 0),
        color: colors[0]
      }]
    }
  }
  
  // For other charts, xIndex is x-axis (labels)
  const labels = processingRows.map(row => {
    if (chartType === 'scatter' && isXNumeric) {
      return Number(row[xIndex])
    }
    return String(row[xIndex])
  })
  
  // Remaining columns are datasets
  const datasets = yIndices.map((idx, i) => ({
    label: columns[idx],
    data: processingRows.map(row => Number(row[idx]) || 0),
    color: colors[i % colors.length]
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
    zAxisLabel: columns.length > 2 ? columns[2] : undefined,
    colorScheme: 'blue',
    showLegend: true,
    showGrid: true,
    showTrendline: false
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

export function getChartColors(scheme?: string): string[] {
  switch (scheme) {
    case 'red':
      return ['#ef4444', '#f87171', '#fca5a5', '#dc2626', '#991b1b', '#7f1d1d'];
    case 'viridis':
      return ['#22a884', '#2a788e', '#414487', '#440154', '#7ad151', '#fde725'];
    case 'inferno':
      return ['#dd513a', '#932667', '#420a68', '#000004', '#fca50a', '#fcffa4'];
    case 'black':
      return ['#000000', '#1f2937', '#374151', '#4b5563', '#6b7280', '#9ca3af'];
    case 'blue':
    default:
      return [
        '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
        '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'
      ];
  }
}
