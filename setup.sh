#!/bin/bash
# DPDP Shield — Quick Setup Script
# Run from the project root: bash setup.sh

set -e

echo "🛡️  DPDP Shield Setup"
echo "================================"

# ── Check prerequisites ──────────────────────────────────────────
check_command() {
    if ! command -v "$1" &> /dev/null; then
        echo "❌ $1 not found. Please install it first."
        exit 1
    fi
    echo "✅ $1 found"
}

check_command python3
check_command node
check_command docker
check_command npm

# ── Copy .env ────────────────────────────────────────────────────
if [ ! -f .env ]; then
    cp .env.example .env
    echo "📄 Created .env from .env.example"
    echo "⚠️  IMPORTANT: Open .env and set your GEMINI_API_KEY before running!"
else
    echo "✅ .env already exists"
fi

# ── Start Docker services ─────────────────────────────────────────
echo ""
echo "🐳 Starting PostgreSQL + Redis..."
docker compose up -d postgres redis
echo "Waiting for services to be healthy..."
sleep 5

# ── Backend setup ─────────────────────────────────────────────────
echo ""
echo "🐍 Setting up Python backend..."
cd backend

if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "✅ Created virtual environment"
fi

source venv/bin/activate
pip install --upgrade pip -q
pip install -r requirements.txt -q
echo "✅ Python dependencies installed"

# Download spaCy model
echo "📦 Downloading spaCy model (en_core_web_sm)..."
python -m spacy download en_core_web_sm || echo "⚠️ spaCy model download failed (will use fallback)"

# Create required directories
mkdir -p uploads reports

# Run DB migrations (create tables)
echo "🗄️  Creating database tables..."
python -c "
import asyncio
from database import create_tables
asyncio.run(create_tables())
print('✅ Database tables created')
" || echo "⚠️ DB table creation failed \u2014 ensure PostgreSQL is running"

deactivate
cd ..

# ── Frontend setup ────────────────────────────────────────────────
echo ""
echo "⚛️  Setting up Next.js frontend..."
cd frontend

if [ ! -d "node_modules" ]; then
    npm install -q
    echo "✅ Node dependencies installed"
else
    echo "✅ Node modules already installed"
fi

cd ..

# ── Done ──────────────────────────────────────────────────────────
echo ""
echo "================================"
echo "✅ Setup complete!"
echo ""
echo "To run the app:"
echo ""
echo "  Terminal 1 (Backend API):"
echo "    cd backend && source venv/bin/activate"
echo "    uvicorn main:app --reload --port 8000"
echo ""
echo "  Terminal 2 (Celery Worker):"
echo "    cd backend && source venv/bin/activate"
echo "    celery -A celery_app worker --loglevel=info"
echo ""
echo "  Terminal 3 (Frontend):"
echo "    cd frontend && npm run dev"
echo ""
echo "  Open: http://localhost:3000"
echo "  API Docs: http://localhost:8000/docs"
echo ""
echo "⚠️  Don't forget to set GEMINI_API_KEY in .env!"
