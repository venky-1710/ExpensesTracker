// import { ToastContainer } from 'react-toastify';
// import 'react-toastify/dist/ReactToastify.css';
// import SignUp from "./components/SignUp/SignUp.jsx";
// import UserDetails from "./components/UserDetails/UserDetails.jsx";

// function App() {
//   const [isLoggedIn, setIsLoggedIn] = useState(false);

//   useEffect(() => {
//     const token = localStorage.getItem('token');
//     if (token) {
//       setIsLoggedIn(true);
//     }
//   }, []);

//   const handleLoginSuccess = () => {
//     setIsLoggedIn(true);
//   };

//   const handleLogout = () => {
//     setIsLoggedIn(false);
//   };

//   return (
//     <>
//       {isLoggedIn ? (
//         <UserDetails onLogout={handleLogout} />
//       ) : (
//         <SignUp onLoginSuccess={handleLoginSuccess} />
//       )}
//       <ToastContainer />
//     </>
//   );
// }

// export default App;
// =======
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Hero from './pages/Hero';
import SignUp from "./components/SignUp/SignUp.jsx";
import UserDetails from "./components/UserDetails/UserDetails.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Hero />} />
        <Route path="/login" element={<SignUp onLoginSuccess={handleLoginSuccess} initialMode="signin" />} />
        <Route path="/signup" element={<SignUp onLoginSuccess={handleLoginSuccess} initialMode="signup" />} />
        <Route path="/user-details" element={<ProtectedRoute><UserDetails onLogout={handleLogout} /></ProtectedRoute>} />
      </Routes>
      <ToastContainer />
    </Router>
  );
}

export default App;
