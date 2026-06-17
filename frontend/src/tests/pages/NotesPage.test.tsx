import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NotesPage } from '@/pages/NotesPage'

vi.mock('@/components/notes/NotesPanel', () => ({
  NotesPanel: () => <div data-testid="notes-panel" />,
}))

vi.mock('@/components/notes/NotesCanvas', () => ({
  NotesCanvas: () => <div data-testid="notes-canvas" />,
}))

vi.mock('lucide-react', () => ({
  List: () => <div data-testid="icon-list" />,
  Grid3x3: () => <div data-testid="icon-grid" />,
}))

describe('NotesPage', () => {
  it('renders correctly with list view by default', () => {
    render(<NotesPage />)
    expect(screen.getByText('Notes')).toBeInTheDocument()
    expect(screen.getByText('Capture insights, annotate findings, and organize your research')).toBeInTheDocument()
    expect(screen.getByTestId('notes-panel')).toBeInTheDocument()
    expect(screen.queryByTestId('notes-canvas')).not.toBeInTheDocument()
  })

  it('switches between list and canvas views', () => {
    render(<NotesPage />)
    
    // Switch to canvas view
    fireEvent.click(screen.getByText('Canvas'))
    expect(screen.queryByTestId('notes-panel')).not.toBeInTheDocument()
    expect(screen.getByTestId('notes-canvas')).toBeInTheDocument()

    // Switch back to list view
    fireEvent.click(screen.getByText('List'))
    expect(screen.getByTestId('notes-panel')).toBeInTheDocument()
    expect(screen.queryByTestId('notes-canvas')).not.toBeInTheDocument()
  })
})
