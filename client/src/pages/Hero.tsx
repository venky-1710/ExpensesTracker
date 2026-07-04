import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiTrendingUp, FiShield, FiZap, FiDownload, FiClock,
  FiSmartphone, FiCheckCircle, FiArrowRight,
  FiGithub, FiTwitter, FiLinkedin,
  FiPieChart, FiCpu, FiLock,
} from 'react-icons/fi';
import NavBar from '../components/NavBar/NavBar';
import ContactSection from '../components/ContactSection/ContactSection';

interface StatItem {
  num: string;
  label: string;
}

interface FeatureItem {
  icon: React.ReactNode;
  title: string;
  desc: string;
}

interface StepItem {
  icon: React.ReactNode;
  title: string;
  desc: string;
}

interface TxnItem {
  name: string;
  date: string;
  amt: string;
  neg: boolean;
}

const Hero = () => {
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('hero-theme');
    return saved ? saved === 'dark' : true;
  });

  useEffect(() => {
    localStorage.setItem('hero-theme', isDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleTheme = () => setIsDark(p => !p);

  const features: FeatureItem[] = [
    { icon: <FiCpu size={26} />,       title: 'AI-Powered Analysis',    desc: 'Upload PDF, Excel, or CSV bank statements and our AI extracts and categorises every transaction automatically.' },
    { icon: <FiTrendingUp size={26} />, title: 'Smart Categorisation',   desc: 'Intelligent auto-categorisation with custom categories and easy manual adjustments.' },
    { icon: <FiClock size={26} />,      title: 'Real-time Dashboard',    desc: 'Interactive charts that update the moment you add a transaction.' },
    { icon: <FiShield size={26} />,     title: 'Secure & Private',       desc: 'Bank-level encryption. Your financial data stays safe and we never share it.' },
    { icon: <FiDownload size={26} />,   title: 'Export Reports',         desc: 'Generate beautiful PDF reports with charts and insights for tax season.' },
    { icon: <FiSmartphone size={26} />, title: 'Multi-platform',         desc: 'Desktop, tablet, and mobile — your data is always in sync across every device.' },
  ];

  const steps: StepItem[] = [
    { icon: <FiDownload size={30} />, title: 'Upload Statement', desc: 'Drop your bank statement in PDF, Excel, or CSV. Our AI handles everything else.' },
    { icon: <FiZap size={30} />,      title: 'AI Processing',   desc: 'All transactions are extracted and categorised automatically in seconds.' },
    { icon: <FiPieChart size={30} />, title: 'Get Insights',    desc: 'View charts, track spending patterns, and make smarter financial decisions.' },
  ];

  const stats: StatItem[] = [
    { num: '10K+', label: 'Active Users' },
    { num: '1M+',  label: 'Transactions Tracked' },
    { num: '99.9%', label: 'Uptime' },
  ];

  const txns: TxnItem[] = [
    { name: 'Shopping',  date: 'Today',      amt: '-₹2.4K', neg: true  },
    { name: 'Salary',    date: '2 days ago', amt: '+₹45K',  neg: false },
    { name: 'Dining',    date: 'Yesterday',  amt: '-₹850',  neg: true  },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-[#09011a] text-gray-900 dark:text-[#f0eeff] font-sans overflow-x-hidden transition-colors duration-300 relative">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_70%_60%_at_60%_40%,rgba(109,74,255,0.08)_0%,transparent_70%)] dark:bg-[radial-gradient(ellipse_80%_60%_at_60%_40%,rgba(109,74,255,0.18)_0%,transparent_70%)]" />

      <NavBar isDark={isDark} toggleTheme={toggleTheme} />

      {/* Hero */}
      <section id="home" className="relative grid grid-cols-1 lg:grid-cols-2 items-center gap-14 max-w-7xl mx-auto px-[5%] pt-[130px] pb-[80px] min-h-[92vh] z-10">
        <div className="flex flex-col items-start">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-indigo-500/10 dark:bg-purple-500/20 border border-indigo-500/20 dark:border-purple-500/30 rounded-full text-indigo-600 dark:text-purple-400 text-sm font-semibold mb-6 animate-fade-in-up">
            <FiZap size={14} />
            <span>AI-Powered Expense Tracking</span>
          </div>

          <h1 className="text-[clamp(2.2rem,4.5vw,3.8rem)] font-extrabold leading-[1.1] tracking-tight mb-6 text-gray-900 dark:text-white animate-fade-in-up delay-75">
            Master Your Finances with{' '}
            <span className="bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-500 bg-clip-text text-transparent">AI Intelligence</span>
          </h1>

          <p className="text-[clamp(1rem,1.8vw,1.18rem)] leading-relaxed text-gray-600 dark:text-[#b7b7d2] max-w-lg mb-8 animate-fade-in-up delay-150">
            Upload bank statements, let AI categorise transactions, and gain instant
            insights into your spending. Take control of your financial future today.
          </p>

          <div className="flex gap-3.5 flex-wrap mb-11 animate-fade-in-up delay-200">
            <button className="inline-flex items-center gap-2 px-7 py-3.5 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-xl text-[0.95rem] font-semibold hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/40 transition-all border-none cursor-pointer" onClick={() => navigate('/login')}>
              Get Started Free <FiArrowRight size={17} />
            </button>
            <button
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-white/80 dark:bg-[#1a1035]/50 backdrop-blur-md text-gray-900 dark:text-white border border-indigo-500/10 dark:border-indigo-500/20 rounded-xl text-[0.95rem] font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all cursor-pointer"
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Explore Features
            </button>
          </div>

          <div className="flex gap-10 flex-wrap animate-fade-in-up delay-300">
            {stats.map(s => (
              <div key={s.label} className="flex flex-col gap-1">
                <span className="text-[1.7rem] font-extrabold">{s.num}</span>
                <span className="text-sm text-gray-500 dark:text-[#8a82b5] font-medium">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Dashboard mockup */}
        <div className="relative animate-fade-in-up delay-500" aria-hidden="true">
          <div className="bg-white/95 dark:bg-[#12082a]/95 backdrop-blur-xl border border-indigo-500/20 rounded-2xl p-6 shadow-2xl flex flex-col gap-5">
            <div className="flex items-center gap-2 pb-4 border-b border-gray-100 dark:border-indigo-500/20">
              <span className="w-3 h-3 rounded-full bg-red-400" />
              <span className="w-3 h-3 rounded-full bg-yellow-400" />
              <span className="w-3 h-3 rounded-full bg-green-400" />
              <span className="ml-2 text-sm font-semibold text-gray-600 dark:text-[#b7b7d2]">Dashboard</span>
            </div>

            <div className="bg-gray-50 dark:bg-black/20 p-4 rounded-xl border border-gray-100 dark:border-white/5">
              <div className="text-xs text-gray-500 dark:text-[#8a82b5] font-semibold uppercase tracking-wider mb-1">Total Expenses</div>
              <div className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-2">₹45,230</div>
              <div className="text-xs font-semibold text-green-500 bg-green-500/10 inline-block px-2 py-1 rounded-md">↑ 12.5% from last month</div>
            </div>

            <div className="flex items-end h-24 gap-2 mt-2">
              {[60, 85, 45, 90, 55, 75, 40].map((h, i) => (
                <div key={i} className="flex-1 h-full bg-gray-100 dark:bg-white/5 rounded-t-md relative group">
                  <div className="absolute bottom-0 w-full bg-gradient-to-t from-indigo-600 to-purple-500 rounded-t-md transition-all duration-1000" style={{ height: `${h}%` }} />
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 mt-2">
              {txns.map(t => (
                <div key={t.name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-xl transition-transform hover:translate-x-1 cursor-default">
                  <div className="flex items-center gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full ${t.neg ? 'bg-indigo-500' : 'bg-green-500'}`} />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{t.name}</span>
                      <span className="text-[11px] text-gray-500 dark:text-[#8a82b5]">{t.date}</span>
                    </div>
                  </div>
                  <span className={`text-sm font-bold ${t.neg ? 'text-gray-900 dark:text-white' : 'text-green-500'}`}>{t.amt}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="absolute -top-5 -left-5 bg-white/90 dark:bg-[#1a1035]/90 backdrop-blur-md px-4 py-2.5 rounded-xl shadow-lg border border-indigo-500/20 flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-[#f0eeff] animate-bounce-slow">
            <FiLock size={14} className="text-indigo-500" /> Bank-level Security
          </div>
          <div className="absolute -bottom-5 -right-5 bg-white/90 dark:bg-[#1a1035]/90 backdrop-blur-md px-4 py-2.5 rounded-xl shadow-lg border border-indigo-500/20 flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-[#f0eeff] animate-bounce-slow" style={{ animationDelay: '1s' }}>
            <FiZap size={14} className="text-purple-500" /> AI Powered
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-[5%] py-[100px]">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block px-3 py-1 bg-indigo-500/10 dark:bg-purple-500/10 border border-indigo-500/20 dark:border-purple-500/20 rounded-full text-indigo-600 dark:text-purple-400 text-xs font-bold uppercase tracking-wider mb-4">Features</span>
          <h2 className="text-[clamp(1.8rem,3vw,2.5rem)] font-extrabold mb-4 text-gray-900 dark:text-white leading-tight">Powerful tools for smart finance</h2>
          <p className="text-gray-600 dark:text-[#b7b7d2] text-lg">Everything you need to track, analyse, and optimise your expenses</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(f => (
            <div key={f.title} className="bg-white/50 dark:bg-white/5 p-8 rounded-2xl border border-gray-100 dark:border-white/10 hover:-translate-y-1 hover:shadow-xl hover:border-indigo-500/30 transition-all duration-300 group">
              <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
                {f.icon}
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">{f.title}</h3>
              <p className="text-gray-600 dark:text-[#8a82b5] leading-relaxed text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-[5%] py-[100px]">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block px-3 py-1 bg-indigo-500/10 dark:bg-purple-500/10 border border-indigo-500/20 dark:border-purple-500/20 rounded-full text-indigo-600 dark:text-purple-400 text-xs font-bold uppercase tracking-wider mb-4">Process</span>
          <h2 className="text-[clamp(1.8rem,3vw,2.5rem)] font-extrabold mb-4 text-gray-900 dark:text-white leading-tight">Up and running in 3 steps</h2>
          <p className="text-gray-600 dark:text-[#b7b7d2] text-lg">No complicated setup — start tracking in under a minute</p>
        </div>
        <div className="flex flex-col md:flex-row gap-8 relative items-center justify-center">
          {steps.map((s, i) => (
            <React.Fragment key={s.title}>
              <div className="bg-white/50 dark:bg-white/5 p-8 rounded-2xl border border-gray-100 dark:border-white/10 relative z-10 flex flex-col items-center text-center max-w-[320px] group hover:border-indigo-500/30 hover:shadow-xl transition-all">
                <div className="absolute -top-4 -right-4 w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center font-bold text-white shadow-lg text-lg">
                  {i + 1}
                </div>
                <div className="w-16 h-16 flex items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
                  {s.icon}
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">{s.title}</h3>
                <p className="text-gray-600 dark:text-[#8a82b5] leading-relaxed text-sm">{s.desc}</p>
              </div>
              {i < steps.length - 1 && <div className="hidden md:block h-0.5 flex-1 max-w-[100px] bg-gradient-to-r from-indigo-500/20 to-purple-500/20 relative z-0 mx-[-20px]"></div>}
            </React.Fragment>
          ))}
        </div>
      </section>



      <ContactSection />

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-white/10 bg-transparent pt-20 pb-10 relative z-10 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-[5%]">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-8 mb-16">
            
            {/* Brand Section */}
            <div className="md:col-span-12 lg:col-span-5 pr-0 lg:pr-8">
              <div className="flex items-center gap-3 text-2xl font-extrabold text-gray-900 dark:text-white mb-6 tracking-tight">
                <img src="/favicon.png" alt="ExpenseTrack" className="w-12 h-12 object-contain" />
                <span>ExpenseTrack</span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-base mb-8 max-w-sm leading-relaxed">
                Smart expense tracking powered by AI. Take control of your financial future today with intuitive dashboards and actionable insights.
              </p>
              <div className="flex gap-4">
                {[
                  { icon: <FiGithub size={20} />,   href: 'https://github.com' },
                  { icon: <FiTwitter size={20} />,  href: 'https://twitter.com' },
                  { icon: <FiLinkedin size={20} />, href: 'https://linkedin.com' },
                ].map((s, i) => (
                  <a key={i} href={s.href} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-500/20 dark:hover:text-indigo-400 transition-all" target="_blank" rel="noopener noreferrer">
                    {s.icon}
                  </a>
                ))}
              </div>
            </div>

            {/* Empty spacer for lg screens */}
            <div className="hidden lg:block lg:col-span-1"></div>

            {/* Quick Links */}
            <div className="md:col-span-4 lg:col-span-3">
              <h4 className="text-gray-900 dark:text-white font-bold mb-6 tracking-wider text-sm">Product</h4>
              <ul className="flex flex-col gap-4 list-none p-0 m-0">
                {[
                  { label: 'Home',         id: 'home' },
                  { label: 'Features',     id: 'features' },
                  { label: 'How It Works', id: 'how-it-works' },
                  { label: 'Contact',      id: 'contact' },
                ].map(l => (
                  <li key={l.id}>
                    <button className="text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-transparent border-none p-0 cursor-pointer text-base font-medium transition-colors" onClick={() => document.getElementById(l.id)?.scrollIntoView({ behavior: 'smooth' })}>
                      {l.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal / Pages */}
            <div className="md:col-span-4 lg:col-span-3">
              <h4 className="text-gray-900 dark:text-white font-bold mb-6 tracking-wider text-sm">Company</h4>
              <ul className="flex flex-col gap-4 list-none p-0 m-0">
                <li><a href="/login" className="text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 no-underline text-base font-medium transition-colors">Login</a></li>
                <li><a href="/signup" className="text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 no-underline text-base font-medium transition-colors">Sign Up</a></li>
                <li><a href="/terms" className="text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 no-underline text-base font-medium transition-colors">Terms of Service</a></li>
                <li><a href="/privacy" className="text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 no-underline text-base font-medium transition-colors">Privacy Policy</a></li>
              </ul>
            </div>

          </div>
          
          <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-gray-200 dark:border-white/10 gap-4 text-center md:text-left">
            <p className="text-gray-500 dark:text-gray-500 text-sm font-medium">© {new Date().getFullYear()} ExpenseTrack. All rights reserved.</p>
            <div className="flex gap-6 text-sm font-medium text-gray-500 dark:text-gray-500">
              <span className="cursor-pointer hover:text-gray-900 dark:hover:text-gray-300 transition-colors">English (US)</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Hero;
