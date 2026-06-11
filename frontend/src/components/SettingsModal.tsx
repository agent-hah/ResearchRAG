import React, { useState } from 'react'
import { useSettings } from '../context/SettingsContext'

const DEFAULT_MODELS = {
  google: [
    { value: 'gemini-1.5-pro-latest', label: 'Gemini 1.5 Pro' },
    { value: 'gemini-1.5-flash-latest', label: 'Gemini 1.5 Flash' },
    { value: 'gemma-2-27b-it', label: 'Gemma 2 27B' }
  ],
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
  ],
  anthropic: [
    { value: 'claude-3-5-sonnet-20240620', label: 'Claude 3.5 Sonnet' },
    { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
    { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' }
  ]
};

const DEFAULT_EMBEDDING_MODELS = {
  google: [
    { value: 'models/text-embedding-004', label: 'Text Embedding 004' },
    { value: 'models/gemini-embedding-2', label: 'Gemini Embedding 2' }
  ],
  openai: [
    { value: 'text-embedding-3-small', label: 'Text Embedding 3 Small' },
    { value: 'text-embedding-3-large', label: 'Text Embedding 3 Large' },
    { value: 'text-embedding-ada-002', label: 'Ada 002' }
  ]
};

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings } = useSettings()
  const [formData, setFormData] = useState(settings)
  
  const [localModels, setLocalModels] = useState<string[]>([])
  const [isDetecting, setIsDetecting] = useState(false)
  
  if (!isOpen) return null

  const handleSave = () => {
    updateSettings(formData)
    onClose()
  }

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  const handleDetectModels = async (baseUrl: string) => {
    if (!baseUrl) {
      alert("Please provide a Base URL first.");
      return;
    }
    
    setIsDetecting(true)
    let foundModels: string[] = []
    
    try {
      // Attempt 1: LMStudio / OpenAI style format
      try {
        const response = await fetch(`${baseUrl}/models`)
        if (response.ok) {
          const data = await response.json()
          if (data && Array.isArray(data.data)) {
            foundModels = data.data.map((m: any) => m.id)
          }
        }
      } catch (e) {
        // Ignore and fallback to Ollama attempt
      }

      // Attempt 2: Ollama format
      if (foundModels.length === 0) {
        let ollamaUrl = baseUrl
        if (ollamaUrl.endsWith('/v1') || ollamaUrl.endsWith('/v1/')) {
          ollamaUrl = ollamaUrl.replace(/\/v1\/?$/, '')
        }
        const response = await fetch(`${ollamaUrl}/api/tags`)
        if (response.ok) {
          const data = await response.json()
          if (data && Array.isArray(data.models)) {
            foundModels = data.models.map((m: any) => m.name)
          }
        }
      }
      
      if (foundModels.length > 0) {
        setLocalModels(foundModels)
      } else {
        alert('Connected, but no models found. Make sure you have pulled models to your local server.')
      }
    } catch (e) {
      console.error(e)
      alert('Network error while detecting models. Please make sure the server is running and CORS is enabled, or type the name manually.')
    } finally {
      setIsDetecting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={handleOverlayClick}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden m-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800">AI Model Settings</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-8">
          {/* Query & Synthesis LLM */}
          <section>
            <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Query & Synthesis Model
            </h3>
            <p className="text-sm text-gray-500 mb-4">The model used for natural language queries and summarizing results.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                <select 
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  value={formData.provider}
                  onChange={(e) => setFormData({...formData, provider: e.target.value as any})}
                >
                  <option value="google">Google (Gemini)</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="custom">Local/Custom (Ollama, LMStudio)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Model Name</label>
                {formData.provider === 'custom' ? (
                  <div>
                    <input 
                      type="text" 
                      list="detected-models"
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      placeholder="e.g. llama3"
                      value={formData.modelName}
                      onChange={(e) => setFormData({...formData, modelName: e.target.value})}
                    />
                    <datalist id="detected-models">
                      {localModels.map(m => <option key={m} value={m} />)}
                    </datalist>
                  </div>
                ) : (
                  <select 
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    value={formData.modelName}
                    onChange={(e) => setFormData({...formData, modelName: e.target.value})}
                  >
                    <option value="" disabled>Select a model...</option>
                    {DEFAULT_MODELS[formData.provider as keyof typeof DEFAULT_MODELS]?.map(model => (
                      <option key={model.value} value={model.value}>{model.label}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">API Key {formData.provider === 'custom' && '(Optional)'}</label>
                <input 
                  type="password" 
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder="Enter API Key"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({...formData, apiKey: e.target.value})}
                />
              </div>

              {(formData.provider === 'custom' || formData.provider === 'openai') && (
                <div>
                  <div className="flex items-end justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">Base URL (Optional)</label>
                    {formData.provider === 'custom' && (
                      <button 
                        type="button"
                        onClick={() => handleDetectModels(formData.baseUrl)}
                        disabled={isDetecting || !formData.baseUrl}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-700 disabled:text-gray-400 bg-indigo-50 hover:bg-indigo-100 disabled:bg-gray-50 px-2 py-1 rounded"
                      >
                        {isDetecting ? 'Detecting...' : 'Detect Models'}
                      </button>
                    )}
                  </div>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    placeholder="e.g. http://localhost:11434/v1 for Ollama"
                    value={formData.baseUrl}
                    onChange={(e) => setFormData({...formData, baseUrl: e.target.value})}
                  />
                </div>
              )}
            </div>
          </section>

          {/* Embedding Model */}
          <section className="pt-6 border-t border-gray-100">
            <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Embedding Model
            </h3>
            <div className="p-3 mb-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-sm">
              <strong>Warning:</strong> Changing the embedding model will invalidate all existing documents. The vector database will be wiped and automatically re-indexed in the background.
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                <select 
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  value={formData.embeddingProvider}
                  onChange={(e) => setFormData({...formData, embeddingProvider: e.target.value as any})}
                >
                  <option value="google">Google (Gemini)</option>
                  <option value="openai">OpenAI</option>
                  <option value="custom">Local/Custom (Ollama, LMStudio)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Model Name</label>
                {formData.embeddingProvider === 'custom' ? (
                  <div>
                    <input 
                      type="text" 
                      list="detected-embed-models"
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      placeholder="e.g. nomic-embed-text"
                      value={formData.embeddingModelName}
                      onChange={(e) => setFormData({...formData, embeddingModelName: e.target.value})}
                    />
                    <datalist id="detected-embed-models">
                      {localModels.map(m => <option key={m} value={m} />)}
                    </datalist>
                  </div>
                ) : (
                  <select 
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    value={formData.embeddingModelName}
                    onChange={(e) => setFormData({...formData, embeddingModelName: e.target.value})}
                  >
                    <option value="" disabled>Select a model...</option>
                    {DEFAULT_EMBEDDING_MODELS[formData.embeddingProvider as keyof typeof DEFAULT_EMBEDDING_MODELS]?.map(model => (
                      <option key={model.value} value={model.value}>{model.label}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">API Key {formData.embeddingProvider === 'custom' && '(Optional)'}</label>
                <input 
                  type="password" 
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder="Enter API Key"
                  value={formData.embeddingApiKey}
                  onChange={(e) => setFormData({...formData, embeddingApiKey: e.target.value})}
                />
              </div>

              {(formData.embeddingProvider === 'custom' || formData.embeddingProvider === 'openai') && (
                <div>
                  <div className="flex items-end justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">Base URL (Optional)</label>
                    {formData.embeddingProvider === 'custom' && (
                      <button 
                        type="button"
                        onClick={() => handleDetectModels(formData.embeddingBaseUrl)}
                        disabled={isDetecting || !formData.embeddingBaseUrl}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-700 disabled:text-gray-400 bg-indigo-50 hover:bg-indigo-100 disabled:bg-gray-50 px-2 py-1 rounded"
                      >
                        {isDetecting ? 'Detecting...' : 'Detect Models'}
                      </button>
                    )}
                  </div>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    placeholder="e.g. http://localhost:11434/v1 for Ollama"
                    value={formData.embeddingBaseUrl}
                    onChange={(e) => setFormData({...formData, embeddingBaseUrl: e.target.value})}
                  />
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-5 py-2.5 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 font-medium transition-colors shadow-sm"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}
