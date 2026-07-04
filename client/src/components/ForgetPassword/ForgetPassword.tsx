import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { authService } from '../../services/authService';
import './ForgetPassword.css';
import { FiEye, FiEyeOff, FiArrowLeft } from 'react-icons/fi';

declare global {
  interface Window {
    VANTA: any;
  }
}

interface Props {
  onBack: () => void;
}

const ForgetPassword = ({ onBack }: Props) => {
  const navigate = useNavigate();
  const vantaRef = useRef<any>(null);
  
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const loadScript = (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
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
            el: '#signup-background',
            mouseControls: true,
            touchControls: true,
            gyroControls: false,
            minHeight: 200,
            minWidth: 200,
            scale: 1,
            scaleMobile: 1,
          });
        }
      } catch (error) {
        console.error('Failed to load Vanta scripts:', error);
      }
    };

    initVanta();
    return () => { if (vantaRef.current) vantaRef.current.destroy(); };
  }, []);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email');
      return;
    }
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      toast.success('Reset code sent to your email!');
      setIsCodeSent(true);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to send reset code');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !newPassword) {
      toast.error('Please enter the reset code and new password');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await authService.resetPassword({ email, code, new_password: newPassword });
      toast.success('Password reset successfully! You can now log in.');
      onBack();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="signup-background" className="signup-page relative">
      <button 
        onClick={() => navigate('/')}
        className="absolute top-6 left-6 md:top-8 md:left-8 flex items-center gap-2 text-white/70 hover:text-white bg-transparent border-none p-0 transition-colors z-50 font-medium cursor-pointer"
        style={{ zIndex: 100 }}
      >
        <FiArrowLeft size={18} /> Back to Home
      </button>
      <div className="signup-right">
        <div className="signup-card">
          <h2 className="signup-title">{isCodeSent ? 'RESET PASSWORD' : 'FORGET PASSWORD'}</h2>
          <p className="signup-subtitle">
            {isCodeSent ? 'Enter the reset code sent to your email and a new password' : 'Enter your email to receive a password reset code'}
          </p>

          {!isCodeSent ? (
            <form onSubmit={handleSendCode} style={{width: '100%'}}>
              <div className="input-group">
                <input 
                  type="email" 
                  placeholder="Yourname@gmail.com" 
                  className="email-input" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
              </div>
              <button type="submit" className="primary-btn" disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} style={{width: '100%'}}>
              <div className="input-group" style={{ marginBottom: '16px' }}>
                <input 
                  type="text" 
                  placeholder="Reset Code" 
                  className="email-input" 
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required 
                />
              </div>
              <div className="input-group">
                <div className="password-input-wrapper">
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    placeholder="New Password (min 8 characters)" 
                    className="email-input" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required 
                    minLength={8}
                  />
                  <button type="button" className="password-toggle-btn" aria-label="Toggle password visibility"
                    onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                    {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                  </button>
                </div>
              </div>
              <button type="submit" className="primary-btn" disabled={loading}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}

          <p className="terms-text" style={{ marginTop: '16px' }}>
            Remember your password?{' '}
            <button type="button" className="link-button" onClick={onBack}>Sign in</button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgetPassword;
