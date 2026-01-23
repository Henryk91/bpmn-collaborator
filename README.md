# BPMN Collaborator

A real-time collaborative BPMN diagram editor built with FastAPI and React TypeScript. Multiple users can edit BPMN diagrams simultaneously with live synchronization, element locking, and online user indicators.

A running demo can be found at https://bpmn-collaborator.henryk.co.za

## Features

- 🎨 **BPMN Diagram Editor**: Full-featured BPMN editor powered by bpmn-js
- 👥 **Real-time Collaboration**: Live synchronization of diagram changes across all connected users
- 🔒 **Element Locking**: Visual indicators when another user is editing a BPMN element
- 👤 **Online Users**: See who's currently viewing/editing the diagram
- 📋 **Diagram Management**: Create new diagrams and manage existing ones
- 🔗 **Share Functionality**: Easy sharing via URL links
- 📦 **3 Example Diagrams**: Pre-loaded example diagrams to get started quickly

## Tech Stack

### Backend

- **FastAPI**: Modern Python web framework
- **WebSockets**: Real-time bidirectional communication
- **Uvicorn**: ASGI server

### Frontend

- **React 18**: UI library
- **TypeScript**: Type-safe JavaScript
- **bpmn-js**: BPMN diagram modeling library
- **React Router**: Client-side routing

## Prerequisites

- **Docker** and **Docker Compose** (required for running the application)
- Python 3.11 or higher (optional - for local development)
- Node.js 18.0.0 or higher (optional - for local development)
- npm 9.0.0 or higher (optional - for local development)

## Quick Start

### 1. Setup

Run the setup script to verify Docker is installed:

```bash
chmod +x setup.sh
./setup.sh
```

This will check that Docker and Docker Compose are installed and ready to use.

### 2. Run in Development Mode

```bash
chmod +x run.sh
./run.sh dev
```

This starts a single Docker container with:

- Backend API at `http://localhost:8000`
- Frontend dev server at `http://localhost:3000`

Open `http://localhost:3000` in your browser.

The container runs in interactive mode - you'll see logs from both services. Press `Ctrl+C` to stop.

### 3. Run in Production Mode

```bash
./run.sh prod
```

This builds the frontend and serves it through the FastAPI backend in a single Docker container at `http://localhost:8000`.

The container runs in interactive mode - press `Ctrl+C` to stop.

### 4. Run Tests

```bash
./run.sh test
```

This runs all tests (backend and frontend) in a Docker container. The container will exit after tests complete.

## Manual Setup

If you prefer to set up manually:

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Database & Migrations

- **PostgreSQL**: Relational database for persistent storage (e.g. Neon, AWS RDS)
- **SQLAlchemy**: SQL Toolkit and ORM
- **Alembic**: Database migrations management

## Database Setup

1. **Environment Variables**: Create a `.env` file in the `backend/` directory (see `.env.example`):

   ```env
   DATABASE_URL=postgresql://user:password@host:port/dbname?sslmode=require
   ```

2. **Run Migrations**:
   Migrations are managed via Alembic. To apply migrations to your database:

   ```bash
   cd backend
   ./venv/bin/python3 -m alembic upgrade head
   ```

3. **Generate New Migrations**:
   If you modify the models in `backend/models.py`, generate a new migration script:
   ```bash
   cd backend
   ./venv/bin/python3 -m alembic revision --autogenerate -m "description of changes"
   ```

## Environment Configuration

For production:

```env
PORT=8000
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com
ENVIRONMENT=production
```

### Frontend Environment Files

Create `.env.dev` or `.env.prod` in the `frontend/` directory:

```env
VITE_API_URL=http://localhost:8000
```

For production, update with your backend URL:

```env
VITE_API_URL=https://api.yourdomain.com
```

## Docker Deployment

The application runs in Docker containers by default. The `run.sh` script handles all Docker operations.

### Development Mode

Runs a single container with both backend and frontend:

- Backend with hot reload
- Frontend with hot reload
- Volume mounts for live code changes

```bash
./run.sh dev
```

### Production Mode

Runs a single container with built frontend:

- Backend serves static files
- Optimized production build

```bash
./run.sh prod
```

### Test Mode

Runs tests in a container:

- Backend tests (pytest)
- Frontend tests (npm test)

```bash
./run.sh test
```

### Manual Docker Commands

If you prefer to use Docker directly:

**Development:**

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

