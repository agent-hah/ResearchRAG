import { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const isNotesPage = location.pathname === '/notes'

  return (
    <div className={`bg-gray-50 flex flex-col ${isNotesPage ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
      <Sidebar />
      <div className="lg:pl-72 flex flex-col flex-1">
        <Header />
        {isNotesPage ? (
          <main className="flex-1 flex flex-col overflow-hidden">
            {children}
          </main>
        ) : (
          <main className="py-6">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        )}
      </div>
    </div>
  )
}