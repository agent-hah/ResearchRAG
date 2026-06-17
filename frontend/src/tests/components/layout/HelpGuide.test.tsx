import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { HelpGuide } from '@/components/layout/HelpGuide'

describe('HelpGuide', () => {
  it('does not render when isOpen is false', () => {
    const { container } = render(
      <HelpGuide isOpen={false} onClose={vi.fn()} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders correctly when isOpen is true', () => {
    render(<HelpGuide isOpen={true} onClose={vi.fn()} />)
    
    // Check main heading
    expect(screen.getByText('User Guide')).toBeInTheDocument()
    expect(screen.getByText(/Welcome to the Research Workspace/i)).toBeInTheDocument()
    
    // Check all feature sections
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Files')).toBeInTheDocument()
    expect(screen.getByText('Literature')).toBeInTheDocument()
    expect(screen.getByText('Query')).toBeInTheDocument()
    expect(screen.getByText('Visualization')).toBeInTheDocument()
    expect(screen.getByText('Notes')).toBeInTheDocument()
    expect(screen.getByText('Suggestions')).toBeInTheDocument()
    expect(screen.getByText('Export')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    const onCloseMock = vi.fn()
    render(<HelpGuide isOpen={true} onClose={onCloseMock} />)
    
    const closeBtn = screen.getByRole('button', { name: /close help guide/i })
    fireEvent.click(closeBtn)
    
    expect(onCloseMock).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when background overlay is clicked', () => {
    const onCloseMock = vi.fn()
    const { container } = render(<HelpGuide isOpen={true} onClose={onCloseMock} />)
    
    // The overlay is the first div, with class fixed inset-0
    const overlay = container.querySelector('.fixed.inset-0')
    if (overlay) {
      fireEvent.click(overlay)
      expect(onCloseMock).toHaveBeenCalledTimes(1)
    } else {
      throw new Error('Overlay not found')
    }
  })
})
