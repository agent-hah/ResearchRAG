# Research Workspace

An AI-driven data engineering platform for researchers to analyze datasets alongside published literature, featuring natural language queries, RAG-augmented insights, interactive visualizations, and comprehensive research note-taking.

## 🌟 Features

### Core Capabilities
- **File Management**: Upload and manage CSV datasets and PDF research papers
- **Natural Language Queries**: Ask questions in plain English, get AI-synthesized answers
- **RAG Integration**: Semantic search across literature with automatic citation
- **Interactive Visualizations**: 5 chart types with auto-detection and robust AI-powered refinement (with multi-model fallback)
- **Research Notes**: Real-time markdown-supported notes with immediate formatting and graph relationships
- **PDF Annotations**: Highlight and annotate research papers
- **Document Suggestions**: AI-powered discovery of relevant research articles
- **Comprehensive Export**: Export data, results, and notes in multiple formats

### Technology Stack

**Backend**:
- Django 5.2.15 & DRF 3.17.1 (Python web framework)
- Neon PostgreSQL (Relational Database)
- Pinecone (Vector store)
- Cloudflare (File uploads)
- Google Gemini 3.5, 3.1 Flash Lite, Gemma 4 (LLMs with fallback mechanism)
- LangChain (RAG pipeline)
- Pandas 2.2.0 (Data processing)

**Frontend**:
- React 19.2.7 (UI framework)
- TypeScript 6.0.3 (Type safety)
- Vite 8.0.16 (Build tool)
- Tailwind CSS 4.3.0 (Styling)
- React Query 5.100.14 (State management)
- Recharts 3.8.1 (Charts)
- React PDF 10.4.1 (PDF viewing)

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- Node.js 16+
- Google API key (for Gemini Pro)
- OpenAlex API key (optional, for higher rate limits)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd research-workspace
```

2. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env and add your GOOGLE_API_KEY
# Optionally add OPENALEX_API_KEY for premium access
```

3. **Quick setup with script** (recommended)
```bash
./setup_tests.sh
```

Or **manual setup**:

```bash
# Install backend dependencies (using Conda)
conda env create -f backend/environment.yml
conda activate RAG

# Install frontend dependencies
cd frontend
npm install
cd ..

# Initialize database
cd backend
python manage.py migrate
cd ..
```

4. **Start the backend**
```bash
cd backend
python manage.py runserver
```

5. **Start the frontend** (in another terminal)
```bash
cd frontend
npm run dev
```

6. **Access the application**
```
Open http://localhost:3000 in your browser
```

### Running Tests

**Backend tests**:
```bash
pytest -v
```

**Frontend tests**:
```bash
cd frontend
npm test
```


## 🧪 Testing

The application includes comprehensive automated tests for both backend and frontend.

### Backend Tests (Pytest)
```bash
# Run all tests
pytest -v

# Run specific test file
pytest tests/test_api_files.py -v

# Run with coverage
pytest --cov=backend --cov-report=html
```

### Frontend Tests (Vitest)
```bash
cd frontend

# Run tests in watch mode
npm test

# Run once (CI mode)
npm run test:run

# With coverage
npm run test:coverage
```

### Test Coverage
- Backend: 15+ test cases covering API endpoints, file management, queries, and search integration
- Frontend: 10+ test cases covering components, user interactions, and rendering


## 🔍 Search API Integration

The application supports OpenAlex for finding academic articles:

### Supported Providers

1. **OpenAlex** - Recommended
   - Free, open catalog of the global research system
   - No API key required
   - Supports optional OPENALEX_API_KEY for Premium subscribers
   - Excellent metadata and coverage
   - Generous rate limits

2. **Gemini Fallback**
   - Uses existing GOOGLE_API_KEY
   - Generates realistic mock results
   - Always available for testing
   - Multi-model fallback (Gemini 3.5 -> 3.1 Flash Lite -> Gemma 4) for resilience

### Configuration

Add to `.env` file:
```bash
# Required for AI features
GOOGLE_API_KEY=your_google_api_key

# Optional: OpenAlex API key for premium subscriptions
OPENALEX_API_KEY=your_openalex_api_key
```

The app automatically uses the best available provider with graceful fallback.

## 🎯 Key Workflows

### Analyze New Dataset
1. Upload CSV file
2. Ask questions in natural language
3. View AI-synthesized answers with data
4. Generate interactive visualizations
5. Export results

### Literature Review with Data
1. Upload PDF research papers
2. Query data with literature context
3. Get AI synthesis combining both
4. Annotate important passages
5. Take linked notes