**Production:**

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up --build
```

**Tests:**

```bash
docker-compose -f docker-compose.yml -f docker-compose.test.yml up --build
```

## Deploy to Heroku (Eco Dyno)

The repository contains a `heroku.yml` file so the Heroku build system can build the existing Dockerfile and run the application inside a dyno. The steps below provision an Eco tier dyno that runs the production container (same image that `run.sh prod` creates):

1. **Create or target an app that uses the container stack**
   ```bash
   heroku login
   heroku create <your-app-name> --stack=container
   # or, for an existing app:
   heroku stack:set container -a <your-app-name>
   ```
2. **Configure runtime environment variables** (adjust allowed origins as needed).
   ```bash
   heroku config:set \
     ENVIRONMENT=production \
     CORS_ORIGINS=https://<your-app-name>.herokuapp.com \
     -a <your-app-name>
   ```
   Heroku automatically injects `PORT`; the backend already defaults to `0.0.0.0` so no change is required. The frontend is bundled into the image at build time, so no `VITE_API_URL` is necessary if the UI is served from the same origin.
3. **Deploy using git**. With `heroku.yml` in place, a regular git push triggers the Docker build (the multi-stage build runs `npm ci`, `npm run build`, and installs Python dependencies exactly like `run.sh prod`).
   ```bash
   git push heroku main
   ```
4. **Scale the dyno to the Eco plan and verify**.
   ```bash
   heroku ps:scale web=1 --type=eco -a <your-app-name>
   heroku open -a <your-app-name>
   heroku logs --tail -a <your-app-name>  # optional: follow logs
   ```

When you need to deploy updates, commit your changes locally and run another `git push heroku main`. Heroku rebuilds the container image and restarts the Eco dyno with the new version.

## Project Structure

```
bpmn-collaborator/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── routes.py            # API routes
│   ├── services.py          # Business logic
│   ├── models.py            # Pydantic models
│   ├── config.py            # Configuration
│   ├── requirements.txt     # Python dependencies
│   ├── tests/               # Backend tests
│   │   └── test_health.py   # Simple health check test
│   └── .env.dev/.env.prod   # Environment configuration
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── DiagramList.tsx
│   │   │   └── DiagramEditor.tsx
│   │   ├── hooks/           # Custom React hooks
│   │   │   └── useWebSocket.ts
│   │   ├── utils/           # Utility functions
│   │   │   └── api.ts
│   │   ├── App.tsx          # Main app component
│   │   └── main.tsx        # Entry point
│   ├── public/              # Static assets
│   └── package.json         # Node dependencies
├── Dockerfile               # Production Dockerfile
├── Dockerfile.dev           # Development Dockerfile
├── Dockerfile.test          # Test Dockerfile
├── docker-compose.yml       # Base Docker Compose config
├── docker-compose.dev.yml   # Development overrides
├── docker-compose.prod.yml  # Production overrides
├── docker-compose.test.yml  # Test overrides
├── setup.sh                 # Setup script
├── run.sh                   # Run script (dev/prod/test)
└── README.md                # This file
```

## API Endpoints

### REST API

- `GET /api/diagrams` - List all diagrams
- `GET /api/diagrams/{diagram_id}` - Get a specific diagram
- `POST /api/diagrams` - Create a new diagram

### WebSocket

- `WS /ws/{diagram_id}` - Real-time collaboration endpoint

## Usage

1. **View Diagrams**: The home page shows all available diagrams, including 3 pre-loaded examples
2. **Create Diagram**: Click "Create New Diagram" to create a blank diagram
3. **Open Diagram**: Click "Open Diagram" on any diagram card to start editing
4. **Edit Diagram**: Use the bpmn-js palette to add elements, connect them, and modify properties
5. **Share**: Click the "Share" button to copy a shareable link
6. **Collaborate**: Open the same diagram in multiple browser tabs/windows to see real-time collaboration

## Real-time Features

- **Live Updates**: Changes to the diagram are instantly synchronized to all connected users
- **Element Locking**: When you click on an element, it's locked with your name visible to others
- **Online Users**: The header shows how many users are currently viewing the diagram
- **Connection Status**: Green/red indicator shows WebSocket connection status

## Example Diagrams

The application comes with 3 pre-loaded example diagrams:

1. **Simple Approval Process**: A basic two-step approval workflow
2. **Order Processing with Gateway**: A decision-based order processing flow
3. **Multi-Step Request Workflow**: A comprehensive multi-step request process

## Development

### Backend Development

The backend uses FastAPI with hot-reload enabled in development mode. Changes to `main.py` will automatically restart the server.

### Frontend Development

The frontend uses Vite with hot-reload. Changes to React components will automatically refresh in the browser.

## Production Deployment

1. Set up environment variables for production
2. Build the frontend: `cd frontend && npm run build`
3. The backend will serve the built frontend from the `static/` directory
4. Use a production ASGI server like Gunicorn with Uvicorn workers:

```bash
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

Or use Docker for containerized deployment.

## Troubleshooting

### Port Already in Use

If port 8000 or 3000 is already in use, update the environment files with different ports.

### WebSocket Connection Issues

- Ensure CORS_ORIGINS includes your frontend URL
- Check firewall settings
- Verify WebSocket support in your deployment environment

### Frontend Not Loading

- Check that `VITE_API_URL` matches your backend URL
- Verify the backend is running and accessible
- Check browser console for errors

## License

This project is open source and available for use.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
