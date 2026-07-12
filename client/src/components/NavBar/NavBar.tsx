import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiSun, FiMoon, FiMenu, FiX, FiZap } from 'react-icons/fi';

interface Props {
  isDark: boolean;
  toggleTheme: () => void;
}

interface NavLink {
  label: string;
  id: string;
}

import webotLogo from '../../assets/webot_logo.png';

const NavBar = ({ isDark, toggleTheme }: Props) => {
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [scrolled, setScrolled] = useState<boolean>(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  };

  const links: NavLink[] = [
    { label: 'Home',         id: 'home' },
    { label: 'Features',     id: 'features' },
    { label: 'How It Works', id: 'how-it-works' },
    { label: 'Contact',      id: 'contact' },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-[1000] px-[5%] transition-all duration-300 ${scrolled ? 'bg-white/80 dark:bg-[#050B14]/80 backdrop-blur-md shadow-sm border-b border-gray-200 dark:border-white/10' : 'bg-transparent'}`}>
      <div className="flex items-center justify-between h-[68px] max-w-7xl mx-auto">
        <Link to="/" className="flex items-center gap-2 no-underline shrink-0 group">
          <img src={webotLogo} alt="ExpenseTrack" className="w-10 h-10 object-cover rounded-[16px] group-hover:scale-105 transition-transform" />
          <span className="text-lg font-extrabold text-gray-900 dark:text-white tracking-tight">ExpenseTrack</span>
        </Link>

        <ul className="hidden md:flex items-center gap-6 list-none m-0 p-0">
          {links.map(l => (
            <li key={l.id}>
              <button 
                className="bg-transparent border-none cursor-pointer text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-white transition-colors duration-200" 
                onClick={() => scrollTo(l.id)}
              >
                {l.label}
              </button>
            </li>
          ))}
        </ul>

        <div className="hidden md:flex items-center gap-3">
          <button className="w-[38px] h-[38px] rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-pointer flex items-center justify-center transition-colors hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-900/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20" onClick={toggleTheme} aria-label="Toggle theme">
            {isDark ? <FiSun size={18} /> : <FiMoon size={18} />}
          </button>
          <Link to="/login"  className="px-[18px] py-2 rounded-xl text-sm font-semibold no-underline cursor-pointer transition-all border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800">Login</Link>
          <Link to="/signup" className="px-[18px] py-2 rounded-xl text-sm font-semibold no-underline cursor-pointer transition-all border-none bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-[0_4px_12px_rgba(109,74,255,0.35)] hover:shadow-[0_6px_18px_rgba(109,74,255,0.5)] hover:-translate-y-[1px]">Sign Up</Link>
        </div>

        <div className="flex md:hidden items-center gap-2">
          <button className="w-[38px] h-[38px] rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-pointer flex items-center justify-center transition-colors hover:text-indigo-600 dark:hover:text-indigo-400" onClick={toggleTheme} aria-label="Toggle theme">
            {isDark ? <FiSun size={18} /> : <FiMoon size={18} />}
          </button>
          <button className="w-[38px] h-[38px] rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 cursor-pointer flex items-center justify-center" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
            {menuOpen ? <FiX size={22} /> : <FiMenu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`md:hidden flex flex-col px-[5%] pb-5 bg-white/95 dark:bg-[#050B14]/95 backdrop-blur-xl border-t border-gray-200 dark:border-white/10 gap-1 overflow-hidden transition-all duration-300 ease-in-out ${menuOpen ? 'max-h-[400px] pt-3 opacity-100' : 'max-h-0 pt-0 opacity-0'}`}>
        {links.map(l => (
          <button key={l.id} className="bg-transparent border-none cursor-pointer text-left p-3 text-base font-medium text-gray-600 dark:text-gray-400 rounded-xl transition-colors hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/50" onClick={() => scrollTo(l.id)}>
            {l.label}
          </button>
        ))}
        <div className="flex gap-2.5 pt-3 border-t border-gray-200 dark:border-white/10 mt-2">
          <Link to="/login"  className="flex-1 text-center px-[18px] py-2.5 rounded-xl text-sm font-semibold no-underline cursor-pointer transition-all border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800" onClick={() => setMenuOpen(false)}>Login</Link>
          <Link to="/signup" className="flex-1 text-center px-[18px] py-2.5 rounded-xl text-sm font-semibold no-underline cursor-pointer transition-all border-none bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-md" onClick={() => setMenuOpen(false)}>Sign Up</Link>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
