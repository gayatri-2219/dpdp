<h1 align="center">
  🛡️ DPDP Shield
</h1>
<p align="center">
  <strong>AI-Powered Digital Personal Data Protection Compliance Platform</strong><br>
  Automated PII detection, risk scoring & compliance reporting under India's DPDP Act 2023
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.11-blue?logo=python" />
  <img src="https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi" />
  <img src="https://img.shields.io/badge/Next.js-15-black?logo=next.js" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql" />
  <img src="https://img.shields.io/badge/Gemini-AI-4285F4?logo=google" />
</p>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📄 **Multi-format Upload** | PDF, DOCX, CSV, XLSX, TXT, PNG, JPG |
| 🔍 **AI PII Detection** | Regex + Presidio + spaCy + Gemini LLM |
| 🇮🇳 **India-specific PII** | Aadhaar, PAN, IFSC, UPI, Passport |
| ⚖️ **DPDP Compliance Engine** | Maps findings to DPDP Act 2023 sections |
| 📊 **Risk Scoring** | LOW / MEDIUM / HIGH / CRITICAL with rationale |
| 📑 **PDF Reports** | Downloadable compliance reports |
| 🤖 **AI Chatbot** | RAG-powered DPDP Act Q&A assistant |
| 🔒 **Data Masking** | Redact / Pseudonymize / Tokenize strategies |
| 📋 **Audit Logs** | Immutable audit trail for all operations |

---

## 🏗️ Architecture

```
┌─────────────────────────┐
│   Next.js 15 Frontend   │  ← Dashboard, Upload, Chatbot, Reports
└──────────┬──────────────┘
           │ REST API
┌──────────▼──────────────┐
│    FastAPI Backend       │
│  ┌─────────────────────┐ │
│  │  Document Parsers   │ │  ← PDF, DOCX, CSV, XLSX, TXT, Images
│  │  AI Pipeline        │ │  ← PII Detection, Masking, Embeddings
│  │  Compliance Engine  │ │  ← DPDP Rules, Risk Scorer, Reports
│  │  Celery Workers     │ │  ← Async document processing
│  └─────────────────────┘ │
└──────────┬──────────────┘
           │
┌──────────▼──────────────┐
│ PostgreSQL + pgvector    │  ← Documents, PII entities, vectors
│ Redis                    │  ← Celery task queue
└─────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+
- Docker & Docker Compose
- [Gemini API Key](https://makersuite.google.com/app/apikey)
- Tesseract OCR (`brew install tesseract` on macOS)

### 1. Clone & Setup

```bash
git clone <repo-url>
cd dpdp

# Copy environment variables
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

### 2. Start Infrastructure (Docker)

```bash
docker compose up -d postgres redis
```

### 3. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

pip install -r requirements.txt
python -m spacy download en_core_web_sm

# Run migrations / create tables
python -c "import asyncio; from database import create_tables; asyncio.run(create_tables())"

# Start FastAPI
uvicorn main:app --reload --port 8000
```

### 4. Celery Worker (separate terminal)

```bash
cd backend
source venv/bin/activate
celery -A celery_app worker --loglevel=info
```

### 5. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### 6. Open the App

- **Frontend**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs
- **API ReDoc**: http://localhost:8000/redoc

---

## 🐳 Full Docker Deployment

```bash
cp .env.example .env
# Add your GEMINI_API_KEY to .env
docker compose up --build
```

---

## 📁 Project Structure

```
dpdp/
├── backend/
│   ├── main.py              # FastAPI entrypoint
│   ├── config.py            # Settings
│   ├── database.py          # DB connection
│   ├── celery_app.py        # Celery config
│   ├── tasks.py             # Celery tasks
│   ├── models/              # SQLAlchemy ORM models
│   ├── schemas/             # Pydantic schemas
│   ├── api/routes/          # API route handlers
│   ├── parsers/             # Document parsers (PDF, DOCX, etc.)
│   ├── ai/                  # AI pipeline (PII detection, chatbot)
│   └── compliance/          # DPDP compliance engine
├── frontend/
│   ├── app/                 # Next.js App Router pages
│   ├── components/          # React components
│   └── lib/                 # API client, utilities
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 🔍 PII Detection Layers

| Layer | Technology | PII Types |
|-------|-----------|-----------|
| Layer 1 | Regex | Aadhaar, PAN, Phone, Email, Credit Card, IFSC, UPI, Passport |
| Layer 2 | spaCy | PERSON, ORG, GPE (Location) |
| Layer 3 | Microsoft Presidio | 20+ entity types |
| Layer 4 | Gemini LLM | Context-aware detection & verification |

---

## ⚖️ DPDP Act 2023 Coverage

| Section | Topic | Automated Check |
|---------|-------|----------------|
| Section 4 | Grounds for processing | ✅ |
| Section 5 | Notice requirements | ✅ |
| Section 6 | Consent | ✅ |
| Section 8 | Data Fiduciary obligations | ✅ |
| Section 9 | Children's data | ✅ |
| Section 11 | Rights of Data Principal | ✅ |
| Section 16 | Cross-border transfers | ✅ |

---

## 📄 License

MIT License — see [LICENSE](LICENSE)

---

<p align="center">Built with ❤️ for DPDP Act compliance in India</p>
