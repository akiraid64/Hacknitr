# TOOL Inc - Port Configuration

## Current Setup

### Backend (Python FastAPI)
- **Port**: 8000
- **URL**: http://localhost:8000
- **API Prefix**: /api/v1
- **Docs**: http://localhost:8000/docs
- **Command**: `python main.py`

### Frontend (Next.js React)
- **Port**: 3000
- **URL**: http://localhost:3000
- **Command**: `npm run dev`

## Environment Files Created

### Backend
- `.env` - Active configuration
- `.env.example` - Template for team members
- `.gitignore` - Excludes .env and database files

### Frontend
- `.env.local` - Active configuration (Next.js)
- `.env.example` - Template for team members

## API Connection

The frontend connects to backend via:
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
```

## Cleanup Completed

✅ **Deleted**: `frontend_new` folder (unused HTML files)  
✅ **Keeping**: `frontend` folder (active Next.js app)

## Quick Start

```bash
# Terminal 1 - Backend
cd backend
python main.py

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Access:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/docs
