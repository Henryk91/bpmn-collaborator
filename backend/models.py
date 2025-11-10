"""Pydantic models for request/response validation."""
from pydantic import BaseModel, Field
from typing import Optional


class DiagramCreate(BaseModel):
    """Request model for creating a new diagram."""
    name: str = Field(..., min_length=1, max_length=200, description="Diagram name")
    initial_xml: Optional[str] = Field(None, description="Initial BPMN XML content")


class DiagramResponse(BaseModel):
    """Response model for diagram data."""
    id: str
    name: str
    xml: str
    created_at: str
    updated_at: str


class DiagramListItem(BaseModel):
    """Response model for diagram list item."""
    id: str
    name: str
    created_at: str
    updated_at: str


class DiagramsListResponse(BaseModel):
    """Response model for diagram list."""
    diagrams: list[DiagramListItem]


class ElementLock(BaseModel):
    """Model for element lock information."""
    user_id: str
    user_name: str
    timestamp: str


class UserSession(BaseModel):
    """Model for user session information."""
    user_id: str
    user_name: str
    diagram_id: str
    connected_at: str

