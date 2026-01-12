"""API routes for the application."""

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import FileResponse
from typing import Dict, Any

from models import DiagramCreate, DiagramResponse, DiagramsListResponse
from services import diagram_service
from config import STATIC_DIR

import logging

logging.basicConfig(level=logging.INFO)


router = APIRouter()


@router.get("/", response_model=Dict[str, str])
async def root():
    """Root endpoint - serves static file in production or API info in dev."""
    if STATIC_DIR.exists() and (STATIC_DIR / "index.html").exists():
        return FileResponse(str(STATIC_DIR / "index.html"))
    return {"message": "BPMN Collaborator API", "status": "running"}


@router.get("/api/diagrams", response_model=DiagramsListResponse)
async def list_diagrams():
    """List all diagrams."""
    diagrams = diagram_service.get_all_diagrams()
    return DiagramsListResponse(diagrams=diagrams)


@router.get("/api/diagrams/{diagram_id}", response_model=DiagramResponse)
async def get_diagram(diagram_id: str):
    """Get a specific diagram by ID."""
    diagram = diagram_service.get_diagram(diagram_id)
    if not diagram:
        raise HTTPException(status_code=404, detail="Diagram not found")
    return DiagramResponse(**diagram)


@router.post("/api/diagrams", response_model=DiagramResponse, status_code=201)
async def create_diagram(diagram: DiagramCreate):
    """Create a new diagram."""
    new_diagram = diagram_service.create_diagram(
        name=diagram.name, initial_xml=diagram.initial_xml
    )
    return DiagramResponse(**new_diagram)


@router.websocket("/ws/{diagram_id}")
async def websocket_endpoint(websocket: WebSocket, diagram_id: str):
    """WebSocket endpoint for real-time collaboration."""
    await websocket.accept()

    # Get custom user name from query parameters if provided
    custom_user_name = websocket.query_params.get("user_name")

    # Verify diagram exists
    diagram = diagram_service.get_diagram(diagram_id)
    if not diagram:
        await websocket.close(code=1008, reason="Diagram not found")
        return

    # Create user session with optional custom name
    session = diagram_service.create_user_session(
        diagram_id, websocket, custom_user_name
    )
    diagram_service.add_connection(diagram_id, websocket)

    # Notify others of new user
    await _broadcast_user_joined(diagram_id, session.user_name, websocket)
    # Broadcast updated user list to all users
    await _broadcast_user_list_to_all(diagram_id)

    # Send current diagram state
    locks = diagram_service.get_element_locks(diagram_id)
    await websocket.send_json(
        {
            "type": "diagram_state",
            "data": {
                "xml": diagram["xml"],
                "locks": {
                    elem_id: {
                        "user_id": lock.user_id,
                        "user_name": lock.user_name,
                    }
                    for elem_id, lock in locks.items()
                },
                "my_user_name": session.user_name,  # Send the user's own name
            },
        }
    )

    # Send current users
    await _send_user_list(diagram_id, websocket)

    try:
        while True:
            data = await websocket.receive_json()
            message_type = data.get("type")
            logging.info(f"Received message of type: {message_type}")  # Debug print
            if message_type == "diagram_update":
                new_xml = data.get("data", {}).get("xml")
                if new_xml:
                    diagram_service.update_diagram(diagram_id, new_xml)
                    locks = diagram_service.get_element_locks(diagram_id)
                    await _broadcast_to_others(
                        diagram_id,
                        {
                            "type": "diagram_update",
                            "data": {
                                "xml": new_xml,
                                "locks": {
                                    elem_id: {
                                        "user_id": lock.user_id,
                                        "user_name": lock.user_name,
                                    }
                                    for elem_id, lock in locks.items()
                                },
                            },
                            "user": session.user_name,
                        },
                        websocket,
                    )

            elif message_type == "element_lock":
                element_id = data.get("data", {}).get("element_id")
                # Skip root element and invalid IDs
                if (
                    element_id
                    and element_id != "__implicitroot"
                    and not element_id.startswith("__")
                ):
                    # Get previous element locked by this user (before locking new one)
                    previous_locks = diagram_service.get_element_locks(diagram_id)
                    previous_element_id = None
                    for elem_id, lock in previous_locks.items():
                        if lock.user_id == session.user_id and elem_id != element_id:
                            previous_element_id = elem_id
                            break

                    # Lock the new element (this will automatically unlock previous element)
                    diagram_service.lock_element(
                        diagram_id, element_id, session.user_id, session.user_name
                    )

                    # Broadcast unlock for previous element if it existed
                    if previous_element_id:
                        await _broadcast_to_others(
                            diagram_id,
                            {
                                "type": "element_unlocked",
                                "data": {"element_id": previous_element_id},
                            },
                            websocket,
                        )

                    # Broadcast lock for new element
                    await _broadcast_to_others(
                        diagram_id,
                        {
                            "type": "element_locked",
                            "data": {
                                "element_id": element_id,
                                "user_id": session.user_id,
                                "user_name": session.user_name,
                            },
                        },
                        websocket,
                    )

            elif message_type == "element_unlock":
                element_id = data.get("data", {}).get("element_id")
                if element_id:
                    if diagram_service.unlock_element(
                        diagram_id, element_id, session.user_id
                    ):
                        await _broadcast_to_others(
                            diagram_id,
                            {
                                "type": "element_unlocked",
                                "data": {"element_id": element_id},
                            },
                            websocket,
                        )

            elif message_type == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        # Cleanup on disconnect
        diagram_service.remove_connection(diagram_id, websocket)
        await _broadcast_unlock_user_elements(diagram_id, session.user_id, websocket)
        diagram_service.unlock_all_user_elements(diagram_id, session.user_id)
        await _broadcast_user_left(diagram_id, session.user_name, websocket)
        diagram_service.remove_user_session_by_websocket(websocket)
        # Broadcast updated user list to all remaining users
        await _broadcast_user_list_to_all(diagram_id)


