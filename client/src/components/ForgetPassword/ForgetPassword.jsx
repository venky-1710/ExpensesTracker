// src/components/ForgetPassword/ForgetPassword.jsx
import React, { useEffect, useRef } from "react";
import "./ForgetPassword.css";

const ForgetPassword = ({ onBack }) => {
  const vantaRef = useRef(null);

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

        if (window.VANTA) {
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

    initVanta();

    return () => {
      if (vantaRef.current) {
        vantaRef.current.destroy();
      }
    };
  }, []);
    return (
    <div id="signup-background" className="signup-page">
        <div className="signup-right">
        <div className="signup-card">
            <h2 className="signup-title">FORGET PASSWORD</h2>
            <p className="signup-subtitle">
            Enter your email to reset password
            </p>

            <div className="input-group">
            <input
                type="email"
                placeholder="Yourname@gmail.com"
                className="email-input"
            />
            </div>

            <button className="primary-btn">Send Reset Link</button>

            <p className="terms-text">
            Remember your password?{" "}
            <button
                type="button"
                className="link-button"
                onClick={onBack}
            >
                Sign in
            </button>
            </p>
        </div>
        </div>
    </div>
    );
};

export default ForgetPassword;
