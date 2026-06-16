"""
RAG service for literature indexing and retrieval using LangChain and ChromaDB (Django ORM).
"""
import time
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime

from tenacity import retry, wait_exponential, stop_after_attempt

from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_pinecone import PineconeVectorStore
from pinecone import Pinecone
import os
from langchain_google_genai import GoogleGenerativeAIEmbeddings

from django.conf import settings
from literature.models import Literature, ProcessingStatus
from literature.services.pdf_processor import PDFProcessor

import logging
logger = logging.getLogger(__name__)

class RAGService:
    """Service for RAG operations using LangChain and ChromaDB."""
    
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.embeddings = GoogleGenerativeAIEmbeddings(
            model=settings.EMBEDDING_MODEL,
            google_api_key=settings.GOOGLE_API_KEY
        )
        
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP,
            length_function=len,
            separators=["\n\n", "\n", ". ", " ", ""]
        )
        
        self.vector_store = PineconeVectorStore(
            index_name="researchrag-index",
            embedding=self.embeddings,
            pinecone_api_key=settings.PINECONE_API_KEY,
            namespace=self.user_id
        )
        logger.info(f"RAG service initialized with Pinecone (namespace: {self.user_id})")
    
    def index_literature(self, literature: Literature, text_content: str, force_reindex: bool = False) -> Dict[str, Any]:
        try:
            if literature.processing_status == ProcessingStatus.INDEXED and not force_reindex:
                logger.info(f"Literature {literature.id} already indexed")
                return {
                    "literature_id": literature.id,
                    "filename": literature.filename,
                    "chunks_created": 0,
                    "status": "already_indexed",
                    "message": "Literature already indexed. Use force_reindex=True to reindex."
                }
            
            if force_reindex:
                self._delete_literature_chunks(literature.id)
            
            chunks = self.text_splitter.split_text(text_content)
            logger.info(f"Split text into {len(chunks)} chunks")
            
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
            
            # Use batching and exponential backoff to avoid hitting API rate limits
            batch_size = 20  # Process in smaller batches
            
            literature.processing_status = ProcessingStatus.PROCESSING
            literature.indexing_progress = 0.0
            literature.save(update_fields=['processing_status', 'indexing_progress'])

            @retry(
                wait=wait_exponential(multiplier=1, min=10, max=60),
                stop=stop_after_attempt(5),
                reraise=True
            )
            def add_batch(b_texts, b_metadatas, b_ids):
                self.vector_store.add_texts(texts=b_texts, metadatas=b_metadatas, ids=b_ids)

            for i in range(0, len(texts), batch_size):
                b_texts = texts[i:i + batch_size]
                b_metadatas = metadatas[i:i + batch_size]
                b_ids = ids[i:i + batch_size]
                logger.info(f"Indexing batch {i // batch_size + 1}/{(len(texts) + batch_size - 1) // batch_size} for literature {literature.id}")
                add_batch(b_texts, b_metadatas, b_ids)
                
                # Update progress
                literature.indexing_progress = min(1.0, (i + len(b_texts)) / len(texts))
                literature.save(update_fields=['indexing_progress'])
                
                # Delay between batches to stretch out quota usage over the day
                time.sleep(15.0)
            
            literature.processing_status = ProcessingStatus.INDEXED
            literature.indexing_progress = 1.0
            literature.indexed_at = datetime.utcnow()
            literature.save()
            
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
            literature.save()
            raise
    
    def search_literature(self, query: str, top_k: int = 5, literature_ids: Optional[List[int]] = None, max_chunks_per_doc: int = 3) -> List[Dict[str, Any]]:
        try:
            start_time = time.time()
            filter_dict = None
            if literature_ids:
                filter_dict = {"literature_id": {"$in": literature_ids}}
            
            fetch_k = top_k * 5
            
            @retry(
                wait=wait_exponential(multiplier=1, min=2, max=20),
                stop=stop_after_attempt(4),
                reraise=True
            )
            def do_search():
                return self.vector_store.similarity_search_with_relevance_scores(query=query, k=fetch_k, filter=filter_dict)
                
            results = do_search()
            
            formatted_results = []
            reserve = []
            doc_counts = {}
            
            for doc, score in results:
                lit_id = doc.metadata.get("literature_id")
                
                result = {
                    "literature_id": lit_id,
                    "filename": doc.metadata.get("filename"),
                    "text": doc.page_content,
                    "page": doc.metadata.get("page"),
                    "score": float(score),
                    "metadata": doc.metadata
                }
                
                if lit_id is not None:
                    if doc_counts.get(lit_id, 0) < max_chunks_per_doc:
                        formatted_results.append(result)
                        doc_counts[lit_id] = doc_counts.get(lit_id, 0) + 1
                    else:
                        reserve.append(result)
                else:
                    formatted_results.append(result)
                    
                if len(formatted_results) >= top_k:
                    break
                    
            if len(formatted_results) < top_k and reserve:
                needed = top_k - len(formatted_results)
                formatted_results.extend(reserve[:needed])
            
            search_time = (time.time() - start_time) * 1000
            logger.info(f"Search completed: {len(formatted_results)} results in {search_time:.2f}ms")
            return formatted_results
        except Exception as e:
            logger.error(f"Error searching literature: {str(e)}")
            raise
    
    def get_stats(self) -> Dict[str, Any]:
        try:
            indexed_count = Literature.objects.filter(processing_status=ProcessingStatus.INDEXED, user_id=self.user_id).count()
            
            # Fetch stats directly from the Pinecone client
            pc = Pinecone(api_key=os.environ.get("PINECONE_API_KEY", settings.PINECONE_API_KEY))
            index = pc.Index("researchrag-index")
            stats = index.describe_index_stats()
            namespaces = stats.namespaces if hasattr(stats, 'namespaces') else {}
            namespace_stats = namespaces.get(self.user_id, {})
            total_chunks = namespace_stats.get('vector_count', 0) if isinstance(namespace_stats, dict) else getattr(namespace_stats, 'vector_count', 0)
            
            return {
                "total_indexed": indexed_count,
                "total_chunks": total_chunks,
                "collection_name": "researchrag-index",
                "embedding_model": settings.EMBEDDING_MODEL,
                "chunk_size": settings.CHUNK_SIZE,
                "chunk_overlap": settings.CHUNK_OVERLAP
            }
        except Exception as e:
            logger.error(f"Error getting RAG stats: {str(e)}")
            raise
    
    def _delete_literature_chunks(self, literature_id: int):
        try:
            self.vector_store.delete(filter={"literature_id": literature_id})
            logger.info(f"Deleted chunks for literature {literature_id}")
        except Exception as e:
            logger.error(f"Error deleting chunks for literature {literature_id}: {str(e)}")
            raise
    
    def delete_literature_index(self, literature_id: int):
        try:
            self._delete_literature_chunks(literature_id)
            literature = Literature.objects.filter(id=literature_id).first()
            if literature:
                literature.processing_status = ProcessingStatus.COMPLETED
                literature.indexed_at = None
                literature.indexing_progress = 0.0
                literature.save()
            logger.info(f"Deleted index for literature {literature_id}")
        except Exception as e:
            logger.error(f"Error deleting literature index: {str(e)}")
            raise
    
    def reindex_all(self) -> Dict[str, Any]:
        try:
            literature_list = Literature.objects.filter(user_id=self.user_id)
            
            results = {
                "total": literature_list.count(),
                "success": 0,
                "failed": 0,
                "errors": []
            }
            
            for literature in literature_list:
                try:
                    literature.processing_status = ProcessingStatus.PROCESSING
                    literature.save()
                    
                    text_content = PDFProcessor.extract_text(Path(literature.file_path))
                    self.index_literature(literature, text_content, force_reindex=True)
                    results["success"] += 1
                    
                    # Delay between full documents to preserve daily quota rate
                    time.sleep(30.0)
                except Exception as e:
                    results["failed"] += 1
                    literature.processing_status = ProcessingStatus.FAILED
                    literature.error_message = str(e)
                    literature.save()
                    
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

_rag_service_instances = {}

def get_rag_service(user_id: str) -> RAGService:
    global _rag_service_instances
    if user_id not in _rag_service_instances:
        _rag_service_instances[user_id] = RAGService(user_id)
    return _rag_service_instances[user_id]
