"""
Document Suggestion Service

Analyzes datasets and suggests relevant research articles using OpenAlex/Search API.
"""
import re
import logging
from typing import List, Dict, Any, Optional

from google import genai
from google.genai import types
from django.conf import settings
from rag.models import Dataset
from query.models import DocumentSuggestion
from query.services.search_api_service import SearchAPIService

logger = logging.getLogger(__name__)

class DocumentSuggestionService:
    """
    Service for generating and managing document suggestions
    """
    
    def __init__(self, user_id=None):
        self.user_id = user_id
        self.client = genai.Client(
            api_key=settings.GOOGLE_API_KEY,
            http_options={'timeout': 120000.0}
        )
        self.system_instruction = "You are a helpful research assistant. Respond safely and accurately without generating harmful content."
        self.safety_settings = [
            types.SafetySetting(category="HARM_CATEGORY_HARASSMENT", threshold="BLOCK_NONE"),
            types.SafetySetting(category="HARM_CATEGORY_HATE_SPEECH", threshold="BLOCK_NONE"),
            types.SafetySetting(category="HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold="BLOCK_NONE"),
            types.SafetySetting(category="HARM_CATEGORY_DANGEROUS_CONTENT", threshold="BLOCK_NONE")
        ]
        self.model_name = settings.GEMINI_MODEL
        self.search_api = SearchAPIService()
        
    def _extract_text(self, response) -> str:
        """Safely extract text from a Gemini response."""
        try:
            return response.text
        except ValueError:
            if not hasattr(response, 'candidates') or not response.candidates:
                return ""
            candidate = response.candidates[0]
            if not hasattr(candidate, 'content') or not hasattr(candidate.content, 'parts'):
                return ""
            return "".join(part.text for part in candidate.content.parts if hasattr(part, 'text'))
            
    def _generate_with_retry(self, prompt: str, is_json: bool = False) -> Any:
        """Generate content with retries for transient errors and extended timeout."""
        import time
        max_retries = 3
        for attempt in range(max_retries):
            try:
                config = types.GenerateContentConfig(
                    system_instruction=self.system_instruction,
                    safety_settings=self.safety_settings,
                )
                if is_json:
                    config.response_mime_type = "application/json"
                    
                return self.client.models.generate_content(
                    model=self.model_name,
                    contents=prompt,
                    config=config
                )
            except Exception as e:
                error_msg = str(e).lower()
                if getattr(e, 'code', None) == 429 or "429" in error_msg or "resource_exhausted" in error_msg:
                    logger.warning(f"Rate limit hit on {self.model_name}, trying fallbacks")
                    fallback_success = False
                    for fallback_model in ["gemini-3.1-flash-lite", "gemma-4-26b-a4b-it"]:
                        try:
                            return self.client.models.generate_content(
                                model=fallback_model,
                                contents=prompt,
                                config=config
                            )
                        except Exception as fallback_e:
                            fallback_error_msg = str(fallback_e).lower()
                            if getattr(fallback_e, 'code', None) == 429 or "429" in fallback_error_msg or "resource_exhausted" in fallback_error_msg:
                                logger.warning(f"Rate limit hit on fallback {fallback_model}")
                                continue
                            if attempt == max_retries - 1:
                                raise fallback_e
                            logger.warning(f"Gemini API fallback error (attempt {attempt+1}): {fallback_e}. Retrying...")
                            time.sleep(2 ** (attempt + 1))
                            fallback_success = True
                            break
                    if not fallback_success:
                        if attempt == max_retries - 1:
                            raise e
                        logger.warning(f"All fallbacks exhausted (attempt {attempt+1}). Retrying...")
                        time.sleep(2 ** (attempt + 1))
                elif "504" in error_msg or "deadline" in error_msg or "503" in error_msg or "timeout" in error_msg or "500" in error_msg or "internal" in error_msg:
                    if attempt == max_retries - 1:
                        raise e
                    logger.warning(f"Gemini API timeout/error (attempt {attempt+1}): {e}. Retrying...")
                    time.sleep(2 ** (attempt + 1))
                else:
                    raise e

    def analyze_dataset_for_keywords(self, dataset_ids: Optional[List[int]] = None) -> List[str]:
        """
        Analyze datasets (if provided) and research context to extract key terms
        
        Args:
            dataset_ids: Dataset IDs to analyze (optional)
            
        Returns:
            List of search keywords/phrases
        """
        try:
            from notes.models import Note
            from literature.models import Literature
            import json
            
            columns = []
            dataset_name = "Global Research Context"
            
            if dataset_ids:
                # Get datasets
                datasets = Dataset.objects.filter(id__in=dataset_ids)
                if self.user_id:
                    datasets = datasets.filter(user_id=self.user_id)
                if not datasets:
                    raise ValueError(f"Datasets {dataset_ids} not found")
                dataset_names = [d.filename for d in datasets]
                dataset_name = ", ".join(dataset_names)
                for d in datasets:
                    try:
                        cols = json.loads(d.columns_json) if d.columns_json else []
                        columns.extend(cols)
                    except Exception:
                        pass
            
            # Fetch contextual information
            
            # 1. Notes
            if dataset_ids:
                note_qs = Note.objects.filter(dataset_id__in=dataset_ids)
            else:
                note_qs = Note.objects.all()
                
            if self.user_id:
                note_qs = note_qs.filter(user_id=self.user_id)
            recent_notes = note_qs.order_by('-created_at')[:10 if dataset_ids else 5]
            note_texts = [n.content[:200] for n in recent_notes if n.content]
            
            # 2. Uploaded literature
            lit_qs = Literature.objects.all()
            if self.user_id:
                lit_qs = lit_qs.filter(user_id=self.user_id)
            recent_literature = lit_qs.order_by('-created_at')[:5]
            literature_titles = [l.filename for l in recent_literature if l.filename]
            
            if not dataset_ids and not literature_titles and not note_texts:
                logger.warning("No context available to generate suggestions")
                return []
            
            # Build context section
            context_section = ""
            if note_texts:
                context_section += "\nRecent Notes:\n- " + "\n- ".join(note_texts)
            if literature_titles:
                context_section += "\n\nUploaded Literature:\n- " + "\n- ".join(literature_titles)
            
            dataset_info = ""
            if dataset_ids:
                dataset_info = f"Datasets: {dataset_name}\nColumns: {', '.join(columns)}"
            
            # Create analysis prompt
            prompt = f"""{self.system_instruction}

Analyze the following research context to extract 3-5 discrete, highly specific keywords, technical terms, or exact entities present in the data. Do NOT invent or hallucinate general topics. 

{dataset_info}
{context_section}

Generate keywords that are:
1. Discrete, specific technical terms extracted directly from the dataset columns, notes, or literature titles.
2. Suitable for exact-match academic paper search.
3. Not broad or generic. Avoid terms like "analysis", "data", or "research".

Return the result STRICTLY as a valid JSON object with a single field "keywords" containing a list of strings. Do not include your internal thoughts or reasoning. Example:
{{"keywords": ["term1", "term2", "term3"]}}"""

            # Generate keywords using Gemini
            response = self._generate_with_retry(prompt, is_json=True)
            keywords_text = self._extract_text(response).strip()
            
            # Extract JSON from response (handle potential markdown code blocks if the model ignores the mime type)
            if '```json' in keywords_text:
                json_start = keywords_text.find('```json') + 7
                json_end = keywords_text.find('```', json_start)
                keywords_text = keywords_text[json_start:json_end].strip()
            elif '```' in keywords_text:
                json_start = keywords_text.find('```') + 3
                json_end = keywords_text.find('```', json_start)
                keywords_text = keywords_text[json_start:json_end].strip()
            
            try:
                data = json.loads(keywords_text)
                cleaned_keywords = data.get("keywords", [])
                
                # Further sanitize the keywords list
                if not isinstance(cleaned_keywords, list):
                    cleaned_keywords = []
                    
                cleaned_keywords = [kw for kw in cleaned_keywords if isinstance(kw, str) and kw.strip()]
            except json.JSONDecodeError:
                logger.error(f"Failed to parse JSON for keywords: {keywords_text}")
                cleaned_keywords = []
            
            logger.info(f"Generated {len(cleaned_keywords)} keywords for datasets {dataset_ids}")
            return cleaned_keywords[:5]  # Limit to 5 keywords
            
        except Exception as e:
            logger.error(f"Failed to analyze datasets {dataset_ids}: {e}")
            return []
    
    async def search_articles(
        self, 
        query: str, 
        max_results: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Search for academic articles using real search APIs
        
        Uses SearchAPIService which supports:
        - OpenAlex - free, no API key required
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
            prompt = f"""{self.system_instruction}

Generate {max_results} realistic academic paper suggestions for the research query: "{query}"

For each paper, provide:
- Title (realistic academic paper title)
- Authors (2-4 author names)
- Year (2015-2024)
- Venue (journal or conference name)
- Abstract (2-3 sentence summary)
- Relevance score (0.0-1.0)

Format as JSON array with fields: title, authors, year, venue, abstract, relevance_score

Return ONLY valid JSON, no additional text."""

            response = self._generate_with_retry(prompt, is_json=True)
            response_text = self._extract_text(response).strip()
            
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
    def generate_suggestions_for_dataset(
        self, 
        dataset_ids: Optional[List[int]] = None,
        max_per_keyword: int = 3
    ) -> List[DocumentSuggestion]:
        """
        Generate article suggestions for datasets or general context
        
        Args:
            dataset_ids: Dataset IDs (optional)
            max_per_keyword: Maximum suggestions per keyword
            
        Returns:
            List of DocumentSuggestion objects
        """
        from django.core.cache import cache
        cache_id = ",".join(map(str, dataset_ids)) if dataset_ids else "global"
        cache_key = f"suggestion_progress_{cache_id}"
        
        try:
            cache.set(cache_key, {"status": "Analyzing research context for keywords...", "progress": 10}, timeout=3600)
            
            # Get keywords
            keywords = self.analyze_dataset_for_keywords(dataset_ids)
            if not keywords:
                logger.warning(f"No keywords generated for datasets {dataset_ids}")
                cache.set(cache_key, {"status": "Failed: No keywords generated", "progress": 0}, timeout=60)
                return []
            
            cache.set(cache_key, {"status": f"Found {len(keywords)} keywords. Starting search...", "progress": 20}, timeout=3600)
            
            # Search for articles for each keyword
            from asgiref.sync import async_to_sync
            all_suggestions = []
            
            total_keywords = len(keywords)
            for i, keyword in enumerate(keywords):
                # Update progress based on keywords processed (from 20% to 90%)
                progress = 20 + int(70 * (i / total_keywords))
                cache.set(cache_key, {"status": f"Searching articles for '{keyword}'...", "progress": progress}, timeout=3600)
                
                articles = async_to_sync(self.search_articles)(keyword, max_results=max_per_keyword)
                
                for article in articles:
                    primary_dataset_id = dataset_ids[0] if dataset_ids else None
                    # Create suggestion
                    suggestion = DocumentSuggestion(
                        user_id=self.user_id or 'default',
                        dataset_id=primary_dataset_id,
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
                    
                    suggestion.save()
                    all_suggestions.append(suggestion)
            
            cache.set(cache_key, {"status": "Completed successfully", "progress": 100}, timeout=60)
            logger.info(f"Generated {len(all_suggestions)} suggestions for context/datasets {dataset_ids}")
            return all_suggestions
            
        except Exception as e:
            cache.set(cache_key, {"status": f"Error: {str(e)}", "progress": 0}, timeout=60)
            logger.error(f"Failed to generate suggestions for context/datasets {dataset_ids}: {e}")
            raise
    
    def get_suggestions_for_dataset(
        self, 
        dataset_id: Optional[int] = None,
        include_dismissed: bool = False
    ) -> List[DocumentSuggestion]:
        """
        Get existing suggestions for a dataset or general context
        
        Args:
            dataset_id: Dataset ID (optional)
            include_dismissed: Whether to include dismissed suggestions
            
        Returns:
            List of DocumentSuggestion objects
        """
        query = DocumentSuggestion.objects.filter(dataset_id=dataset_id)
        
        if not include_dismissed:
            query = query.filter(is_dismissed=False)
        
        return list(query.order_by('-relevance_score'))
    
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
        suggestion = DocumentSuggestion.objects.filter(id=suggestion_id).first()
        
        if not suggestion:
            raise ValueError(f"Suggestion {suggestion_id} not found")
        
        if is_relevant is not None:
            suggestion.is_relevant = is_relevant
        
        if is_dismissed is not None:
            suggestion.is_dismissed = is_dismissed
        
        if is_imported is not None:
            suggestion.is_imported = is_imported
        
        suggestion.save()
        
        logger.info(f"Updated feedback for suggestion {suggestion_id}")
        return suggestion
    
    def delete_suggestions_for_dataset(self, dataset_id: Optional[int] = None) -> int:
        """
        Delete all suggestions for a dataset or general context
        
        Args:
            dataset_id: Dataset ID (optional)
            
        Returns:
            Number of suggestions deleted
        """
        qs = DocumentSuggestion.objects.filter(dataset_id=dataset_id)
        if self.user_id:
            qs = qs.filter(user_id=self.user_id)
        count, _ = qs.delete()
        
        logger.info(f"Deleted {count} suggestions for context/dataset {dataset_id}")
        return count
