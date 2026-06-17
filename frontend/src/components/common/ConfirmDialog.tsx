import { X } from 'lucide-react'
/* eslint-disable react-doctor/no-event-handler */
import { useEffect, useRef } from 'react'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen && !dialog.open) {
      dialog.showModal()
    } else if (!isOpen && dialog.open) {
      dialog.close()
    }
    // eslint-disable-next-line react-doctor/no-event-handler
  }, [isOpen])

  return (
    // eslint-disable-next-line react-doctor/no-noninteractive-element-interactions, react-doctor/click-events-have-key-events
    <dialog
      ref={dialogRef}
      className="p-0 rounded-lg shadow-xl border border-gray-200 backdrop:bg-black backdrop:bg-opacity-50 w-full max-w-lg"
      aria-labelledby="modal-title"
      onClick={(e) => {
        if (e.target === dialogRef.current) {
          onCancel();
        }
      }}
      onClose={() => {
        if (!dialogRef.current?.open) onCancel();
      }}
    >
      {isOpen && (
        <>
          <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4 text-left">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold leading-6 text-gray-900" id="modal-title">
                    {title}
                  </h3>
                  <button
                    type="button"
                    onClick={onCancel}
                    className="text-gray-400 hover:text-gray-500 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    {message}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
            <button
              type="button"
              className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto transition-colors"
              onClick={onConfirm}
            >
              {confirmText}
            </button>
            <button
              type="button"
              className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto transition-colors"
              onClick={onCancel}
            >
              {cancelText}
            </button>
          </div>
        </>
      )}
    </dialog>
  )
}
