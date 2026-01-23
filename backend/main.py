"""Main application entry point."""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn

from config import (
    APP_TITLE,
    APP_VERSION,
    CORS_ORIGINS,
    STATIC_DIR,
    STATIC_ASSETS_DIR,
    PORT,
    HOST,
)
from routes import router
from services import diagram_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Seed the database with examples if it's new/empty
    diagram_service.seed_database()
    yield


# Create FastAPI app
app = FastAPI(
    title=APP_TITLE,
    version=APP_VERSION,
    description="Real-time collaborative BPMN diagram editor",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global 404 handler for any non-existent endpoints
@app.exception_handler(404)
async def custom_404_handler(request: Request, exc: HTTPException):
    """Custom handler for 404 errors to provide consistent JSON response."""
    return JSONResponse(
        status_code=404,
        content={"detail": "Not Found"},
    )


# Serve built frontend assets (the React build keeps JS/CSS under ./static)
if STATIC_ASSETS_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_ASSETS_DIR)), name="static")
elif STATIC_DIR.exists():
    # Fallback in case the build output is copied directly without the nested folder
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# Include routes
app.include_router(router)

if __name__ == "__main__":
    uvicorn.run(app, host=HOST, port=PORT)
