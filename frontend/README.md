# Research Workspace Frontend

React TypeScript frontend for the AI-driven data engineering workspace for researchers.

## Features

- **Modern React Stack**: React 18 + TypeScript + Vite
- **Responsive Design**: Tailwind CSS with mobile-first approach
- **State Management**: React Query for server state, React Context for client state
- **Routing**: React Router v6 with nested routes
- **API Integration**: Axios with interceptors and error handling
- **UI Components**: Custom component library with consistent design
- **Icons**: Lucide React for consistent iconography
- **Notifications**: React Hot Toast for user feedback

## Tech Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and building
- **Styling**: Tailwind CSS with custom design system
- **State Management**: 
  - React Query for server state and caching
  - React Hook Form for form state
- **Routing**: React Router DOM v6
- **HTTP Client**: Axios with request/response interceptors
- **Charts**: Recharts for data visualization
- **Icons**: Lucide React
- **Notifications**: React Hot Toast

## Project Structure

```
frontend/
├── public/                 # Static assets
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── layout/       # Layout components (Header, Sidebar)
│   │   ├── ui/           # Base UI components (Button, Input, etc.)
│   │   └── features/     # Feature-specific components
│   ├── pages/            # Page components
│   ├── lib/              # Utilities and configurations
│   │   ├── api.ts        # API client configuration
│   │   └── utils.ts      # Utility functions
│   ├── types/            # TypeScript type definitions
│   ├── hooks/            # Custom React hooks
│   └── styles/           # Global styles and Tailwind config
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## Development

### Prerequisites

- Node.js 18+ and npm/yarn
- Backend API running on http://localhost:8000

### Installation

```bash
cd frontend
npm install
```

### Development Server

```bash
npm run dev
```

The frontend will be available at http://localhost:3000 with:
- Hot module replacement
- API proxy to backend (http://localhost:8000)
- TypeScript checking
- ESLint integration

### Building

```bash
npm run build
```

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
npm run lint:fix
```

## API Integration

The frontend integrates with the FastAPI backend through:

- **Base URL**: `/api/v1` (proxied to http://localhost:8000 in development)
- **Authentication**: None (local-only application)
- **Error Handling**: Global error interceptors with user-friendly messages
- **Caching**: React Query for intelligent caching and background updates

### API Endpoints Used

- `GET /api/v1/health` - System health check
- `GET /api/v1/files/list` - List uploaded files
- `GET /api/v1/rag/stats` - RAG system statistics
- `GET /api/v1/query/history` - Query history
- And more as features are implemented...

## Design System

### Colors

- **Primary**: Blue scale (primary-50 to primary-900)
- **Gray**: Neutral scale (gray-50 to gray-900)
- **Semantic**: Success (green), Warning (yellow), Error (red)

### Typography

- **Font Family**: Inter (sans-serif), JetBrains Mono (monospace)
- **Scale**: text-xs to text-9xl with consistent line heights
- **Weights**: 300 (light) to 700 (bold)

### Components

- **Buttons**: Primary, secondary, outline, ghost variants with size options
- **Cards**: Consistent card layout with header, content, footer
- **Badges**: Status indicators with semantic colors
- **Forms**: Styled inputs, textareas, and form controls
- **Navigation**: Sidebar navigation with active states

### Responsive Design

- **Mobile First**: Tailwind's mobile-first breakpoints
- **Breakpoints**: sm (640px), md (768px), lg (1024px), xl (1280px)
- **Layout**: Responsive sidebar that collapses on mobile
- **Grid**: CSS Grid and Flexbox for layouts

## State Management

### Server State (React Query)

```typescript
// Example query
const { data, isLoading, error } = useQuery({
  queryKey: ['files'],
  queryFn: () => api.get('/files/list').then(res => res.data),
  staleTime: 5 * 60 * 1000, // 5 minutes
})
```

### Form State (React Hook Form)

```typescript
// Example form
const { register, handleSubmit, formState: { errors } } = useForm<FormData>()
```

### Client State (React Context)

```typescript
// Example context for UI state
const { theme, setTheme } = useTheme()
```

## Error Handling

### API Errors

- Global error interceptor in axios configuration
- User-friendly error messages via toast notifications
- Automatic retry for transient errors
- Fallback UI for error states

### Runtime Errors

- Error boundaries for component error catching
- Graceful degradation for missing data
- Loading states for async operations

## Performance Optimizations

### Code Splitting

- Route-based code splitting with React.lazy()
- Component-level splitting for large features
- Dynamic imports for heavy libraries

### Caching

- React Query for server state caching
- Browser caching for static assets
- Service worker for offline support (future)

### Bundle Optimization

- Vite's built-in optimizations
- Tree shaking for unused code
- Asset optimization and compression

## Accessibility

### Standards Compliance

- WCAG 2.1 AA compliance target
- Semantic HTML structure
- ARIA labels and roles
- Keyboard navigation support

### Implementation

- Focus management for modals and navigation
- Screen reader friendly content
- High contrast color ratios
- Scalable text and UI elements

## Testing Strategy

### Unit Tests (Future)

- Component testing with React Testing Library
- Hook testing with React Hooks Testing Library
- Utility function testing with Jest

### Integration Tests (Future)

- API integration testing
- User flow testing
- Cross-browser compatibility

### E2E Tests (Future)

- Critical user journeys
- Form submissions and data flows
- Error handling scenarios

## Deployment

### Build Process

```bash
npm run build
```

Generates optimized production build in `dist/` directory.

### Static Hosting

The built application can be deployed to:
- Netlify
- Vercel
- AWS S3 + CloudFront
- GitHub Pages
- Any static hosting service

### Environment Variables

```bash
# .env.local
VITE_API_BASE_URL=http://localhost:8000
VITE_APP_VERSION=1.0.0
```

## Browser Support

- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **ES2020 Features**: Native support required
- **Polyfills**: None required for target browsers

## Contributing

### Code Style

- TypeScript strict mode enabled
- ESLint with React and TypeScript rules
- Prettier for code formatting
- Conventional commit messages

### Development Workflow

1. Create feature branch from main
2. Implement feature with tests
3. Run linting and type checking
4. Submit pull request with description
5. Code review and merge

## Future Enhancements

### Phase 2 Additions

- File upload components with drag & drop
- Query interface with syntax highlighting
- Real-time query results
- Data visualization components

### Phase 3+ Features

- Advanced chart customization
- Collaborative features
- Offline support
- Mobile app (React Native)
- Advanced analytics dashboard

## Troubleshooting

### Common Issues

**Build Errors**:
- Check Node.js version (18+ required)
- Clear node_modules and reinstall
- Verify TypeScript configuration

**API Connection**:
- Ensure backend is running on port 8000
- Check proxy configuration in vite.config.ts
- Verify CORS settings in backend

**Styling Issues**:
- Rebuild Tailwind CSS classes
- Check for conflicting CSS
- Verify Tailwind configuration

### Development Tips

- Use React Developer Tools for debugging
- Enable React Query DevTools in development
- Use browser network tab for API debugging
- Check console for TypeScript errors

## License

This project is part of the Research Workspace application. See the main project README for license information.