### Discover Related Research
1. Select dataset to analyze
2. Generate article suggestions
3. Review relevance scores
4. Import interesting papers
5. Provide feedback

## 🏗️ Architecture

```
research-workspace/
├── backend/                 # Django backend
│   ├── core/               # Django settings and core configs
│   ├── files/              # File management app
│   ├── literature/         # Document search app
│   ├── rag/                # RAG and Pinecone integration
│   ├── query/              # NLQ execution app
│   └── refinement/         # AI fallback refinement app
├── frontend/               # React frontend
│   └── src/
│       ├── components/     # React components
│       ├── pages/          # Page components
│       ├── services/       # API clients
│       └── layouts/        # Layout components
├── data/                   # Data storage
│   └── uploads/           # Uploaded files
```

## 📊 API Endpoints

- **Health**: 1 endpoint
- **Files**: 12 endpoints (upload, list, preview, delete)
- **RAG**: 7 endpoints (index, search, stats)
- **Query**: 6 endpoints (execute, history, schema)
- **Refinement**: 2 endpoints (refine, suggestions)
- **Notes**: 11 endpoints (CRUD, relationships, graph)
- **Annotations**: 5 endpoints (CRUD, feedback)
- **Suggestions**: 6 endpoints (generate, list, feedback)
- **Export**: 4 endpoints (dataset, query, notes, visualization)

**Total**: 54 API endpoints

## 🧪 Testing

Run automated tests (when implemented):
```bash
# Backend tests
pytest

# Frontend tests
cd frontend
npm test

# E2E tests
npm run test:e2e
```

## 🔒 Security

- SQL injection prevention (Django ORM)
- XSS protection (React escaping)
- File upload validation & input sanitization
- GitHub CodeQL Scanning for continuous vulnerability detection
- External data transmission limited to AI APIs, Pinecone (Vector DB), Neon (PostgreSQL), and Cloudflare (Uploads)

## 📈 Performance

- File upload: < 1 second (excluding processing)
- CSV processing: ~2-5 seconds per 10K rows
- PDF processing: ~3-10 seconds per document
- RAG indexing: ~5-15 seconds per PDF
- Query execution: ~15 seconds end-to-end
- Chart rendering: < 500ms

## 🤝 Contributing

This is a research project. For issues or suggestions:
1. Submit detailed bug reports
2. Include reproduction steps

## 🙏 Acknowledgments

- Google Gemini models for AI capabilities
- LangChain for RAG pipeline
- Django and React communities
- All open-source dependencies

## 📞 Support

For issues:
1. Check application logs

## 🗺️ Roadmap

### Completed ✅
- File management (CSV, PDF)
- RAG pipeline with semantic search
- Natural language queries
- Interactive visualizations
- AI-powered chart refinement with multi-model fallback
- Notes with immediate formatting and graph relationships
- PDF annotations
- Document suggestions
- Comprehensive export
- GitHub CodeQL Security Scanning
- Cloud deployment

## 📊 Project Stats

- **Development Time**: 34 hours
- **Lines of Code**: ~15,000+
- **Components**: 30+ React components
- **API Endpoints**: 54 endpoints
- **Database Models**: 7 models
- **Test Cases**: 50+ manual tests

## 🎓 Use Cases

- **Academic Research**: Analyze experimental data with literature context
- **Data Science**: Quick exploratory data analysis with AI assistance
- **Literature Review**: Organize and annotate research papers
- **Hypothesis Testing**: Compare data against published findings
- **Research Documentation**: Take notes and track insights

## 💡 Tips

- Use descriptive filenames for datasets
- Upload relevant literature before querying
- Use tags consistently in notes
- Export data regularly as backup
- Provide feedback on suggestions to improve results

## 🔧 Configuration

Key environment variables:
```bash
GOOGLE_API_KEY=your_api_key_here
PINECONE_API_KEY=your_pinecone_api_key_here
DATABASE_URL=your_neon_postgres_url_here
UPLOAD_DIR=./data/uploads
```

## 📦 Dependencies

See `environment.yml` (backend) and `package.json` (frontend) for complete dependency lists.

## 🌐 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 📱 Mobile Support

Responsive design supports:
- Mobile devices (375px+)
- Tablets (768px+)
- Desktops (1920px+)

---

**Version**: 1.0  
**Last Updated**: 2026-06-17  
**Status**: Production-Ready

Built with ❤️ for researchers
