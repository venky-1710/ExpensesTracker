# AI-Powered Expenses Tracker

A comprehensive, full-stack personal finance and expense tracking application powered by AI. This system consists of a unified API backend, a beautiful React web client, and a cross-platform React Native mobile application.

## 🌟 Features

- **AI-Powered Categorization**: Automatically categorize your transactions using Artificial Intelligence.
- **Comprehensive Dashboard**: Beautiful charts, key performance indicators (KPIs), and financial summaries.
- **Cross-Platform**: Accessible via Web (React) and Mobile (React Native / Expo).
- **Secure Authentication**: JWT-based secure authentication with session management.
- **Premium Dark UI**: A modern, vibrant, deep-purple dark mode design across all platforms.
- **Data Export**: Export your transaction data to CSV, PDF, or Excel.

## 🏗️ Architecture & Tech Stack

This project is structured as a monorepo containing three main components:

1. **`/server`** - FastAPI backend connecting to MongoDB.
2. **`/client`** - React/Vite web application.
3. **`/mobile`** - React Native / Expo mobile application.

### Tech Stack

- **Backend**: Python, FastAPI, MongoDB (Motor), JWT, Pydantic
- **Web Frontend**: React 19, Vite, Recharts, React Router
- **Mobile App**: React Native, Expo SDK 55, Expo Router, AsyncStorage

## 🚀 Getting Started

To get the entire stack running locally on your machine, follow these steps.

### Prerequisites
- Node.js (v18+)
- Python (3.10+)
- MongoDB instance (Local or Atlas)

### 1. Start the Backend Server
Navigate to the `server` directory, configure your environment, and start the FastAPI server.
```bash
cd server
pip install -r requirements.txt
# Configure your .env file here
uvicorn app:app --reload --host 0.0.0.0
```
> See `server/README.md` for detailed backend configuration.

### 2. Start the Web Client
Navigate to the `client` directory and start the Vite development server.
```bash
cd client
npm install
npm run dev
```
> See `client/README.md` for detailed frontend configuration.

### 3. Start the Mobile App
Navigate to the `mobile` directory and start the Expo Go server.
```bash
cd mobile
npm install
npx expo start --clear
```
> See `mobile/README.md` for detailed mobile configuration and device testing.

---
*Built with ❤️ using React, FastAPI, and AI.*
