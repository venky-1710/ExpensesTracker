# Expenses Tracker - Backend API

The backend REST API for the Expenses Tracker, built with Python and FastAPI. It serves both the Web Client and Mobile App, handling authentication, database operations, and AI intelligence.

## 🛠️ Technology Stack
- **Framework**: FastAPI
- **Database**: MongoDB (async via Motor)
- **Authentication**: JWT (JSON Web Tokens) with OAuth2 Password Bearer
- **Data Validation**: Pydantic
- **AI Integration**: AI-powered categorization logic

## 📂 Project Structure
- `apis/` - Core business logic and database interactions
- `models/` - Pydantic schemas (payloads) and MongoDB models
- `routes/` - FastAPI endpoint definitions (Auth, Transactions, Dashboard, Calendar)
- `utils/` - Helpers, JWT validation, caching, and custom decorators
- `app.py` - Main FastAPI application and CORS configuration

## 🚀 Setup & Execution

### 1. Create a Virtual Environment (Optional but recommended)
```bash
python -m venv venv
venv\Scripts\activate  # On Windows
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure Environment
Create a `.env` file in the `server` directory:
```env
# MongoDB Connection String
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/
MONGO_DB_NAME=expenses_tracker

# JWT Secrets
SECRET_KEY=your_super_secret_jwt_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

### 4. Run the Server
```bash
uvicorn app:app --reload --host 0.0.0.0
```
The API will be available at `http://localhost:8000`.

### 5. API Documentation
FastAPI automatically generates interactive documentation. Once the server is running, visit:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

## 🔒 Security & CORS
The backend utilizes a strict CORS policy. Currently allowed origins include:
- `http://localhost:*`
- `http://127.0.0.1:*`
- `http://10.0.2.2:*` (Android Emulator)
- `http://192.168.*.*:*` (Physical devices on local network)
