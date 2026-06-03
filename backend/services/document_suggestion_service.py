"""
Document Suggestion Service

Analyzes datasets and suggests relevant research articles using Google Scholar/Search API.
"""
import re
import logging
from typing import List, Dict, Any, Optional

import google.generativeai as genai
from backend.config import get_settings
from rag.models import Dataset
from query.models import DocumentSuggestion
from backend.services.search_api_service import SearchAPIService
from backend.utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()

# Configure Gemini
genai.configure(api_key=settings.GOOGLE_API_KEY)


class DocumentSuggestionService:
    """
    Service for generating and managing document suggestions
    """
    
    def __init__(self):
        self.db = db
        self.model = genai.GenerativeModel('gemma-4-26b-a4b-it')
        self.search_api = SearchAPIService()
    
    async def analyze_dataset_for_keywords(self, dataset_id: int) -> List[str]:
        """
        Analyze a dataset and extract key research terms
        
        Args:
            dataset_id: Dataset ID to analyze
            
        Returns:
            List of search keywords/phrases
        """
        try:
            # Get dataset
            dataset = self.Dataset.objects.filter(id=dataset_id).first()
            if not dataset:
                raise ValueError(f"Dataset {dataset_id} not found")
            
            # Get column names and sample data
            metadata = dataset.metadata or {}
            columns = metadata.get('columns', [])
            
            # Create analysis prompt
            prompt = f"""Analyze this dataset and generate 3-5 research keywords or phrases that would help find relevant academic papers.

Dataset: {dataset.filename}
Columns: {', '.join(columns)}

Generate keywords that are:
1. Specific to the research domain
2. Suitable for academic paper search
3. Not too broad or generic

Return ONLY the keywords, one per line, without numbering or explanation."""

            # Generate keywords using Gemini
            response = self.model.generate_content(prompt)
            keywords_text = response.text.strip()
            
            # Parse keywords (one per line)
            keywords = [
                kw.strip() 
                for kw in keywords_text.split('\n') 
                if kw.strip() and not kw.strip().startswith('#')
            ]
            
            # Clean up keywords (remove numbering, bullets, etc.)
            cleaned_keywords = []
            for kw in keywords:
                # Remove leading numbers, bullets, dashes
                cleaned = re.sub(r'^[\d\.\-\*\•]+\s*', '', kw)
                if cleaned:
                    cleaned_keywords.append(cleaned)
            
            logger.info(f"Generated {len(cleaned_keywords)} keywords for dataset {dataset_id}")
            return cleaned_keywords[:5]  # Limit to 5 keywords
            
        except Exception as e:
            logger.error(f"Failed to analyze dataset {dataset_id}: {e}")
            return []
    
    async def search_articles(
        self, 
        query: str, 
        max_results: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Search for academic articles using real search APIs
        
        Uses SearchAPIService which supports:
        - SerpAPI (Google Scholar) - requires API key
        - Semantic Scholar - free, no API key
        - CrossRef - free, no API key
        
        Falls back to Gemini-generated mock results if all APIs fail.
        
        Args:
            query: Search query
            max_results: Maximum number of results
            
        Returns:
            List of article metadata dictionaries
        """
        try:
            # Try real search APIs first
            articles = await self.search_api.search_articles(query, max_results)
            
            if articles:
                logger.info(f"Found {len(articles)} real articles for query: {query}")
                return articles
            
            # Fallback to Gemini-generated mock results
            logger.warning(f"No real API results, using Gemini fallback for query: {query}")
            return await self._search_articles_fallback(query, max_results)
            
        except Exception as e:
            logger.error(f"Failed to search articles for query '{query}': {e}")
            return []
    
    async def _search_articles_fallback(
        self, 
        query: str, 
        max_results: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Fallback method using Gemini to generate mock article suggestions
        
        This is used when real APIs are unavailable or fail.
        
        Args:
            query: Search query
            max_results: Maximum number of results
            
        Returns:
            List of article metadata dictionaries
        """
        try:
            prompt = f"""Generate {max_results} realistic academic paper suggestions for the research query: "{query}"

For each paper, provide:
- Title (realistic academic paper title)
- Authors (2-4 author names)
- Year (2015-2024)
- Venue (journal or conference name)
- Abstract (2-3 sentence summary)
- Relevance score (0.0-1.0)

Format as JSON array with fields: title, authors, year, venue, abstract, relevance_score

Return ONLY valid JSON, no additional text."""

            response = self.model.generate_content(prompt)
            response_text = response.text.strip()
            
            # Extract JSON from response (handle markdown code blocks)
            if '```json' in response_text:
                json_start = response_text.find('```json') + 7
                json_end = response_text.find('```', json_start)
                response_text = response_text[json_start:json_end].strip()
            elif '```' in response_text:
                json_start = response_text.find('```') + 3
                json_end = response_text.find('```', json_start)
                response_text = response_text[json_start:json_end].strip()
            
            # Parse JSON
            import json
            articles = json.loads(response_text)
            
            # Add mock URLs and DOIs
            for i, article in enumerate(articles):
                article['url'] = f"https://scholar.google.com/scholar?q={query.replace(' ', '+')}"
                article['doi'] = f"10.1000/mock.{i+1}"
                article['citation_count'] = (10 - i) * 5  # Mock citation counts
            
            logger.info(f"Generated {len(articles)} mock articles for query: {query}")
            return articles
            
        except Exception as e:
            logger.error(f"Failed to generate mock articles for query '{query}': {e}")
            return []
    
    async def generate_suggestions_for_dataset(
        self, 
        dataset_id: int,
        max_per_keyword: int = 3
    ) -> List[DocumentSuggestion]:
        """
        Generate article suggestions for a dataset
        
        Args:
            dataset_id: Dataset ID
            max_per_keyword: Maximum suggestions per keyword
            
        Returns:
            List of DocumentSuggestion objects
        """
        try:
            # Get keywords
            keywords = await self.analyze_dataset_for_keywords(dataset_id)
            if not keywords:
                logger.warning(f"No keywords generated for dataset {dataset_id}")
                return []
            
            # Search for articles for each keyword
            all_suggestions = []
            for keyword in keywords:
                articles = await self.search_articles(keyword, max_results=max_per_keyword)
                
                for article in articles:
                    # Create suggestion
                    suggestion = DocumentSuggestion(
                        dataset_id=dataset_id,
                        title=article.get('title', ''),
                        authors=article.get('authors', ''),
                        publication_year=article.get('year'),
                        publication_venue=article.get('venue', ''),
                        abstract=article.get('abstract', ''),
                        snippet=article.get('abstract', '')[:200] if article.get('abstract') else None,
                        url=article.get('url'),
                        doi=article.get('doi'),
                        relevance_score=article.get('relevance_score', 0.5),
                        search_query=keyword,
                        citation_count=article.get('citation_count')
                    )
                    
                    self.suggestion.save()
                    all_suggestions.append(suggestion)
            
            self.
            
            logger.info(f"Generated {len(all_suggestions)} suggestions for dataset {dataset_id}")
            return all_suggestions
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to generate suggestions for dataset {dataset_id}: {e}")
            raise
    
    def get_suggestions_for_dataset(
        self, 
        dataset_id: int,
        include_dismissed: bool = False
    ) -> List[DocumentSuggestion]:
        """
        Get existing suggestions for a dataset
        
        Args:
            dataset_id: Dataset ID
            include_dismissed: Whether to include dismissed suggestions
            
        Returns:
            List of DocumentSuggestion objects
        """
        query = self.db.query(DocumentSuggestion).filter(
            DocumentSuggestion.dataset_id == dataset_id
        )
        
        if not include_dismissed:
            query = query.filter(DocumentSuggestion.is_dismissed == False)
        
        return query.order_by(DocumentSuggestion.relevance_score.desc()).all()
    
    def update_suggestion_feedback(
        self,
        suggestion_id: int,
        is_relevant: Optional[bool] = None,
        is_dismissed: Optional[bool] = None,
        is_imported: Optional[bool] = None
    ) -> DocumentSuggestion:
        """
        Update user feedback for a suggestion
        
        Args:
            suggestion_id: Suggestion ID
            is_relevant: Whether user marked as relevant
            is_dismissed: Whether user dismissed
            is_imported: Whether user imported
            
        Returns:
            Updated DocumentSuggestion
        """
        suggestion = self.db.query(DocumentSuggestion).filter(
            DocumentSuggestion.id == suggestion_id
        ).first()
        
        if not suggestion:
            raise ValueError(f"Suggestion {suggestion_id} not found")
        
        if is_relevant is not None:
            suggestion.is_relevant = is_relevant
        
        if is_dismissed is not None:
            suggestion.is_dismissed = is_dismissed
        
        if is_imported is not None:
            suggestion.is_imported = is_imported
        
        self.
        self.
        
        logger.info(f"Updated feedback for suggestion {suggestion_id}")
        return suggestion
    
    def delete_suggestions_for_dataset(self, dataset_id: int) -> int:
        """
        Delete all suggestions for a dataset
        
        Args:
            dataset_id: Dataset ID
            
        Returns:
            Number of suggestions deleted
        """
        count = self.db.query(DocumentSuggestion).filter(
            DocumentSuggestion.dataset_id == dataset_id
        ).delete()
        
        self.
        
        logger.info(f"Deleted {count} suggestions for dataset {dataset_id}")
        return count
