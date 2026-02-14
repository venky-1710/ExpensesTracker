# Expense Tracker App (Client)

A modern, responsive frontend for the Expense Tracker application, built with **React** and **Vite**. This interface provides a seamless user experience for managing finances, visualizing data with charts, and interacting with an AI financial assistant.

## 🚀 Features

- **Dashboard**: Real-time overview of income, expenses, and balance with interactive charts (Recharts).
- **Transaction Management**: Easy interface to add, edit, and delete transactions.
- **AI Chatbot**: Integrated interface to chat with the Gemini-powered financial assistant.
- **Visuals**: Dynamic 3D backgrounds using **Vanta.js** and **Three.js**.
- **Responsive Design**: Optimized for desktop and mobile devices.
- **Export**: Ability to export financial reports to PDF.

## 🛠️ Tech Stack

- **Framework**: [React](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: CSS Modules / Vanilla CSS with modern aesthetics
- **Routing**: [React Router](https://reactrouter.com/)
- **Charts**: [Recharts](https://recharts.org/)
- **Icons**: [React Icons](https://react-icons.github.io/react-icons/)
- **HTTP Client**: [Axios](https://axios-http.com/)
- **Visual Effects**: [Vanta.js](https://www.vantajs.com/) & Three.js

## 📋 Prerequisites

- **Node.js** (v16+)
- **NPM** or **Yarn**

## ⚡ Installation & Setup

1.  **Navigate to the client directory**:
    ```bash
    cd client
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Run the development server**:
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:5173`.

## ⚙️ Configuration

Create a `.env` file in the `client` directory with the following variables:

```env
# API URL (Backend)
VITE_API_URL=http://localhost:8000
```

## 📦 Build for Production

To create a production build:

```bash
npm run build
```

The build artifacts will be stored in the `dist/` directory.

## 📁 Project Structure

```
client/
├── src/
│   ├── assets/         # Static assets (images, icons)
│   ├── components/     # Reusable UI components
│   ├── context/        # React Context (Auth, Global State)
│   ├── pages/          # Application pages (Dashboard, Login, etc.)
│   ├── services/       # API service calls (Axios)
│   ├── styles/         # Global styles
│   ├── App.jsx         # Main application component
│   └── main.jsx        # Entry point
├── public/             # Public assets
├── .env                # Environment variables
└── vite.config.js      # Vite configuration
```
