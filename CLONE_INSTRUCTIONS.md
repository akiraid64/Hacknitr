# Clone GS1 Digital Link Project

This repository contains the GS1 Digital Link system with backend API, frontend scanner, and database authentication.

## 📦 Repository
**GitHub URL**: https://github.com/akiraid64/Hacknitr.git

## 🚀 Clone to a New Folder

### Option 1: Clone to Desktop
```bash
cd C:\Users\sabat\Desktop
git clone https://github.com/akiraid64/Hacknitr.git Hacknitr-Clone
cd Hacknitr-Clone
```

### Option 2: Clone to Documents
```bash
cd C:\Users\sabat\Documents
git clone https://github.com/akiraid64/Hacknitr.git Hacknitr-Project
cd Hacknitr-Project
```

### Option 3: Clone Anywhere
```bash
cd "C:\Path\To\Your\Folder"
git clone https://github.com/akiraid64/Hacknitr.git
cd Hacknitr
```

## ⚙️ Setup After Cloning

### 1. Install Backend Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Run Backend Server
```bash
python main.py
```
Server will start on `http://localhost:8000`

### 3. Open Frontend
- Simply open `frontend/index.html` in your browser
- Or use a local server:
```bash
cd frontend
python -m http.server 3000
```

## 📁 Project Structure
```
Hacknitr/
├── backend/              # FastAPI Backend
│   ├── main.py          # API endpoints
│   ├── database.py      # SQLite database
│   ├── requirements.txt # Dependencies
│   └── README.md
└── frontend/            # QR Scanner UI
    ├── index.html       # Scanner app
    └── README.md
```

## 🎯 Features
- **Backend API**: FastAPI with manufacturer & retailer endpoints
- **QR Code Generation**: GS1 Digital Link QR codes
- **QR Scanner**: Camera, upload, or manual URL entry
- **Database**: SQLite with user authentication
- **Swagger UI**: Interactive API docs at `/docs`

## 📝 Quick Test
1. Start backend: `cd backend && python main.py`
2. Open Swagger: `http://localhost:8000/docs`
3. Open Scanner: Double-click `frontend/index.html`

Enjoy! 🎉
