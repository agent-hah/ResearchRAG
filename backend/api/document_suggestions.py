"""
Document Suggestions API

Endpoints for generating and managing research article suggestions.
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Optional
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.services.document_suggestion_service import DocumentSuggestionService
from backend.utils.logger import get_logger

router = APIRouter(prefix="/suggestions", tags=["suggestions"])
logger = get_logger(__name__)


# Schemas

class SuggestionResponse(BaseModel):
    """Document suggestion response"""
    id: int
    dataset_id: Optional[int]
    title: str
    authors: Optional[str]
    publication_year: Optional[int]
    publication_venue: Optional[str]
    abstract: Optional[str]
    snippet: Optional[str]
    url: Optional[str]
    pdf_url: Optional[str]
    doi: Optional[str]
    relevance_score: Optional[float]
    search_query: Optional[str]
    is_relevant: Optional[bool]
    is_imported: bool
    is_dismissed: bool
    citation_count: Optional[int]
    created_at: str
    
    class Config:
        from_attributes = True


class GenerateSuggestionsRequest(BaseModel):
    """Request to generate suggestions"""
    dataset_id: int = Field(..., description="Dataset ID to analyze")
    max_per_keyword: int = Field(default=3, description="Max suggestions per keyword")


class UpdateFeedbackRequest(BaseModel):
    """Request to update suggestion feedback"""
    is_relevant: Optional[bool] = Field(default=None, description="Mark as relevant")
    is_dismissed: Optional[bool] = Field(default=None, description="Mark as dismissed")
    is_imported: Optional[bool] = Field(default=None, description="Mark as imported")


class KeywordsResponse(BaseModel):
    """Keywords extraction response"""
    dataset_id: int
    keywords: List[str]


# Endpoints

@router.post("/generate", response_model=dict)
async def generate_suggestions(
    request: GenerateSuggestionsRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Generate article suggestions for a dataset
    
    This endpoint analyzes the dataset and generates research article suggestions
    in the background. The suggestions will be available via the GET endpoint.
    """
    try:
        service = DocumentSuggestionService(db)
        
        # Start generation in background
        background_tasks.add_task(
            service.generate_suggestions_for_dataset,
            request.dataset_id,
            request.max_per_keyword
        )
        
        logger.info(f"Started suggestion generation for dataset {request.dataset_id}")
        
        return {
            "success": True,
            "message": "Suggestion generation started",
            "dataset_id": request.dataset_id
        }
        
    except Exception as e:
        logger.error(f"Failed to start suggestion generation: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate suggestions")


@router.get("/dataset/{dataset_id}", response_model=List[SuggestionResponse])
async def get_dataset_suggestions(
    dataset_id: int,
    include_dismissed: bool = False,
    db: Session = Depends(get_db)
):
    """
    Get all suggestions for a dataset
    
    Returns suggestions ordered by relevance score (highest first).
    """
    try:
        service = DocumentSuggestionService(db)
        suggestions = service.get_suggestions_for_dataset(dataset_id, include_dismissed)
        
        return [
            SuggestionResponse(
                id=s.id,
                dataset_id=s.dataset_id,
                title=s.title,
                authors=s.authors,
                publication_year=s.publication_year,
                publication_venue=s.publication_venue,
                abstract=s.abstract,
                snippet=s.snippet,
                url=s.url,
                pdf_url=s.pdf_url,
                doi=s.doi,
                relevance_score=s.relevance_score,
                search_query=s.search_query,
                is_relevant=s.is_relevant,
                is_imported=s.is_imported,
                is_dismissed=s.is_dismissed,
                citation_count=s.citation_count,
                created_at=s.created_at.isoformat()
            )
            for s in suggestions
        ]
        
    except Exception as e:
        logger.error(f"Failed to get suggestions for dataset {dataset_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get suggestions")


