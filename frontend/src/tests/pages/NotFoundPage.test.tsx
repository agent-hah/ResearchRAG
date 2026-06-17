import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { MemoryRouter } from 'react-router-dom'

vi.mock('lucide-react', () => ({
  Home: () => <div data-testid="icon-home" />,
  ArrowLeft: () => <div data-testid="icon-arrow-left" />,
}))

describe('NotFoundPage', () => {
  it('renders correctly', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    )
    expect(screen.getByText('404')).toBeInTheDocument()
    expect(screen.getByText('Page not found')).toBeInTheDocument()
    expect(screen.getByText('Go home')).toBeInTheDocument()
    expect(screen.getByText('Go back')).toBeInTheDocument()
  })

  it('calls history.back when go back is clicked', () => {
    const backSpy = vi.spyOn(window.history, 'back')
    
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    )
    
    fireEvent.click(screen.getByText('Go back'))
    expect(backSpy).toHaveBeenCalled()
    
    backSpy.mockRestore()
  })
})
