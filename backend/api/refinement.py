"""
Visualization Refinement API

Endpoints for refining visualizations with natural language commands.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from backend.services.refinement_service import get_refinement_service
from backend.utils.logger import get_logger

router = APIRouter(prefix="/refinement", tags=["refinement"])
logger = get_logger(__name__)


class RefinementRequest(BaseModel):
    """Request to refine a visualization"""
    command: str = Field(..., description="Natural language refinement command")
    current_config: Dict[str, Any] = Field(..., description="Current chart configuration")


class RefinementResponse(BaseModel):
    """Response with refined configuration"""
    updates: Dict[str, Any] = Field(..., description="Configuration updates to apply")
    refined_config: Dict[str, Any] = Field(..., description="Complete refined configuration")
    explanation: str = Field(..., description="Explanation of what was changed")


class SuggestionsRequest(BaseModel):
    """Request for refinement suggestions"""
    chart_type: str = Field(..., description="Current chart type")
    data_summary: Dict[str, Any] = Field(default_factory=dict, description="Data summary")


class SuggestionsResponse(BaseModel):
    """Response with refinement suggestions"""
    suggestions: List[str] = Field(..., description="List of suggested refinements")


@router.post("/refine", response_model=RefinementResponse)
async def refine_visualization(request: RefinementRequest):
    """
    Refine a visualization using natural language command
    
    Example commands:
    - "change to bar chart"
    - "hide the legend"
    - "change title to Sales Data"
    - "filter out anomalies"
    - "update x axis label to Month"
    """
    try:
        service = get_refinement_service()
        
        # Parse refinement command
        updates = service.parse_refinement_command(
            request.command,
            request.current_config
        )
        
        # Apply refinement
        refined_config = service.apply_refinement(
            request.current_config,
            updates
        )
        
        # Generate explanation
        explanation = _generate_explanation(updates)
        
        return RefinementResponse(
            updates=updates,
            refined_config=refined_config,
            explanation=explanation
        )
        
    except ValueError as e:
        logger.error(f"Refinement parsing error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Refinement error: {e}")
        raise HTTPException(status_code=500, detail="Failed to refine visualization")


@router.post("/suggestions", response_model=SuggestionsResponse)
async def get_refinement_suggestions(request: SuggestionsRequest):
    """
    Get suggested refinements based on chart type and data
    """
    try:
        service = get_refinement_service()
        
        suggestions = service.suggest_refinements(
            request.chart_type,
            request.data_summary
        )
        
        return SuggestionsResponse(suggestions=suggestions)
        
    except Exception as e:
        logger.error(f"Suggestions error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate suggestions")


def _generate_explanation(updates: Dict[str, Any]) -> str:
    """Generate human-readable explanation of updates"""
    explanations = []
    
    if 'type' in updates:
        explanations.append(f"Changed chart type to {updates['type']}")
    
    if 'title' in updates:
        explanations.append(f"Updated title to '{updates['title']}'")
    
    if 'xAxisLabel' in updates:
        explanations.append(f"Updated X-axis label to '{updates['xAxisLabel']}'")
    
    if 'yAxisLabel' in updates:
        explanations.append(f"Updated Y-axis label to '{updates['yAxisLabel']}'")
    
    if 'showLegend' in updates:
        action = "Showed" if updates['showLegend'] else "Hid"
        explanations.append(f"{action} legend")
    
    if 'showGrid' in updates:
        action = "Showed" if updates['showGrid'] else "Hid"
        explanations.append(f"{action} grid lines")
    
    if 'filterOutliers' in updates:
        if updates['filterOutliers']:
            explanations.append("Enabled outlier filtering")
    
    if 'colorScheme' in updates:
        explanations.append(f"Changed color scheme to {updates['colorScheme']}")
    
    return ". ".join(explanations) + "." if explanations else "Applied refinements"