@router.get("/dataset/{dataset_id}/keywords", response_model=KeywordsResponse)
async def get_dataset_keywords(dataset_id: int, db: Session = Depends(get_db)):
    """
    Extract research keywords from a dataset
    
    Analyzes the dataset and returns keywords that would be used for article search.
    """
    try:
        service = DocumentSuggestionService(db)
        keywords = await service.analyze_dataset_for_keywords(dataset_id)
        
        return KeywordsResponse(
            dataset_id=dataset_id,
            keywords=keywords
        )
        
    except Exception as e:
        logger.error(f"Failed to extract keywords for dataset {dataset_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to extract keywords")


@router.put("/{suggestion_id}/feedback", response_model=SuggestionResponse)
async def update_suggestion_feedback(
    suggestion_id: int,
    feedback: UpdateFeedbackRequest,
    db: Session = Depends(get_db)
):
    """
    Update user feedback for a suggestion
    
    Allows marking suggestions as relevant, dismissed, or imported.
    """
    try:
        service = DocumentSuggestionService(db)
        suggestion = service.update_suggestion_feedback(
            suggestion_id,
            is_relevant=feedback.is_relevant,
            is_dismissed=feedback.is_dismissed,
            is_imported=feedback.is_imported
        )
        
        return SuggestionResponse(
            id=suggestion.id,
            dataset_id=suggestion.dataset_id,
            title=suggestion.title,
            authors=suggestion.authors,
            publication_year=suggestion.publication_year,
            publication_venue=suggestion.publication_venue,
            abstract=suggestion.abstract,
            snippet=suggestion.snippet,
            url=suggestion.url,
            pdf_url=suggestion.pdf_url,
            doi=suggestion.doi,
            relevance_score=suggestion.relevance_score,
            search_query=suggestion.search_query,
            is_relevant=suggestion.is_relevant,
            is_imported=suggestion.is_imported,
            is_dismissed=suggestion.is_dismissed,
            citation_count=suggestion.citation_count,
            created_at=suggestion.created_at.isoformat()
        )
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to update feedback for suggestion {suggestion_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update feedback")


@router.delete("/dataset/{dataset_id}")
async def delete_dataset_suggestions(dataset_id: int, db: Session = Depends(get_db)):
    """
    Delete all suggestions for a dataset
    
    Useful when regenerating suggestions or cleaning up.
    """
    try:
        service = DocumentSuggestionService(db)
        count = service.delete_suggestions_for_dataset(dataset_id)
        
        return {
            "success": True,
            "message": f"Deleted {count} suggestions",
            "count": count
        }
        
    except Exception as e:
        logger.error(f"Failed to delete suggestions for dataset {dataset_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete suggestions")


@router.get("/{suggestion_id}", response_model=SuggestionResponse)
async def get_suggestion(suggestion_id: int, db: Session = Depends(get_db)):
    """Get a specific suggestion by ID"""
    try:
        from backend.models.document_suggestion import DocumentSuggestion
        
        suggestion = db.query(DocumentSuggestion).filter(
            DocumentSuggestion.id == suggestion_id
        ).first()
        
        if not suggestion:
            raise HTTPException(status_code=404, detail="Suggestion not found")
        
        return SuggestionResponse(
            id=suggestion.id,
            dataset_id=suggestion.dataset_id,
            title=suggestion.title,
            authors=suggestion.authors,
            publication_year=suggestion.publication_year,
            publication_venue=suggestion.publication_venue,
            abstract=suggestion.abstract,
            snippet=suggestion.snippet,
            url=suggestion.url,
            pdf_url=suggestion.pdf_url,
            doi=suggestion.doi,
            relevance_score=suggestion.relevance_score,
            search_query=suggestion.search_query,
            is_relevant=suggestion.is_relevant,
            is_imported=suggestion.is_imported,
            is_dismissed=suggestion.is_dismissed,
            citation_count=suggestion.citation_count,
            created_at=suggestion.created_at.isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get suggestion {suggestion_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get suggestion")
