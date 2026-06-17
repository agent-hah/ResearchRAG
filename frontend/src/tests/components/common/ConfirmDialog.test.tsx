import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'

describe('ConfirmDialog', () => {
  it('does not render when isOpen is false', () => {
    render(
      <ConfirmDialog
        isOpen={false}
        title="Test Title"
        message="Test Message"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    const dialog = screen.getByRole('dialog', { hidden: true });
    expect(dialog).not.toHaveAttribute('open');
  })

  it('renders correctly when isOpen is true', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Delete Item"
        message="Are you sure you want to delete this item?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.getByText('Delete Item')).toBeInTheDocument()
    expect(screen.getByText('Are you sure you want to delete this item?')).toBeInTheDocument()
    expect(screen.getByText('Confirm')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('calls onConfirm when confirm button is clicked', () => {
    const onConfirmMock = vi.fn()
    render(
      <ConfirmDialog
        isOpen={true}
        title="Test"
        message="Message"
        onConfirm={onConfirmMock}
        onCancel={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText('Confirm'))
    expect(onConfirmMock).toHaveBeenCalledTimes(1)
  })

  it('calls onCancel when cancel button is clicked', () => {
    const onCancelMock = vi.fn()
    render(
      <ConfirmDialog
        isOpen={true}
        title="Test"
        message="Message"
        onConfirm={vi.fn()}
        onCancel={onCancelMock}
      />
    )
    fireEvent.click(screen.getByText('Cancel'))
    expect(onCancelMock).toHaveBeenCalledTimes(1)
  })

  it('calls onCancel when background overlay is clicked', () => {
    const onCancelMock = vi.fn()
    render(
      <ConfirmDialog
        isOpen={true}
        title="Test"
        message="Message"
        onConfirm={vi.fn()}
        onCancel={onCancelMock}
      />
    )
    
    const dialog = screen.getByRole('dialog', { hidden: true });
    fireEvent.click(dialog);
    expect(onCancelMock).toHaveBeenCalledTimes(1);
  })

  it('uses custom confirm and cancel text if provided', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Test"
        message="Message"
        confirmText="Yes, delete it"
        cancelText="No, keep it"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.getByText('Yes, delete it')).toBeInTheDocument()
    expect(screen.getByText('No, keep it')).toBeInTheDocument()
  })
})
