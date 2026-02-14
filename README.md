# AI-Powered Expense Tracker

A comprehensive, full-stack expense tracking application that leverages the power of **Google Gemini AI** to provide intelligent financial insights. Built with a modern tech stack featuring **FastAPI** (Python) for the backend and **React** (Vite) for the frontend.

![Project Status](https://img.shields.io/badge/status-active-success.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

## 🌟 Key Features

- **Smart Dashboard**: Visual analytics of your income, expenses, and net balance.
- **AI Financial Assistant**: Chat with an AI (powered by Gemini) to analyze your spending habits and get advice.
- **Transaction Management**: Easily add, edit, and categorize your financial records.
- **Secure Authentication**: Robust user management with JWT and secure cookies.
- **Responsive Design**: a beautiful UI that works on desktop and mobile.

## 📂 Project Structure

The project is divided into two main components:

- **[`/server`](./server)**: The backend REST API. Handles database interactions, authentication, and AI logic.
- **[`/client`](./client)**: The frontend user interface. A Single Page Application (SPA) built with React.

> For detailed documentation on each part, please refer to their respective README files:
> - [Backend Documentation (Server)](./server/README.md)
> - [Frontend Documentation (Client)](./client/README.md)

## 🚀 Quick Start Guide

To run the full application locally, you will need to set up both the server and the client.

### 1. Start the Backend (Server)

```bash
cd server
python -m venv .venv
# Activate virtual environment (Windows: .venv\Scripts\activate, Unix: source .venv/bin/activate)
pip install -r requirements.txt
# Create .env file with your credentials (see server/README.md)
uvicorn app:app --reload
```

### 2. Start the Frontend (Client)

Open a new terminal:

```bash
cd client
npm install
npm run dev
```

The application will be accessible at `http://localhost:5173`.

## 🔒 Security

We take security seriously. Please review our [Security Policy](SECURITY.md) for supported versions and vulnerability reporting.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