async def _broadcast_to_others(
    diagram_id: str, message: Dict[str, Any], sender: WebSocket
) -> None:
    """Broadcast message to all connections except sender."""
    connections = diagram_service.get_connections(diagram_id)
    disconnected = set()

    for connection in connections:
        if connection != sender:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.add(connection)

    # Clean up disconnected connections
    for conn in disconnected:
        diagram_service.remove_connection(diagram_id, conn)
        diagram_service.remove_user_session_by_websocket(conn)


async def _broadcast_user_joined(
    diagram_id: str, user_name: str, sender: WebSocket
) -> None:
    """Notify others that a user joined."""
    await _broadcast_to_others(
        diagram_id, {"type": "user_joined", "data": {"user_name": user_name}}, sender
    )


async def _broadcast_user_left(
    diagram_id: str, user_name: str, sender: WebSocket
) -> None:
    """Notify others that a user left."""
    await _broadcast_to_others(
        diagram_id, {"type": "user_left", "data": {"user_name": user_name}}, sender
    )


async def _send_user_list(diagram_id: str, websocket: WebSocket) -> None:
    """Send list of current users to a websocket."""
    sessions = diagram_service.get_user_sessions_for_diagram(diagram_id)
    users = list(set(session.user_name for session in sessions))

    await websocket.send_json({"type": "user_list", "data": {"users": users}})


async def _broadcast_user_list_to_all(diagram_id: str) -> None:
    """Broadcast updated user list to all connected users."""
    connections = diagram_service.get_connections(diagram_id)
    sessions = diagram_service.get_user_sessions_for_diagram(diagram_id)
    users = list(set(session.user_name for session in sessions))

    message = {"type": "user_list", "data": {"users": users}}

    disconnected = set()
    for connection in connections:
        try:
            await connection.send_json(message)
        except Exception:
            disconnected.add(connection)

    # Clean up disconnected connections
    for conn in disconnected:
        diagram_service.remove_connection(diagram_id, conn)
        diagram_service.remove_user_session_by_websocket(conn)


async def _broadcast_unlock_user_elements(
    diagram_id: str, user_id: str, websocket: WebSocket
) -> None:
    """Broadcast unlock messages for all elements locked by a user."""
    locks = diagram_service.get_element_locks(diagram_id)
    for elem_id, lock in locks.items():
        if lock.user_id == user_id:
            await _broadcast_to_others(
                diagram_id,
                {"type": "element_unlocked", "data": {"element_id": elem_id}},
                websocket,
            )


async def _broadcast_lock_update(diagram_id: str, websocket: WebSocket) -> None:
    """Broadcast lock updates to all users in a diagram."""
    locks = diagram_service.get_element_locks(diagram_id)
    await _broadcast_to_others(
        diagram_id,
        {
            "type": "locks_update",
            "data": {
                "locks": {
                    elem_id: {
                        "user_id": lock.user_id,
                        "user_name": lock.user_name,
                    }
                    for elem_id, lock in locks.items()
                },
            },
        },
        websocket,
    )


# Catch-all route handler for non-existent endpoints
@router.api_route(
    "/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"]
)
async def catch_all(request: Request, path: str):
    """Handle all other routes - serves SPA for GET or 404 for others."""
    # Special handling for GET requests (potential SPA routes)
    if request.method == "GET":
        if STATIC_DIR.exists() and (STATIC_DIR / "index.html").exists():
            # Check if it's an existing file in the static directory
            file_path = STATIC_DIR / path
            if file_path.exists() and file_path.is_file():
                return FileResponse(str(file_path))

            # Only serve index.html for known frontend routes (or root)
            # This ensures that completely random paths get a real 404 status
            is_valid_route = not path or path == "/" or path.startswith("diagram/")

            # Also ensure we don't serve index.html for missed API/WS/Static calls
            is_reserved = (
                path.startswith("api")
                or path.startswith("ws")
                or path.startswith("static")
            )

            if is_valid_route and not is_reserved:
                return FileResponse(str(STATIC_DIR / "index.html"))

            # For unknown paths that are requested by a browser (HTML),
            # serve index.html with a 404 status code to show the "wow" page.
            if "text/html" in request.headers.get("accept", "") and not is_reserved:
                return FileResponse(str(STATIC_DIR / "index.html"), status_code=404)

    # For all other cases, return a 404
    raise HTTPException(status_code=404, detail="Not Found")
