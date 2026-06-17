import { Database, FileText, TrendingUp } from 'lucide-react'
import type { QueryResult } from '../../services/queryService'
import type { Dataset } from '@/types'

interface QueryResultsProps {
  result: QueryResult
  datasets?: Dataset[]
}

export function QueryResults({ result, datasets }: QueryResultsProps) {
  return (
    <div className="space-y-6">
      {/* Question */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">Question</h3>
        </div>
        <div className="card-content">
          <p className="text-gray-700">{result.question}</p>
        </div>
      </div>

      {/* AI Synthesis */}
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-900">AI Analysis</h3>
        </div>
        <div className="card-content">
          <div className="prose prose-sm max-w-none space-y-4">
            {/* Summary */}
            {result.synthesis?.summary && (
              <p className="text-gray-700">{result.synthesis.summary}</p>
            )}

            {/* Key Findings */}
            {result.synthesis?.key_findings?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-2">Key Findings</h4>
                <ul className="list-disc list-inside space-y-1">
                  {result.synthesis.key_findings.map((finding) => (
                    <li key={finding.substring(0, 50)} className="text-sm text-gray-700">{finding}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Data Insights */}
            {result.synthesis?.data_insights?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-2">Data Insights</h4>
                <ul className="list-disc list-inside space-y-1">
                  {result.synthesis.data_insights.map((insight) => (
                    <li key={insight.substring(0, 50)} className="text-sm text-gray-700">{insight}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Literature Insights */}
            {result.synthesis?.literature_insights?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-2">Literature Insights</h4>
                <ul className="list-disc list-inside space-y-1">
                  {result.synthesis.literature_insights.map((insight) => (
                    <li key={insight.substring(0, 50)} className="text-sm text-gray-700">{insight}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Methodology Notes */}
            {result.synthesis?.methodology_notes && (
              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-2">Methodology</h4>
                <p className="text-sm text-gray-600">{result.synthesis.methodology_notes}</p>
              </div>
            )}

            {/* Limitations */}
            {result.synthesis?.limitations && (
              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-2">Limitations</h4>
                <p className="text-sm text-gray-600">{result.synthesis.limitations}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Data Results */}
      {result.data_results && result.data_results.row_count > 0 && (
        <div className="card">
          <div className="card-header flex items-center gap-2">
            <Database className="w-5 h-5 text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Data Results ({result.data_results.row_count} rows)
            </h3>
          </div>
          <div className="card-content">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {result.data_results.columns.map((column) => {
                      const isDatasetId = column.toLowerCase().replace('_', ' ') === 'dataset id';
                      return (
                        <th
                          key={column}
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {isDatasetId ? 'DATASET' : column}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {result.data_results.rows.slice(0, 10).map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-gray-50">
                      {row.map((cell, cellIndex) => {
                        const columnName = result.data_results.columns[cellIndex];
                        const isDatasetId = columnName.toLowerCase().replace('_', ' ') === 'dataset id';
                        let displayValue = cell !== null && cell !== undefined ? String(cell) : '-';

                        if (isDatasetId && datasets && cell !== null && cell !== undefined) {
                          const datasetId = Number(cell);
                          const dataset = datasets.find(d => d.id === datasetId);
                          if (dataset) {
                            displayValue = dataset.name || dataset.filename || displayValue;
                          }
                        }

                        return (
                          <td key={cellIndex} className="px-4 py-3 text-sm text-gray-900">
                            {displayValue}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {result.data_results.row_count > 10 && (
              <p className="mt-3 text-sm text-gray-500 text-center">
                Showing first 10 of {result.data_results.row_count} rows
              </p>
            )}
          </div>
        </div>
      )}

      {/* Literature Context */}
      {result.literature_context && result.literature_context.length > 0 && (
        <div className="card">
          <div className="card-header flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Related Literature ({result.literature_context.length})
            </h3>
          </div>
          <div className="card-content space-y-4">
            {result.literature_context.map((lit, index) => (
              <div
                key={lit.title || index}
                className="p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <h4 className="font-medium text-gray-900">{lit.title}</h4>
                  <span className="px-2 py-1 text-xs font-medium bg-primary-100 text-primary-800 rounded-full whitespace-nowrap">
                    {Math.round(lit.relevance_score * 100)}% relevant
                  </span>
                </div>
                <p className="text-sm text-gray-600 italic">"{lit.excerpt}"</p>
              </div>
            ))}
          </div>
        </div>
      )}



      {/* Metadata */}
      <div className="text-sm text-gray-500 text-center">
        Query executed at {new Date(result.created_at).toLocaleString()}
      </div>
    </div>
  )
}
