import React, { createContext, useContext, useState, useEffect } from 'react'

export interface LLMSettings {
  provider: 'google' | 'openai' | 'anthropic' | 'custom'
  apiKey: string
  modelName: string
  baseUrl: string
  embeddingProvider: 'google' | 'openai' | 'custom'
  embeddingApiKey: string
  embeddingModelName: string
  embeddingBaseUrl: string
}

const defaultSettings: LLMSettings = {
  provider: 'google',
  apiKey: '',
  modelName: 'gemma-4-26b-a4b-it',
  baseUrl: '',
  embeddingProvider: 'google',
  embeddingApiKey: '',
  embeddingModelName: 'models/gemini-embedding-2',
  embeddingBaseUrl: ''
}

interface SettingsContextType {
  settings: LLMSettings
  updateSettings: (newSettings: Partial<LLMSettings>) => void
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<LLMSettings>(() => {
    const stored = localStorage.getItem('llmSettings')
    if (stored) {
      try {
        return { ...defaultSettings, ...JSON.parse(stored) }
      } catch (e) {
        console.error('Failed to parse stored settings', e)
      }
    }
    return defaultSettings
  })

  useEffect(() => {
    localStorage.setItem('llmSettings', JSON.stringify(settings))
  }, [settings])

  const updateSettings = (newSettings: Partial<LLMSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }))
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}
