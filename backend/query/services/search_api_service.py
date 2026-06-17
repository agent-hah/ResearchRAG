"""
Search API Service

Integrates with external search APIs to find academic articles.
Supports provider: OpenAlex.
"""
import logging
import requests
from typing import List, Dict, Any, Optional
from django.conf import settings

logger = logging.getLogger(__name__)


class SearchAPIService:
    """
    Service for searching academic articles using external APIs
    """
    
    def __init__(self):
        self.openalex_api_key = getattr(settings, 'OPENALEX_API_KEY', None)
    
    async def search_openalex(
        self, 
        query: str, 
        max_results: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Search OpenAlex API (free, open catalog of the global research system)
        
        OpenAlex provides access to academic papers without strict rate limits.
        API docs: https://docs.openalex.org/
        
        Args:
            query: Search query
            max_results: Maximum number of results
            
        Returns:
            List of article metadata dictionaries
        """
        try:
            url = "https://api.openalex.org/works"
            params = {
                "search": query,
                "per-page": min(max_results, 50),
            }
                
            headers = {}
            if self.openalex_api_key:
                headers["Authorization"] = f"Bearer {self.openalex_api_key}"
                
            response = requests.get(url, params=params, headers=headers, timeout=60)
            response.raise_for_status()
            
            data = response.json()
            works = data.get("results", [])
            
            # Transform to our format
            articles = []
            for work in works[:max_results]:
                authorships = work.get("authorships", [])
                authors_str = ", ".join([
                    a.get("author", {}).get("display_name", "") 
                    for a in authorships[:3]
                ])
                if len(authorships) > 3:
                    authors_str += " et al."
                    
                # Handle venue which can be None
                venue = ""
                primary_location = work.get("primary_location")
                if primary_location:
                    source = primary_location.get("source")
                    if source:
                        venue = source.get("display_name", "")
                    
                article = {
                    "title": work.get("title", ""),
                    "authors": authors_str or "Unknown",
                    "year": work.get("publication_year"),
                    "venue": venue,
                    "abstract": self._parse_openalex_abstract(work.get("abstract_inverted_index")),
                    "url": work.get("id", ""),
                    "citation_count": work.get("cited_by_count", 0),
                    "doi": work.get("doi")
                }
                article["relevance_score"] = self._calculate_relevance(article, query)
                articles.append(article)
            
            logger.info(f"Found {len(articles)} articles via OpenAlex for query: {query}")
            return articles
            
        except requests.exceptions.RequestException as e:
            logger.error(f"OpenAlex request failed: {e}")
            return []
        except Exception as e:
            logger.error(f"Failed to parse OpenAlex response: {e}")
            return []
            
    def _parse_openalex_abstract(self, inverted_index: Optional[Dict]) -> str:
        """Parse OpenAlex's abstract inverted index into a string"""
        if not inverted_index:
            return ""
        
        word_index = []
        for word, positions in inverted_index.items():
            for pos in positions:
                word_index.append((pos, word))
                
        word_index.sort(key=lambda x: x[0])
        return " ".join([word for _, word in word_index])
    

    async def search_articles(
        self, 
        query: str, 
        max_results: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Search for articles using OpenAlex.
        
        Args:
            query: Search query
            max_results: Maximum number of results
            
        Returns:
            List of article metadata dictionaries
        """
        results = await self.search_openalex(query, max_results)
        if results:
            return results
        
        logger.warning(f"No results found for query: {query}")
        return []
    
    def _extract_year(self, text: str) -> Optional[int]:
        """Extract year from text"""
        import re
        match = re.search(r'\b(19|20)\d{2}\b', text)
        return int(match.group(0)) if match else None
    
    def _calculate_relevance(self, result: Dict, query: str) -> float:
        """Calculate relevance score based on result data"""
        score = 0.5
        
        # Boost if query terms in title
        title = result.get("title", "")
        if title:
            title = title.lower()
            query_terms = query.lower().split()
            if query_terms:
                matching_terms = sum(1 for term in query_terms if term in title)
                score += (matching_terms / len(query_terms)) * 0.3
        
        # Boost if highly cited
        citations = result.get("citation_count", 0)
        if isinstance(citations, int):
            if citations > 100:
                score += 0.2
            elif citations > 50:
                score += 0.1
            elif citations > 10:
                score += 0.05
        
        return min(round(score, 2), 1.0)
