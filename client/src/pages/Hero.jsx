import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiTrendingUp, FiShield, FiZap, FiDownload, FiClock, FiSmartphone, FiCheckCircle, FiArrowRight, FiMail, FiGithub, FiTwitter, FiLinkedin } from 'react-icons/fi';
import NavBar from '../components/NavBar/NavBar';
import './Hero.css';

const Hero = () => {
  const navigate = useNavigate();
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    message: ''
  });

  const handleGetStarted = () => {
    navigate('/login');
  };

  const handleContactSubmit = (e) => {
    e.preventDefault();
    alert('Thank you for your message! We will get back to you soon.');
    setContactForm({ name: '', email: '', message: '' });
  };

  const handleContactChange = (e) => {
    setContactForm({
      ...contactForm,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="hero-container">
      <NavBar />

      {/* Hero Section */}
      <section id="home" className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">
            <FiZap size={14} />
            <span>AI-Powered Expense Tracking</span>
          </div>
          <h1 className="hero-title">
            Master Your Finances with <span className="gradient-text">AI Intelligence</span>
          </h1>
          <p className="hero-subtitle">
            Upload bank statements, let AI categorize transactions, and gain instant insights into your spending.
            Take control of your financial future today.
          </p>
          <div className="hero-buttons">
            <button className="cta-button primary" onClick={handleGetStarted}>
              Get Started Free <FiArrowRight size={18} />
            </button>
            <button className="cta-button secondary" onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}>
              Explore Features
            </button>
          </div>
          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-number">10K+</span>
              <span className="stat-label">Active Users</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">1M+</span>
              <span className="stat-label">Transactions Tracked</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">99.9%</span>
              <span className="stat-label">Uptime</span>
            </div>
          </div>
        </div>
        <div className="hero-visual">
          <div className="scene-3d">
            {/* Main Dashboard Mockup */}
            <div className="dashboard-mockup">
              <div className="mockup-screen">
                <div className="mockup-header">
                  <div className="mockup-dot"></div>
                  <div className="mockup-dot"></div>
                  <div className="mockup-dot"></div>
                </div>
                <div className="mockup-content">
                  <div className="mockup-stat">
                    <div className="stat-label-mock">Total Expenses</div>
                    <div className="stat-value-mock">₹45,230</div>
                    <div className="stat-subtext">+12.5% from last month</div>
                  </div>
                  <div className="mockup-transactions">
                    <div className="mock-transaction">
                      <div className="mock-tx-dot"></div>
                      <div className="mock-tx-info">
                        <div className="mock-tx-name">Shopping</div>
                        <div className="mock-tx-date">Today</div>
                      </div>
                      <div className="mock-tx-amount">-₹2.4K</div>
                    </div>
                    <div className="mock-transaction">
                      <div className="mock-tx-dot green"></div>
                      <div className="mock-tx-info">
                        <div className="mock-tx-name">Salary</div>
                        <div className="mock-tx-date">2 days ago</div>
                      </div>
                      <div className="mock-tx-amount green">+₹45K</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>


          </div>
        </div>
      </section>



      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="section-header">
          <h2>Powerful Features for Smart Finance Management</h2>
          <p>Everything you need to track, analyze, and optimize your expenses</p>
        </div>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <FiZap size={28} />
            </div>
            <h3>AI-Powered Analysis</h3>
            <p>Upload PDF, Excel, or CSV statements and let our AI extract and categorize transactions automatically.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <FiTrendingUp size={28} />
            </div>
            <h3>Smart Categorization</h3>
            <p>Intelligent auto-categorization with custom categories and easy manual adjustments.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <FiClock size={28} />
            </div>
            <h3>Real-time Dashboard</h3>
            <p>Interactive charts and visualizations that update in real-time as you add transactions.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <FiShield size={28} />
            </div>
            <h3>Secure & Private</h3>
            <p>Bank-level encryption ensures your financial data stays safe and private. We never share your data.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <FiDownload size={28} />
            </div>
            <h3>Export Reports</h3>
            <p>Generate beautiful PDF reports with charts and insights for tax season or personal records.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <FiSmartphone size={28} />
            </div>
            <h3>Multi-platform</h3>
            <p>Access your financial data from any device - desktop, tablet, or mobile. Always in sync.</p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="how-section">
        <div className="section-header">
          <h2>How It Works</h2>
          <p>Get started in three simple steps</p>
        </div>
        <div className="steps-container">
          <div className="step-card">
            <div className="step-number">1</div>
            <div className="step-icon">
              <FiDownload size={32} />
            </div>
            <h3>Upload Statement</h3>
            <p>Simply upload your bank statement in PDF, Excel, or CSV format. Our AI handles the rest.</p>
          </div>
          <div className="step-connector"></div>
          <div className="step-card">
            <div className="step-number">2</div>
            <div className="step-icon">
              <FiZap size={32} />
            </div>
            <h3>AI Processing</h3>
            <p>Our intelligent system extracts and categorizes all transactions automatically in seconds.</p>
          </div>
          <div className="step-connector"></div>
          <div className="step-card">
            <div className="step-number">3</div>
            <div className="step-icon">
              <FiTrendingUp size={32} />
            </div>
            <h3>Get Insights</h3>
            <p>View beautiful charts, track spending patterns, and make smarter financial decisions.</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="cta" className="cta-section">
        <div className="cta-content">
          <h2>Ready to Take Control of Your Finances?</h2>
          <p>Join thousands of users who are already managing their expenses smarter with ExpensesTracker.</p>
          <div className="cta-features">
            <div className="cta-feature">
              <FiCheckCircle size={20} />
              <span>Free to start</span>
            </div>
            <div className="cta-feature">
              <FiCheckCircle size={20} />
              <span>No credit card required</span>
            </div>
            <div className="cta-feature">
              <FiCheckCircle size={20} />
              <span>Cancel anytime</span>
            </div>
          </div>
          <button className="cta-button primary large" onClick={handleGetStarted}>
            Start Tracking Now <FiArrowRight size={20} />
          </button>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="contact-section">
        <div className="section-header">
          <h2>Get in Touch</h2>
          <p>Have questions? We'd love to hear from you.</p>
        </div>
        <div className="contact-content">
          <form className="contact-form" onSubmit={handleContactSubmit}>
            <div className="form-group">
              <input
                type="text"
                name="name"
                placeholder="Your Name"
                value={contactForm.name}
                onChange={handleContactChange}
                required
                className="form-input"
              />
            </div>
            <div className="form-group">
              <input
                type="email"
                name="email"
                placeholder="Your Email"
                value={contactForm.email}
                onChange={handleContactChange}
                required
                className="form-input"
              />
            </div>
            <div className="form-group">
              <textarea
                name="message"
                placeholder="Your Message"
                value={contactForm.message}
                onChange={handleContactChange}
                required
                rows="5"
                className="form-textarea"
              ></textarea>
            </div>
            <button type="submit" className="cta-button primary">Send Message</button>
          </form>
          <div className="contact-info">
            <div className="info-item">
              <FiMail className="info-icon" />
              <div>
                <h4>Email</h4>
                <p>support@expensestracker.com</p>
              </div>
            </div>
            <div className="info-item">
              <FiGithub className="info-icon" />
              <div>
                <h4>GitHub</h4>
                <p>github.com/expensestracker</p>
              </div>
            </div>
            <div className="info-item">
              <FiTwitter className="info-icon" />
              <div>
                <h4>Twitter</h4>
                <p>@expensestracker</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <h3>ExpensesTracker</h3>
            <p>Smart expense tracking powered by AI. Take control of your financial future.</p>
          </div>
          <div className="footer-section">
            <h4>Quick Links</h4>
            <ul>
              <li><a href="#home">Home</a></li>
              <li><a href="#features">Features</a></li>
              <li><a href="#how-it-works">How It Works</a></li>
              <li><a href="#contact">Contact</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Follow Us</h4>
            <div className="social-links">
              <a href="https://github.com" className="social-link" target="_blank" rel="noopener noreferrer">
                <FiGithub size={20} />
              </a>
              <a href="https://twitter.com" className="social-link" target="_blank" rel="noopener noreferrer">
                <FiTwitter size={20} />
              </a>
              <a href="https://linkedin.com" className="social-link" target="_blank" rel="noopener noreferrer">
                <FiLinkedin size={20} />
              </a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2024 ExpensesTracker. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Hero;
