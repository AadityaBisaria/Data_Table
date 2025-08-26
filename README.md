# Data Explorer

A flexible data table application with a FastAPI backend and a React + TypeScript (Vite) frontend. Supports dynamic column selection, server-side pagination/sorting/search, and a user-friendly filter UI (including numeric/date ranges).

## Features
- Dynamic column selection (toggle columns, Select all / Clear)
- Server-side pagination, sorting, and global search
- Per-column filters with operators: contains, equals, not equals, >, >=, <, <=, between (ranges)
- Flat data format for easy table rendering (e.g., `company_name`, `city`)
- Columns popover stays open for multi-select; scrollable filter list
- Items-per-page input supports clearing, multi-digit values; applies on Enter/blur
- Multi-column sorting: hold Ctrl/Cmd while clicking headers

## Tech Stack
- Frontend: React, TypeScript, Vite, shadcn/ui
- Backend: FastAPI, Pydantic v2, Uvicorn

## Prerequisites
- Node.js 18+ and npm
- Python 3.11+

## Setup

### 1) Clone
```bash
git clone <https://github.com/AadityaBisaria/Data_Table>
cd Data_Table
```

### 2) Install frontend deps
```bash
npm install
```

### 3) Python venv and backend deps
```bash
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
```

### 4) Dummy data
A `dummy_db/data.json` file with 50 records is included and served by the backend.

## Running the project

### Start the backend (FastAPI)
```bash
# from project root (venv activated)
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```
- API base: `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`

### Start the frontend (Vite)
Create a local env file (optional if using default):
```bash
# .env.local
VITE_API_URL=http://localhost:8000
```
Run dev server:
```bash
npm run dev
```
- App: `http://localhost:5173` (Vite default)

## How it works

### Frontend
- Open Filters → choose an operator per column and enter a value.
- Press Enter in the input to apply the filter. For "between", use both inputs and press Enter in either.
- Global "Search all columns" is debounced (≈400ms) and also clears when emptied.
- Items per page: type a value (multi-digit allowed), press Enter or blur to apply.
- Columns popover: toggle visibility; it stays open for multiple changes; "Select all" and "Clear" provided; list is scrollable.
- Sorting: click a column header to sort; hold Ctrl/Cmd to add multi-sorts.

### Backend (FastAPI)
Main flexible endpoint: `GET /api/data`

Query params:
- `columns`: comma-separated list (e.g., `id,name,company.name`)
- `page`, `limit`: pagination
- `search`: global search across id, name, username, email, phone, website, address fields, company fields
- `sort_by`: field to sort by (supports nested like `address.city`, `company.name`)
- `sort_order`: `asc` or `desc`
- `format`: `flat` or `nested` (frontend uses `flat`)
- `filters`: comma-separated key:value expressions

Filter expressions supported:
- Substring (default): `city:York`
- Equality: `id:==5` or `id:=5`
- Inequality: `company.name:!=Acme`
- Comparisons: `id:>5`, `id:>=5`, `id:<10`, `id:<=10`
- Range: `id:1..10` or date ranges like `created_at:2024-01-01..2024-12-31`
- Dates: ISO 8601 (supports `Z`), e.g., `created_at:>=2024-05-01T12:00:00Z`

Examples:
```bash
# Basic page of flat data
curl "http://localhost:8000/api/data?format=flat&page=1&limit=10"

# Specific columns and global search
curl "http://localhost:8000/api/data?columns=id,name,company.name&search=john&format=flat"

# Filters: users with id between 5 and 12
curl "http://localhost:8000/api/data?filters=id:5..12&format=flat"

# Filters: company name contains 'tech' and city equals 'Berlin'
curl "http://localhost:8000/api/data?filters=company.name:tech,address.city:==Berlin&format=flat"
```

## Troubleshooting
- Backend not reachable: ensure Uvicorn is running on port 8000 and no firewall blocks it.
- CORS errors: backend enables CORS for local dev; verify `VITE_API_URL` and ports.
- Filters not applying: press Enter inside the filter input to submit; for "between", fill both fields.
- Items-per-page typing issues: type full value then press Enter or blur to apply.

## Scripts
- `npm run dev`: start Vite dev server
- `uvicorn backend.main:app --reload --port 8000`: start backend

## Project structure (high-level)
```
backend/
  main.py            # FastAPI app, CORS, routers
  api/
    data.py         # Flexible data endpoint (/api/data)
    columns.py      # Column metadata (/api/columns)
    stats.py        # Stats endpoints (/api/stats)
  utils.py          # flatten/select columns, etc.
  models.py         # Pydantic models
dummy_db/
  data.json         # 50 dummy entries
src/
  components/       # DataTable, TableToolbar, etc.
  hooks/            # useDataTable (fetching, state)
  lib/              # api.ts (client utils)
```