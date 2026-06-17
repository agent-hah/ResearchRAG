import { NavLink } from 'react-router-dom'
import { 
  Home, 
  Files, 
  FileText,
  Search, 
  BarChart3, 
  StickyNote,
  Sparkles,
  Download,
  Brain
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NavItem } from '@/types'

// eslint-disable-next-line react-doctor/only-export-components
export const navigation: NavItem[] = [
  { title: 'Home', href: '/', icon: Home, description: 'Dashboard and overview' },
  { title: 'Files', href: '/files', icon: Files, description: 'Upload and manage datasets' },
  { title: 'Literature', href: '/literature', icon: FileText, description: 'View and annotate PDFs' },
  { title: 'Query', href: '/query', icon: Search, description: 'Natural language queries' },
  { title: 'Visualization', href: '/visualization', icon: BarChart3, description: 'Charts and graphs' },
  { title: 'Notes', href: '/notes', icon: StickyNote, description: 'Research notes and annotations' },
  { title: 'Suggestions', href: '/suggestions', icon: Sparkles, description: 'Discover relevant articles' },
  { title: 'Export', href: '/export', icon: Download, description: 'Export data and results' },
]

export function Sidebar() {
  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4 shadow-sm border-r border-gray-200">
        <div className="flex h-16 shrink-0 items-center">
          <div className="flex items-center space-x-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Research Workspace</h1>
              <p className="text-xs text-gray-500">AI-Driven Analysis</p>
            </div>
          </div>
        </div>
        
        <nav className="flex flex-1 flex-col">
          <ul className="flex flex-1 flex-col gap-y-7">
            <li>
              <ul className="-mx-2 space-y-1">
                {navigation.map((item) => (
                  <li key={item.title}>
                    <NavLink
                      to={item.href}
                      className={({ isActive }) =>
                        cn(
                          'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-medium transition-colors',
                          isActive
                            ? 'bg-primary-50 text-primary-700'
                            : 'text-gray-700 hover:text-primary-700 hover:bg-gray-50'
                        )
                      }
                    >
                      {({ isActive }) => {
                        const Icon = item.icon
                        return (
                          <>
                            {Icon && (
                              <Icon
                                className={cn(
                                  'h-5 w-5 shrink-0 transition-colors',
                                  isActive ? 'text-primary-700' : 'text-gray-400 group-hover:text-primary-700'
                                )}
                              />
                            )}
                            <div className="flex-1">
                              <div>{item.title}</div>
                              {item.description && (
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {item.description}
                                </div>
                              )}
                            </div>
                          </>
                        )
                      }}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  )
}