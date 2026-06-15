import { useState } from 'react'
import { Menu, X, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { HelpGuide } from './HelpGuide'

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  return (
    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      <button
        type="button"
        className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        <span className="sr-only">Open sidebar</span>
        {mobileMenuOpen ? (
          <X className="h-6 w-6" aria-hidden="true" />
        ) : (
          <Menu className="h-6 w-6" aria-hidden="true" />
        )}
      </button>

      {/* Separator */}
      <div className="h-6 w-px bg-gray-200 lg:hidden" aria-hidden="true" />

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <div className="flex flex-1 items-center">
          {/* Breadcrumb or page title could go here */}
        </div>
        
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          {/* Help */}
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500"
            onClick={() => setHelpOpen(true)}
          >
            <span className="sr-only">Help</span>
            <HelpCircle className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Help Guide */}
      <HelpGuide isOpen={helpOpen} onClose={() => setHelpOpen(false)} />

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden">
          <div className="fixed inset-0 z-50" />
          <div className={cn(
            "fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-white px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10",
            "transform transition-transform duration-300 ease-in-out"
          )}>
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold">Menu</span>
              <button
                type="button"
                className="-m-2.5 rounded-md p-2.5 text-gray-700"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="sr-only">Close menu</span>
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
            {/* Mobile navigation would go here */}
          </div>
        </div>
      )}
    </div>
  )
}