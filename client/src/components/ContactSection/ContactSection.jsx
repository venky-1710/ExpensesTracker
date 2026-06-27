import React, { useState } from 'react';
import { FiMail, FiGithub, FiTwitter, FiSend, FiUser, FiMessageSquare } from 'react-icons/fi';
import './ContactSection.css';

const ContactSection = () => {
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate network request
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
      setContactForm({ name: '', email: '', message: '' });
      setTimeout(() => setSubmitted(false), 3000);
    }, 1500);
  };

  const handleChange = (e) => {
    setContactForm({ ...contactForm, [e.target.name]: e.target.value });
  };

  return (
    <section id="contact" className="contact-redesign-section">
      <div className="contact-ambient-orb orb-1"></div>
      <div className="contact-ambient-orb orb-2"></div>
      
      <div className="contact-container">
        <div className="contact-header">
          <h2 className="contact-title">Let's <span className="gradient-text">Connect</span></h2>
          <p className="contact-subtitle">Have a question or want to work together? Drop us a message.</p>
        </div>

        <div className="contact-content-grid">
          {/* Left: Contact Info Cards */}
          <div className="contact-info-panel">
            <a href="mailto:support@expensestracker.com" className="contact-info-card">
              <div className="card-icon-wrapper mail">
                <FiMail size={24} />
              </div>
              <div className="card-text">
                <h3>Email Us</h3>
                <p>support@expensestracker.com</p>
              </div>
            </a>
            
            <a href="https://github.com/expensestracker" target="_blank" rel="noopener noreferrer" className="contact-info-card">
              <div className="card-icon-wrapper github">
                <FiGithub size={24} />
              </div>
              <div className="card-text">
                <h3>GitHub</h3>
                <p>github.com/expensestracker</p>
              </div>
            </a>

            <a href="https://twitter.com/expensestracker" target="_blank" rel="noopener noreferrer" className="contact-info-card">
              <div className="card-icon-wrapper twitter">
                <FiTwitter size={24} />
              </div>
              <div className="card-text">
                <h3>Twitter</h3>
                <p>@expensestracker</p>
              </div>
            </a>
          </div>

          {/* Right: Contact Form */}
          <div className="contact-form-panel">
            <div className="form-glass-card">
              <form onSubmit={handleSubmit} className="modern-contact-form">
                <div className="input-group">
                  <FiUser className="input-icon" />
                  <input
                    type="text"
                    name="name"
                    value={contactForm.name}
                    onChange={handleChange}
                    placeholder="Your Name"
                    required
                    className="glass-input"
                  />
                  <span className="input-highlight"></span>
                </div>

                <div className="input-group">
                  <FiMail className="input-icon" />
                  <input
                    type="email"
                    name="email"
                    value={contactForm.email}
                    onChange={handleChange}
                    placeholder="Your Email"
                    required
                    className="glass-input"
                  />
                  <span className="input-highlight"></span>
                </div>

                <div className="input-group textarea-group">
                  <FiMessageSquare className="input-icon textarea-icon" />
                  <textarea
                    name="message"
                    value={contactForm.message}
                    onChange={handleChange}
                    placeholder="How can we help?"
                    required
                    rows="4"
                    className="glass-input glass-textarea"
                  ></textarea>
                  <span className="input-highlight"></span>
                </div>

                <button 
                  type="submit" 
                  className={`submit-btn ${isSubmitting ? 'submitting' : ''} ${submitted ? 'success' : ''}`}
                  disabled={isSubmitting || submitted}
                >
                  <span className="btn-text">
                    {submitted ? 'Message Sent!' : isSubmitting ? 'Sending...' : 'Send Message'}
                  </span>
                  {!isSubmitting && !submitted && <FiSend className="btn-icon" />}
                  {isSubmitting && <div className="btn-spinner"></div>}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
