"""
Common Pydantic schemas
"""
from pydantic import BaseModel
from typing import Any, Optional


class SuccessResponse(BaseModel):
    """
    Standard success response schema
    """
    success: bool = True
    message: str
    data: Optional[Any] = None


class ErrorResponse(BaseModel):
    """
    Standard error response schema
    """
    success: bool = False
    error: str
    detail: Optional[str] = None
