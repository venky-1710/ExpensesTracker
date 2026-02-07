// src/components/SignUp.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./SignUp.css";
import ForgetPassword from "../ForgetPassword/ForgetPassword";
import { config } from "../../config";

const SignUp = ({ onLoginSuccess, initialMode = "signup" }) => {
  const navigate = useNavigate();
  const [isFlipped, setIsFlipped] = useState(initialMode === "signin");
  const [showForgetPassword, setShowForgetPassword] = useState(false);
  const vantaRef = useRef(null);
  const serverURL = config.SERVER_URL;  // Backend URL

  // Form states
  const [signupData, setSignupData] = useState({ full_name: '', username: '', email: '', password: '' });
  const [signinData, setSigninData] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadScript = (src) => {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    };

    const initVanta = async () => {
      try {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js');
        await loadScript('https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.net.min.js');

        if (window.VANTA && !showForgetPassword) {
          vantaRef.current = window.VANTA.NET({
            el: "#signup-background",
            mouseControls: true,
            touchControls: true,
            gyroControls: false,
            minHeight: 200.00,
            minWidth: 200.00,
            scale: 1.00,
            scaleMobile: 1.00
          });
        }
      } catch (error) {
        console.error('Failed to load Vanta scripts:', error);
      }
    };

    if (!showForgetPassword) {
      initVanta();
    }

    return () => {
      if (vantaRef.current) {
        vantaRef.current.destroy();
        vantaRef.current = null;
      }
    };
  }, [showForgetPassword]);

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Client-side password length validation
    if (new Blob([signupData.password]).size > 72) {
      toast.error('Password too long; must be 72 bytes or less');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${serverURL}/auth/signup`, signupData);
      toast.success('Signup successful! Signing you in...');
      // Auto sign in after signup
      const formData = new FormData();
      formData.append('username', signupData.email); // Use email as username for login
      formData.append('password', signupData.password);
      const loginResponse = await axios.post(`${serverURL}/auth/login`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      localStorage.setItem('token', loginResponse.data.access_token);
      onLoginSuccess();
      navigate('/user-details');
    } catch (error) {
      // Enhanced error handling to display specific server messages
      const errorMessage = error.response?.data?.detail || 'Signup failed';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSignin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('username', signinData.username);
      formData.append('password', signinData.password);
      const response = await axios.post(`${serverURL}/auth/login`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      localStorage.setItem('token', response.data.access_token);
      toast.success('Sign in successful!');
      onLoginSuccess();
      navigate('/user-details');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  if (showForgetPassword) {
    return <ForgetPassword onBack={() => setShowForgetPassword(false)} />;
  }

  return (
    <div id="signup-background" className="signup-page">
      <div className="signup-right">
        {/* flip wrapper */}
        <div className={`flip-card ${isFlipped ? "flipped" : ""}`}>
          <div className="flip-card-inner">
            {/* FRONT: SIGN UP */}
            <div className="flip-face flip-front">
              <form onSubmit={handleSignup} className="signup-card">
                <h2 className="signup-title">SIGN UP</h2>
                <p className="signup-subtitle">
                  Sign up with email address &amp; password
                </p>

                <div className="input-group">
                  <input
                    type="text"
                    placeholder="Full Name"
                    className="email-input"
                    value={signupData.full_name}
                    onChange={(e) => setSignupData({ ...signupData, full_name: e.target.value })}
                    required
                    minLength="2"
                  />
                </div>

                <div className="input-group">
                  <input
                    type="text"
                    placeholder="Username"
                    className="email-input"
                    value={signupData.username}
                    onChange={(e) => setSignupData({ ...signupData, username: e.target.value })}
                    required
                    minLength="3"
                  />
                </div>

                <div className="input-group">
                  <input
                    type="email"
                    placeholder="Yourname@gmail.com"
                    className="email-input"
                    value={signupData.email}
                    onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                    required
                  />
                </div>


                <div className="input-group">
                  <input
                    type="password"
                    placeholder="Password (min 8 characters)"
                    className="email-input"
                    value={signupData.password}
                    onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                    required
                    minLength="8"
                  />
                </div>

                <button type="submit" className="primary-btn" disabled={loading}>
                  {loading ? 'Signing up...' : 'Sign up'}
                </button>

                <div className="divider-wrapper">
                  <span className="divider-text">Or continue with</span>
                </div>

                <div className="social-buttons">
                  <button className="social-btn google-btn">Google</button>
                  <button className="social-btn facebook-btn">Facebook</button>
                </div>

                <p className="terms-text">
                  Already have an account?{" "}
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => setIsFlipped(true)}
                  >
                    Sign in
                  </button>
                </p>
              </form>
            </div>

            {/* BACK: SIGN IN */}
            <div className="flip-face flip-back">
              <form onSubmit={handleSignin} className="signup-card">
                <h2 className="signup-title">SIGN IN</h2>
                <p className="signup-subtitle">
                  Sign in with email address &amp; password
                </p>

                <div className="input-group">
                  <input
                    type="email"
                    placeholder="Yourname@gmail.com"
                    className="email-input"
                    value={signinData.username}
                    onChange={(e) => setSigninData({ ...signinData, username: e.target.value })}
                    required
                  />
                </div>

                <div className="input-group">
                  <input
                    type="password"
                    placeholder="Password"
                    className="email-input"
                    value={signinData.password}
                    onChange={(e) => setSigninData({ ...signinData, password: e.target.value })}
                    required
                  />
                </div>

                <p className="terms-text">
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => setShowForgetPassword(true)}
                  >
                    Forget password?
                  </button>
                </p>

                <button type="submit" className="primary-btn" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>

                <div className="divider-wrapper">
                  <span className="divider-text">Or continue with</span>
                </div>

                <div className="social-buttons">
                  <button className="social-btn google-btn">Google</button>
                  <button className="social-btn facebook-btn">Facebook</button>
                </div>

                <p className="terms-text">
                  New here?{" "}
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => setIsFlipped(false)}
                  >
                    Sign up
                  </button>
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
