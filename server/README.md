# Expense Tracker API (Server)

A robust, production-ready REST API for the Expense Tracker application, built with **FastAPI** and **MongoDB**. This backend handles user authentication, transaction management, data analytics, and features an AI-powered financial assistant using **Google Gemini**.

## 🚀 Features

- **Authentication**: Secure Signup/Login with JWT (JSON Web Tokens) and HttpOnly cookies.
- **Transaction Management**: CRUD operations for income and expenses.
- **Dashboard & Analytics**: Aggregated financial data, charts, and key performance indicators.
- **AI Chatbot**: Integrated **Google Gemini** for intelligent financial advice and natural language queries.
- **Caching**: Optimized performance with caching strategies.
- **Security**: Bcrypt password hashing, input validation (Pydantic), and CORS protection.

## 🛠️ Tech Stack

- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python)
- **Database**: [MongoDB](https://www.mongodb.com/) (Async interaction via `motor`)
- **AI Integration**: [Google Gemini](https://deepmind.google/technologies/gemini/) (via `google-generativeai`)
- **Authentication**: `python-jose` (JWT) & `passlib` (Bcrypt)
- **Validation**: `pydantic`

## 📋 Prerequisites

- **Python** 3.10+
- **MongoDB** (Local instance or Atlas URI)
- **Google Gemini API Key** (for AI features)

## ⚡ Installation & Setup

1.  **Navigate to the server directory**:
    ```bash
    cd server
    ```

2.  **Create a virtual environment**:
    ```bash
    python -m venv .venv
    ```

3.  **Activate the virtual environment**:
    - Windows:
        ```bash
        .venv\Scripts\activate
        ```
    - Mac/Linux:
        ```bash
        source .venv/bin/activate
        ```

4.  **Install dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

## ⚙️ Configuration

Create a `.env` file in the `server` directory with the following variables:

```env
# Server
PORT=8000
DEBUG=true

# Database
MONGODB_URI=mongodb://localhost:27017/expense_tracker_db

# Security
SECRET_KEY=your_super_secret_key_here
GEMINI_API_KEY=your_gemini_api_key_here

# Client (for CORS)
CLIENT_URL=http://localhost:5173
```

## 🏃‍♂️ Running the Server

Start the output development server with hot-reload:

```bash
uvicorn app:app --reload
```

The API will be available at `http://localhost:8000`.

## 📚 API Documentation

FastAPI automatically generates interactive API documentation:

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

## 📁 Project Structure

```
server/
├── config/             # Configuration files
├── database/           # MongoDB connection and queries
├── models/             # Pydantic data models
├── routes/             # API route handlers
├── services/           # Business logic
├── utils/              # Helper functions (logger, auth)
├── scripts/            # Utility scripts (e.g., indexes)
├── app.py              # Application entry point
└── requirements.txt    # Python dependencies
```
