import { Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { HomePage } from '@/pages/HomePage'
import { FilesPage } from '@/pages/FilesPage'
import { LiteraturePage } from '@/pages/LiteraturePage'
import { QueryPage } from '@/pages/QueryPage'
import { VisualizationPage } from '@/pages/VisualizationPage'
import { NotesPage } from '@/pages/NotesPage'
import { SuggestionsPage } from '@/pages/SuggestionsPage'
import { ExportPage } from '@/pages/ExportPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/files" element={<FilesPage />} />
        <Route path="/literature" element={<LiteraturePage />} />
        <Route path="/query" element={<QueryPage />} />
        <Route path="/visualization" element={<VisualizationPage />} />
        <Route path="/notes" element={<NotesPage />} />
        <Route path="/suggestions" element={<SuggestionsPage />} />
        <Route path="/export" element={<ExportPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Layout>
  )
}

export default App