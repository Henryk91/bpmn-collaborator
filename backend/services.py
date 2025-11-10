"""Business logic and services for diagram management and WebSocket handling."""
from typing import Dict, Set, Optional
from datetime import datetime
import uuid
from fastapi import WebSocket

from models import ElementLock, UserSession
from config import EXAMPLE_DIAGRAMS, DEFAULT_DIAGRAM_XML


class DiagramService:
    """Service for managing diagrams in memory."""
    
    def __init__(self):
        self._diagrams: Dict[str, dict] = {}
        self._active_connections: Dict[str, Set[WebSocket]] = {}
        self._user_sessions: Dict[str, UserSession] = {}
        self._websocket_to_session: Dict[WebSocket, str] = {}  # websocket -> session_id
        self._element_locks: Dict[str, Dict[str, ElementLock]] = {}
    
    def initialize_examples(self) -> None:
        """Initialize example diagrams."""
        for i, example in enumerate(EXAMPLE_DIAGRAMS):
            diagram_id = f"example-{i+1}"
            self._diagrams[diagram_id] = {
                "id": diagram_id,
                "name": example["name"],
                "xml": example["xml"],
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
            }
            self._active_connections[diagram_id] = set()
            self._element_locks[diagram_id] = {}
    
    def get_all_diagrams(self) -> list[dict]:
        """Get list of all diagrams."""
        return [
            {
                "id": d["id"],
                "name": d["name"],
                "created_at": d["created_at"],
                "updated_at": d["updated_at"],
            }
            for d in self._diagrams.values()
        ]
    
    def get_diagram(self, diagram_id: str) -> Optional[dict]:
        """Get a specific diagram by ID."""
        return self._diagrams.get(diagram_id)
    
    def create_diagram(self, name: str, initial_xml: Optional[str] = None) -> dict:
        """Create a new diagram."""
        diagram_id = str(uuid.uuid4())
        diagram = {
            "id": diagram_id,
            "name": name,
            "xml": initial_xml or DEFAULT_DIAGRAM_XML,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
        }
        self._diagrams[diagram_id] = diagram
        self._active_connections[diagram_id] = set()
        self._element_locks[diagram_id] = {}
        return diagram
    
    def update_diagram(self, diagram_id: str, xml: str) -> bool:
        """Update diagram XML content."""
        if diagram_id not in self._diagrams:
            return False
        self._diagrams[diagram_id]["xml"] = xml
        self._diagrams[diagram_id]["updated_at"] = datetime.now().isoformat()
        return True
    
    def add_connection(self, diagram_id: str, websocket: WebSocket) -> None:
        """Add a WebSocket connection for a diagram."""
        if diagram_id not in self._active_connections:
            self._active_connections[diagram_id] = set()
        self._active_connections[diagram_id].add(websocket)
    
    def remove_connection(self, diagram_id: str, websocket: WebSocket) -> None:
        """Remove a WebSocket connection for a diagram."""
        if diagram_id in self._active_connections:
            self._active_connections[diagram_id].discard(websocket)
        # Clean up disconnected connections from the mapping
        if websocket in self._websocket_to_session:
            # Remove session will be handled separately
            pass
    
    def get_connections(self, diagram_id: str) -> Set[WebSocket]:
        """Get all active connections for a diagram."""
        return self._active_connections.get(diagram_id, set())
    
    def create_user_session(
        self, diagram_id: str, websocket: WebSocket, custom_user_name: str | None = None
    ) -> UserSession:
        """Create a new user session."""
        user_id = str(uuid.uuid4())
        # Use custom name if provided, otherwise generate one
        if custom_user_name and custom_user_name.strip():
            user_name = custom_user_name.strip()[:30]  # Limit to 30 characters
        else:
            user_name = f"User_{user_id[:8]}"
        session_id = f"{user_id}_{datetime.now().timestamp()}"
        
        session = UserSession(
            user_id=user_id,
            user_name=user_name,
            diagram_id=diagram_id,
            connected_at=datetime.now().isoformat(),
        )
        self._user_sessions[session_id] = session
        self._websocket_to_session[websocket] = session_id
        return session
    
    def remove_user_session(self, session_id: str) -> None:
        """Remove a user session."""
        if session_id in self._user_sessions:
            del self._user_sessions[session_id]
    
    def remove_user_session_by_websocket(self, websocket: WebSocket) -> None:
        """Remove a user session by WebSocket connection."""
        if websocket in self._websocket_to_session:
            session_id = self._websocket_to_session[websocket]
            if session_id in self._user_sessions:
                del self._user_sessions[session_id]
            del self._websocket_to_session[websocket]
    
    def get_user_sessions_for_diagram(self, diagram_id: str) -> list[UserSession]:
        """Get all user sessions for a diagram with active connections."""
        active_connections = self._active_connections.get(diagram_id, set())
        active_sessions = []
        
        for websocket in active_connections:
            if websocket in self._websocket_to_session:
                session_id = self._websocket_to_session[websocket]
                if session_id in self._user_sessions:
                    session = self._user_sessions[session_id]
                    if session.diagram_id == diagram_id:
                        active_sessions.append(session)
        
        return active_sessions
    
    def lock_element(
        self, diagram_id: str, element_id: str, user_id: str, user_name: str
    ) -> None:
        """Lock an element for a user. Automatically unlocks previous element locked by the same user."""
        if diagram_id not in self._element_locks:
            self._element_locks[diagram_id] = {}
        
        # Unlock any previous element locked by this user
        elements_to_remove = [
            elem_id
            for elem_id, lock in self._element_locks[diagram_id].items()
            if lock.user_id == user_id and elem_id != element_id
        ]
        for elem_id in elements_to_remove:
            del self._element_locks[diagram_id][elem_id]
        
        # Lock the new element
        self._element_locks[diagram_id][element_id] = ElementLock(
            user_id=user_id,
            user_name=user_name,
            timestamp=datetime.now().isoformat(),
        )
    
    def unlock_element(self, diagram_id: str, element_id: str, user_id: str) -> bool:
        """Unlock an element if locked by the user."""
        if diagram_id not in self._element_locks:
            return False
        
        if element_id in self._element_locks[diagram_id]:
            lock = self._element_locks[diagram_id][element_id]
            if lock.user_id == user_id:
                del self._element_locks[diagram_id][element_id]
                return True
        return False
    
    def unlock_all_user_elements(self, diagram_id: str, user_id: str) -> None:
        """Unlock all elements locked by a user."""
        if diagram_id not in self._element_locks:
            return
        
        elements_to_remove = [
            elem_id
            for elem_id, lock in self._element_locks[diagram_id].items()
            if lock.user_id == user_id
        ]
        for elem_id in elements_to_remove:
            del self._element_locks[diagram_id][elem_id]
    
    def get_element_locks(self, diagram_id: str) -> Dict[str, ElementLock]:
        """Get all element locks for a diagram."""
        return self._element_locks.get(diagram_id, {})


# Global service instance
diagram_service = DiagramService()

