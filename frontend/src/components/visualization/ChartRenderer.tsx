import {
  LineChart, Line, BarChart, Bar, ScatterChart, Scatter,
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts'
import type { ChartData, ChartConfig } from '../../services/visualizationService'

interface ChartRendererProps {
  data: ChartData
  config: ChartConfig
}

export function ChartRenderer({ data, config }: ChartRendererProps) {
  // Transform data for Recharts format
  const chartData = data.labels.map((label, idx) => {
    const point: any = { name: label }
    data.datasets.forEach(dataset => {
      point[dataset.label] = dataset.data[idx]
    })
    return point
  })

  // Pie chart data format
  const pieData = data.datasets[0]?.data.map((value, idx) => ({
    name: data.labels[idx],
    value: value
  })) || []

  const commonProps = {
    margin: { top: 20, right: 30, left: 20, bottom: 20 }
  }

  const renderChart = () => {
    switch (config.type) {
      case 'line':
        return (
          <LineChart data={chartData} {...commonProps}>
            {config.showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis 
              dataKey="name" 
              label={{ value: config.xAxisLabel, position: 'insideBottom', offset: -10 }}
            />
            <YAxis 
              label={{ value: config.yAxisLabel, angle: -90, position: 'insideLeft' }}
            />
            <Tooltip />
            {config.showLegend && <Legend />}
            {data.datasets.map((dataset, idx) => (
              <Line
                key={idx}
                type="monotone"
                dataKey={dataset.label}
                stroke={dataset.color}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        )

      case 'bar':
        return (
          <BarChart data={chartData} {...commonProps}>
            {config.showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis 
              dataKey="name"
              label={{ value: config.xAxisLabel, position: 'insideBottom', offset: -10 }}
            />
            <YAxis 
              label={{ value: config.yAxisLabel, angle: -90, position: 'insideLeft' }}
            />
            <Tooltip />
            {config.showLegend && <Legend />}
            {data.datasets.map((dataset, idx) => (
              <Bar
                key={idx}
                dataKey={dataset.label}
                fill={dataset.color}
              />
            ))}
          </BarChart>
        )

      case 'scatter':
        return (
          <ScatterChart {...commonProps}>
            {config.showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis 
              type="number"
              dataKey={data.datasets[0]?.label}
              name={config.xAxisLabel}
              label={{ value: config.xAxisLabel, position: 'insideBottom', offset: -10 }}
            />
            <YAxis 
              type="number"
              dataKey={data.datasets[1]?.label}
              name={config.yAxisLabel}
              label={{ value: config.yAxisLabel, angle: -90, position: 'insideLeft' }}
            />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            {config.showLegend && <Legend />}
            <Scatter
              name="Data Points"
              data={chartData}
              fill="#3b82f6"
            />
          </ScatterChart>
        )

      case 'area':
        return (
          <AreaChart data={chartData} {...commonProps}>
            {config.showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis 
              dataKey="name"
              label={{ value: config.xAxisLabel, position: 'insideBottom', offset: -10 }}
            />
            <YAxis 
              label={{ value: config.yAxisLabel, angle: -90, position: 'insideLeft' }}
            />
            <Tooltip />
            {config.showLegend && <Legend />}
            {data.datasets.map((dataset, idx) => (
              <Area
                key={idx}
                type="monotone"
                dataKey={dataset.label}
                stroke={dataset.color}
                fill={dataset.color}
                fillOpacity={0.6}
              />
            ))}
          </AreaChart>
        )

      case 'pie':
        return (
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => percent !== undefined ? `${name}: ${(percent * 100).toFixed(0)}%` : name}
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
            >
              {pieData.map((_, idx) => (
                <Cell key={`cell-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            {config.showLegend && <Legend />}
          </PieChart>
        )

      default:
        return <div>Unsupported chart type</div>
    }
  }

  return (
    <div className="w-full">
      {config.title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
          {config.title}
        </h3>
      )}
      <ResponsiveContainer width="100%" height={400}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  )
}

const PIE_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'
]
