import React from 'react';
import { Link } from 'react-router-dom';
import './NavBar.css';

const NavBar = () => {
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <Link to="/">MyApp</Link>
      </div>
      <div className="navbar-links">
        <button className="nav-link" onClick={() => scrollToSection('home')}>Home</button>
        <button className="nav-link" onClick={() => scrollToSection('about')}>About</button>
        <button className="nav-link" onClick={() => scrollToSection('vision')}>Vision</button>
        <button className="nav-link" onClick={() => scrollToSection('mission')}>Mission</button>
        <button className="nav-link" onClick={() => scrollToSection('contact')}>Contact</button>
        <Link to="/login" className="nav-button">Login</Link>
        <Link to="/signup" className="nav-button">Sign Up</Link>
      </div>
    </nav>
  );
};

export default NavBar;
