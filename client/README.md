# Expenses Tracker - Web Client

The web frontend for the Expenses Tracker, built with React and Vite. It features a stunning, premium dark-mode UI with beautiful micro-animations and data visualizations.

## 🛠️ Technology Stack
- **Framework**: React 19 + Vite
- **Styling**: Vanilla CSS (Premium deep-purple dark mode design system)
- **Charts**: Recharts (for Dashboard KPIs, Line Charts, and Pie Charts)
- **Routing**: React Router
- **Networking**: Axios with JWT interceptors
- **Icons**: Lucide React

## 📂 Project Structure
- `src/app/` - Core application pages and components (Dashboard, Transactions, Login, Profile)
- `src/components/` - Reusable UI elements (Navigation, Layout)
- `src/context/` - Global state management (AuthContext, DashboardContext, ThemeContext)
- `src/services/` - Axios API integrations mapping to backend endpoints
- `src/index.css` - Global CSS containing the central design tokens

## 🚀 Setup & Execution

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create a `.env` file in the root of the `client` directory:
```env
VITE_API_URL=http://localhost:8000
```

### 3. Run Development Server
```bash
npm run dev
```
The application will start on `http://localhost:5173` (or equivalent).

## 🎨 Design System
The client adheres to a strict dark aesthetic:
- **Background**: `#0a0118` (Deep space purple)
- **Cards/Surfaces**: `#1a0d35` (Slightly lighter purple for elevation)
- **Primary Accent**: `#6d4aff` (Vibrant purple)
- **Secondary Accent**: `#c850ff` (Pinkish-purple for gradients)

All UI elements are implemented directly via Vanilla CSS classes to maintain maximum control over styling and animations.
