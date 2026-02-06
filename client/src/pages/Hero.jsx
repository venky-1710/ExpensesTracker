import React, { useState } from 'react';
import NavBar from '../components/NavBar/NavBar';
import './Hero.css';

const Hero = () => {
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    message: ''
  });

  const handleContactSubmit = (e) => {
    e.preventDefault();
    // Handle contact form submission
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

      {/* Home Section */}
      <section id="home" className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Welcome to Our Amazing App</h1>
          <p className="hero-subtitle">
            Discover powerful features that will transform your experience. Join thousands of users who have already upgraded their workflow.
          </p>
          <div className="hero-buttons">
            <button className="cta-button primary">Get Started Free</button>
            <button className="cta-button secondary">Learn More</button>
          </div>
        </div>
        <div className="hero-image">
          <div className="hero-placeholder">
            <span>App Preview</span>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="about-section">
        <div className="section-content">
          <h2>About Us</h2>
          <p className="section-description">
            We are a passionate team dedicated to creating innovative solutions that make a difference in people's lives.
            Our mission is to provide cutting-edge technology that empowers users to achieve their goals efficiently and effectively.
          </p>
          <div className="about-stats">
            <div className="stat-card">
              <h3>10K+</h3>
              <p>Happy Users</p>
            </div>
            <div className="stat-card">
              <h3>500+</h3>
              <p>Projects Completed</p>
            </div>
            <div className="stat-card">
              <h3>24/7</h3>
              <p>Support Available</p>
            </div>
          </div>
        </div>
      </section>

      {/* Vision Section */}
      <section id="vision" className="vision-section">
        <div className="section-content">
          <h2>Our Vision</h2>
          <p className="section-description">
            To be the leading provider of innovative technology solutions that empower individuals and businesses
            to reach their full potential. We envision a world where technology seamlessly integrates with daily life,
            making complex tasks simple and accessible to everyone.
          </p>
          <div className="vision-goals">
            <div className="goal-item">
              <div className="goal-icon">🚀</div>
              <h4>Innovation</h4>
              <p>Constantly pushing boundaries with cutting-edge technology</p>
            </div>
            <div className="goal-item">
              <div className="goal-icon">🌍</div>
              <h4>Accessibility</h4>
              <p>Making technology accessible to everyone, everywhere</p>
            </div>
            <div className="goal-item">
              <div className="goal-icon">💡</div>
              <h4>Creativity</h4>
              <p>Fostering creativity through intuitive and powerful tools</p>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section id="mission" className="mission-section">
        <div className="section-content">
          <h2>Our Mission</h2>
          <p className="section-description">
            To deliver exceptional user experiences through thoughtful design, robust functionality, and unwavering commitment
            to quality. We strive to build products that not only meet user needs but exceed their expectations, creating
            lasting value and meaningful connections.
          </p>
          <div className="mission-values">
            <div className="value-card">
              <h4>Quality First</h4>
              <p>Every feature is crafted with attention to detail and rigorous testing</p>
            </div>
            <div className="value-card">
              <h4>User-Centric</h4>
              <p>Our users' needs and feedback drive every decision we make</p>
            </div>
            <div className="value-card">
              <h4>Continuous Learning</h4>
              <p>We embrace change and constantly evolve to stay ahead</p>
            </div>
            <div className="value-card">
              <h4>Collaboration</h4>
              <p>We believe in the power of teamwork and open communication</p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="contact-section">
        <div className="section-content">
          <h2>Contact Us</h2>
          <p className="section-description">
            Have questions or want to get in touch? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
          </p>
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
                <h4>📧 Email</h4>
                <p>contact@myapp.com</p>
              </div>
              <div className="info-item">
                <h4>📞 Phone</h4>
                <p>+1 (555) 123-4567</p>
              </div>
              <div className="info-item">
                <h4>📍 Address</h4>
                <p>123 Tech Street<br />Innovation City, IC 12345</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <h3>MyApp</h3>
            <p>Empowering your digital journey with innovative solutions.</p>
          </div>
          <div className="footer-section">
            <h4>Quick Links</h4>
            <ul>
              <li><a href="#home">Home</a></li>
              <li><a href="#about">About</a></li>
              <li><a href="#vision">Vision</a></li>
              <li><a href="#mission">Mission</a></li>
              <li><a href="#contact">Contact</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Follow Us</h4>
            <div className="social-links">
              <a href="#" className="social-link">Facebook</a>
              <a href="#" className="social-link">Twitter</a>
              <a href="#" className="social-link">LinkedIn</a>
              <a href="#" className="social-link">Instagram</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2024 MyApp. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Hero;
