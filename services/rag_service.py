"""
RAG (Retrieval-Augmented Generation) service using LangChain and ChromaDB
"""
from typing import List, Dict, Tuple, Optional
from pathlib import Path
import config
from database.db_manager import DatabaseManager
from services.file_processor import FileProcessor

# LangChain imports
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain.vectorstores import Chroma
from langchain.docstore.document import Document


class RAGService:
    """Handles RAG pipeline operations"""
    
    def __init__(self):
        self.db = DatabaseManager()
        self.file_processor = FileProcessor()
        self.embeddings = None
        self.vector_store = None
        self._init_embeddings()
        self._init_vector_store()
    
    def _init_embeddings(self):
        """Initialize Gemini embeddings"""
        try:
            self.embeddings = GoogleGenerativeAIEmbeddings(
                model=config.EMBEDDING_MODEL,
                google_api_key=config.GEMINI_API_KEY
            )
        except Exception as e:
            print(f"Error initializing embeddings: {e}")
            self.embeddings = None
    
    def _init_vector_store(self):
        """Initialize ChromaDB vector store"""
        try:
            self.vector_store = Chroma(
                persist_directory=str(config.CHROMA_DIR),
                embedding_function=self.embeddings,
                collection_name="research_papers"
            )
        except Exception as e:
            print(f"Error initializing vector store: {e}")
            self.vector_store = None
    
    def process_literature(self, lit_id: int) -> Tuple[bool, str]:
        """
        Process literature through RAG pipeline
        Returns: (success, message)
        """
        try:
            # Get literature metadata
            literature = self.db.get_literature()
            lit = next((l for l in literature if l['id'] == lit_id), None)
            
            if not lit:
                return False, "Literature not found"
            
            # Update status to processing
            self.db.update_literature_status(lit_id, 'processing')
            
            # Extract text from PDF
            success, msg, text_content = self.file_processor.extract_pdf_text(lit['file_path'])
            
            if not success or not text_content:
                self.db.update_literature_status(lit_id, 'failed')
                return False, f"Failed to extract text: {msg}"
            
            # Chunk text
            chunks = self._chunk_text(text_content, lit['filename'])
            
            if not chunks:
                self.db.update_literature_status(lit_id, 'failed')
                return False, "No text chunks generated"
            
            # Generate embeddings and store in vector database
            self._store_chunks(chunks, lit_id)
            
            # Update status to indexed
            self.db.update_literature_status(lit_id, 'indexed')
            
            return True, f"Successfully indexed {len(chunks)} chunks"
            
        except Exception as e:
            self.db.update_literature_status(lit_id, 'failed')
            return False, f"Error processing literature: {str(e)}"
    
    def _chunk_text(self, text: str, filename: str) -> List[Document]:
        """
        Chunk text into semantic segments
        Returns: List of LangChain Documents
        """
        try:
            # Initialize text splitter
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=config.CHUNK_SIZE,
                chunk_overlap=config.CHUNK_OVERLAP,
                length_function=len,
                separators=["\n\n", "\n", ". ", " ", ""]
            )
            
            # Split text
            chunks = text_splitter.split_text(text)
            
            # Create Document objects with metadata
            documents = []
            for i, chunk in enumerate(chunks):
                # Extract page number from chunk if available
                page_num = self._extract_page_number(chunk)
                
                doc = Document(
                    page_content=chunk,
                    metadata={
                        "source": filename,
                        "chunk_id": i,
                        "page": page_num if page_num else "unknown"
                    }
                )
                documents.append(doc)
            
            return documents
            
        except Exception as e:
            print(f"Error chunking text: {e}")
            return []
    
    def _extract_page_number(self, chunk: str) -> Optional[int]:
        """Extract page number from chunk text"""
        import re
        # Look for [Page X] pattern
        match = re.search(r'\[Page (\d+)\]', chunk)
        if match:
            return int(match.group(1))
        return None
    
    def _store_chunks(self, documents: List[Document], lit_id: int):
        """Store document chunks in vector database"""
        try:
            if not self.vector_store:
                raise Exception("Vector store not initialized")
            
            # Add literature ID to metadata
            for doc in documents:
                doc.metadata['literature_id'] = lit_id
            
            # Add documents to vector store
            self.vector_store.add_documents(documents)
            
            # Persist changes
            self.vector_store.persist()
            
        except Exception as e:
            raise Exception(f"Error storing chunks: {str(e)}")
    
    def retrieve_relevant_passages(self, query: str, top_k: int = None) -> List[Dict]:
        """
        Retrieve relevant passages for a query
        Returns: List of dicts with content, source, page, score
        """
        try:
            if not self.vector_store:
                return []
            
            k = top_k if top_k else config.TOP_K_RETRIEVAL
            
            # Perform similarity search
            results = self.vector_store.similarity_search_with_score(query, k=k)
            
            # Format results
            passages = []
            for doc, score in results:
                passages.append({
                    'content': doc.page_content,
                    'source': doc.metadata.get('source', 'Unknown'),
                    'page': doc.metadata.get('page', 'Unknown'),
                    'literature_id': doc.metadata.get('literature_id'),
                    'relevance_score': float(score)
                })
            
            return passages
            
        except Exception as e:
            print(f"Error retrieving passages: {e}")
            return []
    
    def get_indexed_literature_count(self) -> int:
        """Get count of indexed literature"""
        try:
            literature = self.db.get_literature()
            return sum(1 for lit in literature if lit['processing_status'] == 'indexed')
        except Exception:
            return 0
    
    def reindex_all_literature(self) -> Tuple[int, int]:
        """
        Reindex all literature
        Returns: (success_count, failure_count)
        """
        literature = self.db.get_literature()
        success_count = 0
        failure_count = 0
        
        for lit in literature:
            success, _ = self.process_literature(lit['id'])
            if success:
                success_count += 1
            else:
                failure_count += 1
        
        return success_count, failure_count
    
    def search_literature(self, query: str, top_k: int = 5) -> List[Dict]:
        """
        Search literature and return formatted results
        Returns: List of search results with excerpts
        """
        passages = self.retrieve_relevant_passages(query, top_k)
        
        # Group by source and format
        results = []
        seen_sources = set()
        
        for passage in passages:
            source = passage['source']
            if source not in seen_sources:
                seen_sources.add(source)
                
                # Get all passages from this source
                source_passages = [p for p in passages if p['source'] == source]
                
                results.append({
                    'source': source,
                    'literature_id': passage['literature_id'],
                    'passages': source_passages,
                    'relevance': max(p['relevance_score'] for p in source_passages)
                })
        
        # Sort by relevance
        results.sort(key=lambda x: x['relevance'], reverse=True)
        
        return results
