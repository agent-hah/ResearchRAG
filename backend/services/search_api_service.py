"""
Search API Service

Integrates with external search APIs to find academic articles.
Supports multiple providers: SerpAPI (Google Scholar), Semantic Scholar, CrossRef.
"""
import logging
import requests
from typing import List, Dict, Any, Optional
from backend.config import get_settings
from backend.utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()


class SearchAPIService:
    """
    Service for searching academic articles using external APIs
    """
    
    def __init__(self):
        self.serpapi_key = getattr(settings, 'SERPAPI_KEY', None)
        self.use_serpapi = bool(self.serpapi_key)
    
    async def search_google_scholar_serpapi(
        self, 
        query: str, 
        max_results: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Search Google Scholar using SerpAPI
        
        SerpAPI provides access to Google Scholar results without rate limits.
        Get API key from: https://serpapi.com/
        
        Args:
            query: Search query
            max_results: Maximum number of results
            
        Returns:
            List of article metadata dictionaries
        """
        if not self.serpapi_key:
            logger.warning("SerpAPI key not configured, falling back to mock results")
            return []
        
        try:
            url = "https://serpapi.com/search"
            params = {
                "engine": "google_scholar",
                "q": query,
                "api_key": self.serpapi_key,
                "num": min(max_results, 20),  # SerpAPI limit
                "hl": "en"
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            organic_results = data.get("organic_results", [])
            
            # Transform to our format
            articles = []
            for result in organic_results[:max_results]:
                publication_info = result.get("publication_info", {})
                
                article = {
                    "title": result.get("title", ""),
                    "authors": publication_info.get("authors", [{}])[0].get("name", "Unknown") if publication_info.get("authors") else "Unknown",
                    "year": self._extract_year(publication_info.get("summary", "")),
                    "venue": publication_info.get("summary", "").split("-")[0].strip() if publication_info.get("summary") else "",
                    "abstract": result.get("snippet", ""),
                    "url": result.get("link", ""),
                    "citation_count": result.get("inline_links", {}).get("cited_by", {}).get("total", 0),
                    "relevance_score": self._calculate_relevance(result, query),
                    "doi": None  # SerpAPI doesn't always provide DOI
                }
                articles.append(article)
            
            logger.info(f"Found {len(articles)} articles via SerpAPI for query: {query}")
            return articles
            
        except requests.exceptions.RequestException as e:
            logger.error(f"SerpAPI request failed: {e}")
            return []
        except Exception as e:
            logger.error(f"Failed to parse SerpAPI response: {e}")
            return []
    
    async def search_semantic_scholar(
        self, 
        query: str, 
        max_results: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Search Semantic Scholar API (free, no API key required)
        
        Semantic Scholar provides free access to academic papers.
        API docs: https://api.semanticscholar.org/
        
        Args:
            query: Search query
            max_results: Maximum number of results
            
        Returns:
            List of article metadata dictionaries
        """
        try:
            url = "https://api.semanticscholar.org/graph/v1/paper/search"
            params = {
                "query": query,
                "limit": min(max_results, 100),  # API limit
                "fields": "title,authors,year,venue,abstract,citationCount,externalIds,url"
            }
            
            headers = {
                "User-Agent": "ResearchWorkspace/1.0"
            }
            
            response = requests.get(url, params=params, headers=headers, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            papers = data.get("data", [])
            
            # Transform to our format
            articles = []
            for paper in papers[:max_results]:
                authors_list = paper.get("authors", [])
                authors_str = ", ".join([a.get("name", "") for a in authors_list[:3]])
                if len(authors_list) > 3:
                    authors_str += " et al."
                
                external_ids = paper.get("externalIds", {})
                doi = external_ids.get("DOI")
                
                article = {
                    "title": paper.get("title", ""),
                    "authors": authors_str or "Unknown",
                    "year": paper.get("year"),
                    "venue": paper.get("venue", ""),
                    "abstract": paper.get("abstract", ""),
                    "url": paper.get("url", f"https://www.semanticscholar.org/paper/{paper.get('paperId', '')}"),
                    "citation_count": paper.get("citationCount", 0),
                    "relevance_score": 0.7,  # Semantic Scholar doesn't provide relevance scores
                    "doi": doi
                }
                articles.append(article)
            
            logger.info(f"Found {len(articles)} articles via Semantic Scholar for query: {query}")
            return articles
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Semantic Scholar API request failed: {e}")
            return []
        except Exception as e:
            logger.error(f"Failed to parse Semantic Scholar response: {e}")
            return []
    
    async def search_crossref(
        self, 
        query: str, 
        max_results: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Search CrossRef API (free, no API key required)
        
        CrossRef provides metadata for scholarly works.
        API docs: https://www.crossref.org/documentation/retrieve-metadata/rest-api/
        
        Args:
            query: Search query
            max_results: Maximum number of results
            
        Returns:
            List of article metadata dictionaries
        """
        try:
            url = "https://api.crossref.org/works"
            params = {
                "query": query,
                "rows": min(max_results, 20),
                "select": "title,author,published,container-title,abstract,DOI,is-referenced-by-count,URL"
            }
            
            headers = {
                "User-Agent": "ResearchWorkspace/1.0 (mailto:research@example.com)"
            }
            
            response = requests.get(url, params=params, headers=headers, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            items = data.get("message", {}).get("items", [])
            
            # Transform to our format
            articles = []
            for item in items[:max_results]:
                # Extract authors
                authors_list = item.get("author", [])
                authors_str = ", ".join([
                    f"{a.get('given', '')} {a.get('family', '')}".strip() 
                    for a in authors_list[:3]
                ])
                if len(authors_list) > 3:
                    authors_str += " et al."
                
                # Extract year
                published = item.get("published", {}) or item.get("published-print", {})
                year = published.get("date-parts", [[None]])[0][0] if published else None
                
                # Extract title
                title_list = item.get("title", [])
                title = title_list[0] if title_list else ""
                
                # Extract venue
                venue_list = item.get("container-title", [])
                venue = venue_list[0] if venue_list else ""
                
                article = {
                    "title": title,
                    "authors": authors_str or "Unknown",
                    "year": year,
                    "venue": venue,
                    "abstract": item.get("abstract", ""),
                    "url": item.get("URL", ""),
                    "citation_count": item.get("is-referenced-by-count", 0),
                    "relevance_score": 0.6,  # CrossRef doesn't provide relevance scores
                    "doi": item.get("DOI")
                }
                articles.append(article)
            
            logger.info(f"Found {len(articles)} articles via CrossRef for query: {query}")
            return articles
            
        except requests.exceptions.RequestException as e:
            logger.error(f"CrossRef API request failed: {e}")
            return []
        except Exception as e:
            logger.error(f"Failed to parse CrossRef response: {e}")
            return []
    
    async def search_articles(
        self, 
        query: str, 
        max_results: int = 10,
        provider: str = "auto"
    ) -> List[Dict[str, Any]]:
        """
        Search for articles using the best available provider
        
        Args:
            query: Search query
            max_results: Maximum number of results
            provider: Provider to use ("serpapi", "semantic_scholar", "crossref", "auto")
            
        Returns:
            List of article metadata dictionaries
        """
        # Try providers in order of preference
        if provider == "serpapi" or (provider == "auto" and self.use_serpapi):
            results = await self.search_google_scholar_serpapi(query, max_results)
            if results:
                return results
        
        if provider == "semantic_scholar" or provider == "auto":
            results = await self.search_semantic_scholar(query, max_results)
            if results:
                return results
        
        if provider == "crossref" or provider == "auto":
            results = await self.search_crossref(query, max_results)
            if results:
                return results
        
        logger.warning(f"No results found from any provider for query: {query}")
        return []
    
    def _extract_year(self, text: str) -> Optional[int]:
        """Extract year from text"""
        import re
        match = re.search(r'\b(19|20)\d{2}\b', text)
        return int(match.group(0)) if match else None
    
    def _calculate_relevance(self, result: Dict, query: str) -> float:
        """Calculate relevance score based on result data"""
        # Simple relevance calculation
        # In production, use more sophisticated methods
        score = 0.5
        
        # Boost if query terms in title
        title = result.get("title", "").lower()
        query_terms = query.lower().split()
        matching_terms = sum(1 for term in query_terms if term in title)
        score += (matching_terms / len(query_terms)) * 0.3
        
        # Boost if highly cited
        citations = result.get("inline_links", {}).get("cited_by", {}).get("total", 0)
        if citations > 100:
            score += 0.2
        elif citations > 50:
            score += 0.1
        
        return min(score, 1.0)
