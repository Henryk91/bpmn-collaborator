#!/bin/bash

set -e

MODE=${1:-dev}

if [ "$MODE" != "dev" ] && [ "$MODE" != "prod" ] && [ "$MODE" != "test" ]; then
    echo "Usage: ./run.sh [dev|prod|test]"
    exit 1
fi

echo "🚀 Starting BPMN Collaborator in $MODE mode using Docker..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Use docker compose (newer) or docker-compose (older)
DOCKER_COMPOSE_CMD="docker-compose"
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
fi

if [ "$MODE" == "dev" ]; then
    echo "📦 Building and starting container in development mode..."
    echo ""
    echo "✅ Application will be available at:"
    echo "   Backend: http://localhost:8000"
    echo "   Frontend: http://localhost:3000"
    echo ""
    echo "Press Ctrl+C to stop..."
    echo ""
    
    # Run in interactive mode with docker-compose
    $DOCKER_COMPOSE_CMD -f docker-compose.yml -f docker-compose.dev.yml up --build
elif [ "$MODE" == "prod" ]; then
    echo "📦 Building and starting container in production mode..."
    echo ""
    echo "✅ Application will be available at:"
    echo "   http://localhost:8000"
    echo ""
    echo "Press Ctrl+C to stop..."
    echo ""
    
    # Run in interactive mode with docker-compose
    $DOCKER_COMPOSE_CMD -f docker-compose.yml -f docker-compose.prod.yml up --build
elif [ "$MODE" == "test" ]; then
    echo "🧪 Running tests..."
    echo ""
    
    # Run tests in interactive mode
    $DOCKER_COMPOSE_CMD -f docker-compose.yml -f docker-compose.test.yml up --build --abort-on-container-exit
fi

