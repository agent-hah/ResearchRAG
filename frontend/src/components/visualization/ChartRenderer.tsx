import {
  LineChart, Line, BarChart, Bar, Scatter,
  AreaChart, Area, PieChart, Pie, Cell, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine
} from 'recharts'
import {
  getChartColors,
  type ChartData,
  type ChartConfig
} from '../../services/visualizationService'

import React from 'react'

interface ChartRendererProps {
  data: ChartData
  config: ChartConfig
}

const HeatmapRenderer = ({ data, config }: { data: ChartData, config: ChartConfig }) => {
  let min = Infinity;
  let max = -Infinity;
  data.datasets.forEach(ds => ds.data.forEach(v => {
    if (v < min) min = v;
    if (v > max) max = v;
  }));

  const getColor = (val: number) => {
    if (min === max) return `rgba(156, 163, 175, 0.5)`;
    const ratio = (val - min) / (max - min);

    if (config.colorScheme === 'red') {
      return `rgba(239, 68, 68, ${Math.max(0.1, ratio)})`;
    }
    if (config.colorScheme === 'viridis') {
      const r = Math.round(255 * Math.max(0, ratio - 0.5) * 2);
      const g = Math.round(255 * ratio);
      const b = Math.round(255 * Math.max(0, 1 - ratio * 1.5));
      return `rgb(${r}, ${g}, ${b})`;
    }
    if (config.colorScheme === 'inferno') {
      const r = Math.round(255 * ratio);
      const g = Math.round(255 * Math.max(0, ratio - 0.5) * 2);
      const b = Math.round(255 * Math.max(0, 0.5 - Math.abs(ratio - 0.5)) * 2);
      return `rgb(${r}, ${g}, ${b})`;
    }
    if (config.colorScheme === 'black') {
      return `rgba(0, 0, 0, ${Math.max(0.1, ratio)})`;
    }
    return `rgba(59, 130, 246, ${Math.max(0.1, ratio)})`;
  }

  const getGradientStyle = () => {
    if (config.colorScheme === 'viridis') return 'linear-gradient(to top, #440154, #21918c, #fde725)';
    if (config.colorScheme === 'inferno') return 'linear-gradient(to top, #000004, #bb3754, #fcffa4)';
    if (config.colorScheme === 'red') return 'linear-gradient(to top, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 1))';
    if (config.colorScheme === 'black') return 'linear-gradient(to top, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 1))';
    return 'linear-gradient(to top, rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 1))';
  }

  return (
    <div className="w-full h-full grid grid-cols-[auto_1fr_auto] grid-rows-[1fr_auto] pr-4 pb-4 bg-white">
      {/* Top Left: Y-axis Container */}
      <div className="flex flex-row items-center pr-2 min-h-0">
        {/* Y-axis Title */}
        <div className="text-gray-800 font-bold text-base -rotate-90 whitespace-nowrap tracking-wide h-full flex justify-center items-center w-8">
          {config.yAxisTitle || config.yAxisLabel || 'Y-Axis'}
        </div>
        {/* Y-axis labels */}
        <div className="flex flex-col justify-around py-1 h-full items-end w-20 sm:w-28 shrink-0 pr-2 border-r border-gray-300">
          {data.datasets.map(ds => (
            <div key={ds.label} className="text-xs font-medium text-gray-600 truncate w-full text-right" title={ds.label}>
              {ds.label}
            </div>
          ))}
        </div>
      </div>

      {/* Top Center: Heatmap grid */}
      <div className="flex flex-col min-h-0 relative group/grid">
        {/* Y-Axis Line */}
        <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-400 z-10" />
        {/* X-Axis Line */}
        <div className="absolute left-0 right-0 bottom-0 h-px bg-gray-400 z-10" />

        {data.datasets.map((ds) => (
          <div key={ds.label} className="flex-1 flex">
            {data.labels.map((label, colIdx) => {
              const val = ds.data[colIdx];
              return (
                <div
                  key={colIdx}
                  className="flex-1 border-[0.5px] border-white/50 group relative hover:z-20 transition-all hover:scale-[1.02] hover:shadow-md"
                  style={{ backgroundColor: getColor(val) }}
                >
                  {/* Tooltip */}
                  <div className="absolute opacity-0 group-hover:opacity-100 bg-gray-900 text-white text-xs rounded px-2 py-1 pointer-events-none whitespace-nowrap bottom-full left-1/2 -translate-x-1/2 mb-1 transition-opacity shadow-lg">
                    {label} - {ds.label}: {typeof val === 'number' && !Number.isInteger(val) ? val.toFixed(4) : val}
                    {/* Triangle for tooltip */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Top Right: Legend */}
      <div className="flex flex-col items-center justify-between py-1 ml-2 w-12 shrink-0 min-h-0">
        <span className="text-xs font-medium text-gray-500" title="Max Value">{max !== -Infinity ? max.toFixed(2) : ''}</span>
        <div
          className="flex-1 w-4 my-2 rounded-sm shadow-sm border border-gray-200"
          style={{ background: getGradientStyle() }}
        />
        <span className="text-xs font-medium text-gray-500" title="Min Value">{min !== Infinity ? min.toFixed(2) : ''}</span>
      </div>

      {/* Bottom Left: Spacer */}
      <div />

      {/* Bottom Center: X-axis */}
      <div className="flex flex-col min-w-0">
        {/* X-axis labels */}
        <div className="flex pt-2 overflow-hidden h-24">
          {data.labels.map((label, colIdx) => {
            const step = Math.max(1, Math.floor(data.labels.length / 30));
            const showLabel = colIdx % step === 0;
            return (
              <div key={colIdx} className="flex-1 flex justify-center w-0">
                 {showLabel && (
                   <div 
                      className="text-xs font-medium text-gray-600 truncate -rotate-45 origin-top-left" 
                      style={{ width: 'max-content', transform: 'translateX(50%) rotate(-45deg)' }} 
                      title={String(label)}
                   >
                     {label}
                   </div>
                 )}
              </div>
            );
          })}
        </div>

        {/* X-axis Title */}
        <div className="text-center text-gray-800 font-bold text-base mt-2 tracking-wide">
          {config.xAxisTitle || config.xAxisLabel || 'X-Axis'}
        </div>
      </div>

      {/* Bottom Right: Spacer */}
      <div />
    </div>
  )
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

  const isXNumeric = chartData.length > 0 && typeof chartData[0].name === 'number'
  const xAxisType = isXNumeric ? 'number' : 'category'
  const isLargeData = chartData.length * data.datasets.length > 1000

  // Reduced left margin to center chart and balance with right margin.
  // Top margin reduced to close gap between title and chart.
  // Bottom margin increased to accommodate diagonal labels.
  const commonProps = {
    margin: { top: 10, right: 40, left: 30, bottom: 80 }
  }

  // Common label styles
  const axisLabelStyle: any = { fill: '#333', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' };
  const pieColors = getChartColors(config.colorScheme);

  const getTrendlineData = (datasetLabel: string) => {
    if (xAxisType !== 'number') return null;
    const validPoints = chartData.filter(d => typeof d.name === 'number' && typeof d[datasetLabel] === 'number');
    if (validPoints.length < 2) return null;

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    const n = validPoints.length;
    validPoints.forEach(p => {
      sumX += p.name;
      sumY += p[datasetLabel];
      sumXY += p.name * p[datasetLabel];
      sumX2 += p.name * p.name;
    });

    const denominator = n * sumX2 - sumX * sumX;
    if (denominator === 0) return null;
    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;

    const minX = Math.min(...validPoints.map(p => p.name));
    const maxX = Math.max(...validPoints.map(p => p.name));

    return {
      x1: minX,
      y1: slope * minX + intercept,
      x2: maxX,
      y2: slope * maxX + intercept
    };
  };

  const renderChart = () => {
    switch (config.type) {
      case 'line':
        return (
          <LineChart data={chartData} {...commonProps}>
            {config.showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis
              dataKey="name"
              label={{ value: config.xAxisTitle || config.xAxisLabel, position: 'insideBottom', offset: -60, style: axisLabelStyle }}
              minTickGap={30}
              tick={{ fill: '#888', angle: -45, textAnchor: 'end', dy: 10 }}
            />
            <YAxis
              label={{ value: config.yAxisTitle || config.yAxisLabel, angle: -90, position: 'insideLeft', offset: -25, style: axisLabelStyle }}
              tick={{ fill: '#888' }}
            />
            <Tooltip />
            {config.showLegend && <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: 20 }} />}
            {data.datasets.map((dataset, idx) => (
              <Line
                key={idx}
                type="monotone"
                dataKey={dataset.label}
                stroke={dataset.color}
                strokeWidth={2}
                dot={!isLargeData ? { r: 4 } : false}
                activeDot={{ r: 6 }}
                isAnimationActive={!isLargeData}
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
              label={{ value: config.xAxisTitle || config.xAxisLabel, position: 'insideBottom', offset: -60, style: axisLabelStyle }}
              minTickGap={30}
              tick={{ fill: '#888', angle: -45, textAnchor: 'end', dy: 10 }}
            />
            <YAxis
              label={{ value: config.yAxisTitle || config.yAxisLabel, angle: -90, position: 'insideLeft', offset: -25, style: axisLabelStyle }}
              tick={{ fill: '#888' }}
            />
            <Tooltip />
            {config.showLegend && <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: 20 }} />}
            {data.datasets.map((dataset, idx) => (
              <Bar
                key={idx}
                dataKey={dataset.label}
                fill={dataset.color}
                isAnimationActive={!isLargeData}
              />
            ))}
          </BarChart>
        )

      case 'scatter':
        return (
          <ComposedChart data={chartData} {...commonProps}>
            {config.showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis
              type={xAxisType}
              dataKey="name"
              name={config.xAxisLabel}
              label={{ value: config.xAxisTitle || config.xAxisLabel, position: 'insideBottom', offset: -60, style: axisLabelStyle }}
              minTickGap={30}
              allowDuplicatedCategory={false}
              tick={{ fill: '#888', angle: -45, textAnchor: 'end', dy: 10 }}
            />
            <YAxis
              type="number"
              dataKey={data.datasets[0]?.label}
              name={config.yAxisLabel}
              label={{ value: config.yAxisTitle || config.yAxisLabel, angle: -90, position: 'insideLeft', offset: -25, style: axisLabelStyle }}
              tick={{ fill: '#888' }}
            />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            {config.showLegend && <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: 20 }} />}
            {data.datasets.map((dataset, idx) => {
              const trend = config.showTrendline ? getTrendlineData(dataset.label) : null;
              return (
                <React.Fragment key={idx}>
                  <Scatter
                    name={dataset.label}
                    dataKey={dataset.label}
                    fill={dataset.color}
                    isAnimationActive={!isLargeData}
                  />
                  {trend && (
                    <ReferenceLine
                      segment={[{ x: trend.x1, y: trend.y1 }, { x: trend.x2, y: trend.y2 }]}
                      stroke={dataset.color}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                    />
                  )}
                </React.Fragment>
              )
            })}
          </ComposedChart>
        )

      case 'area':
        return (
          <AreaChart data={chartData} {...commonProps}>
            {config.showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis
              dataKey="name"
              label={{ value: config.xAxisTitle || config.xAxisLabel, position: 'insideBottom', offset: -60, style: axisLabelStyle }}
              minTickGap={30}
              tick={{ fill: '#888', angle: -45, textAnchor: 'end', dy: 10 }}
            />
            <YAxis
              label={{ value: config.yAxisTitle || config.yAxisLabel, angle: -90, position: 'insideLeft', offset: -25, style: axisLabelStyle }}
              tick={{ fill: '#888' }}
            />
            <Tooltip />
            {config.showLegend && <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: 20 }} />}
            {data.datasets.map((dataset, idx) => (
              <Area
                key={idx}
                type="monotone"
                dataKey={dataset.label}
                stroke={dataset.color}
                fill={dataset.color}
                fillOpacity={0.6}
                isAnimationActive={!isLargeData}
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
              isAnimationActive={!isLargeData}
            >
              {pieData.map((_, idx) => (
                <Cell key={`cell-${idx}`} fill={pieColors[idx % pieColors.length]} />
              ))}
            </Pie>
            <Tooltip />
            {config.showLegend && <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: 20 }} />}
          </PieChart>
        )

      case 'heatmap':
        return <HeatmapRenderer data={data} config={config} />

      default:
        return <div>Unsupported chart type</div>
    }
  }

  return (
    <div className="w-full h-full flex flex-col min-h-[500px]">
      {config.title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-1 mt-1 text-center shrink-0">
          {config.title}
        </h3>
      )}
      <div className="flex-1 w-full relative min-h-[500px]">
        {config.type === 'heatmap' ? (
          <div className="absolute inset-0">
            {renderChart()}
          </div>
        ) : (
          <div className="absolute inset-0">
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
