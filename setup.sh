#!/bin/bash

set -e

echo "🚀 Setting up BPMN Collaborator..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "   Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker is installed"
echo "✅ Docker Compose is available"

# Check if Python is installed (for local development if needed)
if command -v python3 &> /dev/null; then
    echo "✅ Python is installed: $(python3 --version)"
fi

# Check if Node.js is installed (for local development if needed)
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge 18 ]; then
        echo "✅ Node.js is installed: $(node -v)"
    else
        echo "⚠️  Node.js version 18 or higher is recommended. Current version: $(node -v)"
    fi
fi

echo ""
echo "📦 Setup complete!"
echo ""
echo "The application will run in Docker containers."
echo ""
echo "To run in development mode:"
echo "  ./run.sh dev"
echo ""
echo "To run in production mode:"
echo "  ./run.sh prod"
echo ""
echo "To run tests:"
echo "  ./run.sh test"

