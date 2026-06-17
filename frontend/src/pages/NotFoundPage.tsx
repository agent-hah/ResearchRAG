import { Link } from 'react-router-dom'
import { Home, ArrowLeft } from 'lucide-react'

export function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-gray-200">404</h1>
          <h2 className="text-2xl font-semibold text-gray-900 mt-4">Page not found</h2>
          <p className="text-gray-600 mt-2">
            Sorry, we couldn't find the page you're looking for.
          </p>
        </div>
        
        <div className="flex items-center justify-center space-x-4">
          <Link
            to="/"
            className="btn btn-primary"
          >
            <Home className="h-4 w-4 mr-2" />
            Go home
          </Link>
          
          <button type="button"
            onClick={() => window.history.back()}
            className="btn btn-outline"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go back
          </button>
        </div>
      </div>
    </div>
  )
}