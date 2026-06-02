"""
RAG service for literature indexing and retrieval using LangChain and ChromaDB.
"""
import time
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime

from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from sqlalchemy.orm import Session

from backend.config import get_settings
from backend.models.literature import Literature, ProcessingStatus
from backend.services.pdf_processor import PDFProcessor
from backend.utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()


class RAGService:
    """Service for RAG operations using LangChain and ChromaDB."""
    
    def __init__(self):
        """Initialize RAG service with embeddings and vector store."""
        self.settings = settings
        
        # Initialize embeddings
        self.embeddings = GoogleGenerativeAIEmbeddings(
            model=settings.EMBEDDING_MODEL,
            google_api_key=settings.GEMINI_API_KEY
        )
        
        # Initialize text splitter
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP,
            length_function=len,
            separators=["\n\n", "\n", ". ", " ", ""]
        )
        
        # Initialize ChromaDB
        self.vector_store = Chroma(
            collection_name=settings.CHROMA_COLLECTION,
            embedding_function=self.embeddings,
            persist_directory=str(settings.CHROMA_DB_DIR)
        )
        
        logger.info("RAG service initialized")
    
    def index_literature(
        self,
        literature: Literature,
        text_content: str,
        db: Session,
        force_reindex: bool = False
    ) -> Dict[str, Any]:
        """
        Index literature document in vector store.
        
        Args:
            literature: Literature instance
            text_content: Extracted text content
            db: Database session
            force_reindex: Force reindexing if already indexed
            
        Returns:
            Dictionary with indexing results
        """
        try:
            # Check if already indexed
            if literature.processing_status == ProcessingStatus.INDEXED and not force_reindex:
                logger.info(f"Literature {literature.id} already indexed")
                return {
                    "literature_id": literature.id,
                    "filename": literature.filename,
                    "chunks_created": 0,
                    "status": "already_indexed",
                    "message": "Literature already indexed. Use force_reindex=True to reindex."
                }
            
            # Delete existing chunks if reindexing
            if force_reindex:
                self._delete_literature_chunks(literature.id)
            
            # Split text into chunks
            chunks = self.text_splitter.split_text(text_content)
            logger.info(f"Split text into {len(chunks)} chunks")
            
            # Prepare metadata for each chunk
            metadatas = []
            texts = []
            ids = []
            
            for i, chunk in enumerate(chunks):
                chunk_id = f"lit_{literature.id}_chunk_{i}"
                metadata = {
                    "literature_id": literature.id,
                    "filename": literature.filename,
                    "chunk_index": i,
                    "total_chunks": len(chunks),
                    "source": literature.file_path,
                    "indexed_at": datetime.utcnow().isoformat()
                }
                
                texts.append(chunk)
                metadatas.append(metadata)
                ids.append(chunk_id)
            
            # Add to vector store
            self.vector_store.add_texts(
                texts=texts,
                metadatas=metadatas,
                ids=ids
            )
            
            # Update literature status
            literature.processing_status = ProcessingStatus.INDEXED
            literature.indexed_at = datetime.utcnow()
            db.commit()
            db.refresh(literature)
            
            logger.info(f"Indexed literature {literature.id}: {len(chunks)} chunks")
            
            return {
                "literature_id": literature.id,
                "filename": literature.filename,
                "chunks_created": len(chunks),
                "status": "indexed",
                "message": f"Successfully indexed {len(chunks)} chunks",
                "indexed_at": literature.indexed_at
            }
            
        except Exception as e:
            logger.error(f"Error indexing literature {literature.id}: {str(e)}")
            literature.processing_status = ProcessingStatus.FAILED
            db.commit()
            raise
    
    def search_literature(
        self,
        query: str,
        top_k: int = 5,
        literature_ids: Optional[List[int]] = None
    ) -> List[Dict[str, Any]]:
        """
        Search literature using semantic similarity.
        
        Args:
            query: Search query
            top_k: Number of results to return
            literature_ids: Optional filter by literature IDs
            
        Returns:
            List of search results with metadata
        """
        try:
            start_time = time.time()
            
            # Build filter if literature_ids provided
            filter_dict = None
            if literature_ids:
                filter_dict = {"literature_id": {"$in": literature_ids}}
            
            # Perform similarity search
            results = self.vector_store.similarity_search_with_score(
                query=query,
                k=top_k,
                filter=filter_dict
            )
            
            # Format results
            formatted_results = []
            for doc, score in results:
                result = {
                    "literature_id": doc.metadata.get("literature_id"),
                    "filename": doc.metadata.get("filename"),
                    "text": doc.page_content,
                    "page": doc.metadata.get("page"),
                    "score": float(score),
                    "metadata": doc.metadata
                }
                formatted_results.append(result)
            
            search_time = (time.time() - start_time) * 1000  # Convert to ms
            
            logger.info(f"Search completed: {len(formatted_results)} results in {search_time:.2f}ms")
            
            return formatted_results
            
        except Exception as e:
            logger.error(f"Error searching literature: {str(e)}")
            raise
    
    def get_stats(self, db: Session) -> Dict[str, Any]:
        """
        Get RAG system statistics.
        
        Args:
            db: Database session
            
        Returns:
            Dictionary with statistics
        """
        try:
            # Count indexed literature
            indexed_count = db.query(Literature).filter(
                Literature.processing_status == ProcessingStatus.INDEXED
            ).count()
            
            # Get collection stats
            collection = self.vector_store._collection
            total_chunks = collection.count()
            
            return {
                "total_indexed": indexed_count,
                "total_chunks": total_chunks,
                "collection_name": settings.CHROMA_COLLECTION,
                "embedding_model": settings.EMBEDDING_MODEL,
                "chunk_size": settings.CHUNK_SIZE,
                "chunk_overlap": settings.CHUNK_OVERLAP
            }
            
        except Exception as e:
            logger.error(f"Error getting RAG stats: {str(e)}")
            raise
    
    def _delete_literature_chunks(self, literature_id: int):
        """
        Delete all chunks for a literature document.
        
        Args:
            literature_id: Literature ID
        """
        try:
            # Get all chunk IDs for this literature
            collection = self.vector_store._collection
            results = collection.get(
                where={"literature_id": literature_id}
            )
            
            if results and results["ids"]:
                # Delete chunks
                collection.delete(ids=results["ids"])
                logger.info(f"Deleted {len(results['ids'])} chunks for literature {literature_id}")
            
        except Exception as e:
            logger.error(f"Error deleting chunks for literature {literature_id}: {str(e)}")
            raise
    
    def delete_literature_index(self, literature_id: int, db: Session):
        """
        Delete literature from index and update status.
        
        Args:
            literature_id: Literature ID
            db: Database session
        """
        try:
            # Delete chunks
            self._delete_literature_chunks(literature_id)
            
            # Update literature status
            literature = db.query(Literature).filter(Literature.id == literature_id).first()
            if literature:
                literature.processing_status = ProcessingStatus.COMPLETED
                literature.indexed_at = None
                db.commit()
            
            logger.info(f"Deleted index for literature {literature_id}")
            
        except Exception as e:
            logger.error(f"Error deleting literature index: {str(e)}")
            raise
    
    def reindex_all(self, db: Session) -> Dict[str, Any]:
        """
        Reindex all literature documents.
        
        Args:
            db: Database session
            
        Returns:
            Dictionary with reindexing results
        """
        try:
            # Get all completed literature
            literature_list = db.query(Literature).filter(
                Literature.processing_status.in_([ProcessingStatus.COMPLETED, ProcessingStatus.INDEXED])
            ).all()
            
            results = {
                "total": len(literature_list),
                "success": 0,
                "failed": 0,
                "errors": []
            }
            
            for literature in literature_list:
                try:
                    # Extract text
                    text_content = PDFProcessor.extract_text(Path(literature.file_path))
                    
                    # Index
                    self.index_literature(literature, text_content, db, force_reindex=True)
                    results["success"] += 1
                    
                except Exception as e:
                    results["failed"] += 1
                    results["errors"].append({
                        "literature_id": literature.id,
                        "filename": literature.filename,
                        "error": str(e)
                    })
                    logger.error(f"Failed to reindex literature {literature.id}: {str(e)}")
            
            logger.info(f"Reindexing complete: {results['success']} success, {results['failed']} failed")
            return results
            
        except Exception as e:
            logger.error(f"Error during reindex all: {str(e)}")
            raise


# Singleton instance
_rag_service_instance = None


def get_rag_service() -> RAGService:
    """Get or create RAG service singleton."""
    global _rag_service_instance
    if _rag_service_instance is None:
        _rag_service_instance = RAGService()
    return _rag_service_instance
