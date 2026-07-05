import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './SignUp.css';
import ForgetPassword from '../ForgetPassword/ForgetPassword';
import { FiEye, FiEyeOff, FiArrowLeft } from 'react-icons/fi';
import { config } from '../../config';

declare global {
  interface Window { VANTA: any; }
}

interface Props {
  onLoginSuccess: () => void;
  initialMode?: 'signin' | 'signup';
}

interface SignupData { full_name: string; username: string; email: string; password: string; }
interface SigninData { username: string; password: string; }

const SignUp = ({ onLoginSuccess, initialMode = 'signup' }: Props) => {
  const navigate = useNavigate();
  const [isFlipped, setIsFlipped] = useState(initialMode === 'signin');
  const [showForgetPassword, setShowForgetPassword] = useState(false);
  const vantaRef = useRef<any>(null);
  const serverURL = config.SERVER_URL;

  const [signupData, setSignupData] = useState<SignupData>({ full_name: '', username: '', email: '', password: '' });
  const [signinData, setSigninData] = useState<SigninData>({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSigninPassword, setShowSigninPassword] = useState(false);
  const [signupStep, setSignupStep] = useState<1 | 2>(1);
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

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
        if (window.VANTA && !showForgetPassword) {
          vantaRef.current = window.VANTA.NET({
            el: '#signup-background',
            mouseControls: true, touchControls: true, gyroControls: false,
            minHeight: 200, minWidth: 200, scale: 1, scaleMobile: 1
          });
        }
      } catch (error) { console.error('Failed to load Vanta scripts:', error); }
    };

    if (!showForgetPassword) initVanta();
    return () => { if (vantaRef.current) { vantaRef.current.destroy(); vantaRef.current = null; } };
  }, [showForgetPassword]);

  useEffect(() => {
    if (signupStep === 2) {
      const t = setTimeout(() => otpRefs.current[0]?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [signupStep]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (new Blob([signupData.password]).size > 72) {
      toast.error('Password too long; must be 72 bytes or less');
      setLoading(false);
      return;
    }
    try {
      const payload = { ...signupData, full_name: signupData.username };
      await axios.post(`${serverURL}/auth/request-signup`, payload);
      toast.success('Verification code sent to your email!');
      setSignupStep(2);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Signup failed');
    } finally { setLoading(false); }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^[0-9]?$/.test(value)) return;
    setOtp(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    const next = Array(6).fill('');
    pasted.split('').forEach((ch, i) => { next[i] = ch; });
    setOtp(next);
    otpRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) {
      toast.error('Please enter the 6-digit code');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(`${serverURL}/auth/verify-signup`, { email: signupData.email, code });
      localStorage.setItem('token', response.data.access_token);
      toast.success('Account verified! Signing you in...');
      onLoginSuccess();
      navigate('/user-details');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Invalid or expired code');
    } finally { setLoading(false); }
  };

  const handleSignin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('username', signinData.username);
      formData.append('password', signinData.password);
      const response = await axios.post(`${serverURL}/auth/login`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      localStorage.setItem('token', response.data.access_token);
      toast.success('Sign in successful!');
      onLoginSuccess();
      navigate('/user-details');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Sign in failed');
    } finally { setLoading(false); }
  };

  if (showForgetPassword) {
    return <ForgetPassword onBack={() => setShowForgetPassword(false)} />;
  }

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
        <div className={`flip-card ${isFlipped ? 'flipped' : ''}`}>
          <div className="flip-card-inner">
            {/* FRONT: SIGN UP */}
            <div className="flip-face flip-front">
              {signupStep === 1 ? (
                <form onSubmit={handleSignup} className="signup-card">
                  <h2 className="signup-title">SIGN UP</h2>
                  <p className="signup-subtitle">Sign up with email address &amp; password</p>
                  <div className="input-group">
                    <input type="text" placeholder="Username" className="email-input"
                      value={signupData.username} onChange={(e) => setSignupData({ ...signupData, username: e.target.value })}
                      required minLength={3} />
                  </div>
                  <div className="input-group">
                    <input type="email" placeholder="Yourname@gmail.com" className="email-input"
                      value={signupData.email} onChange={(e) => setSignupData({ ...signupData, email: e.target.value })} required />
                  </div>
                  <div className="input-group">
                    <div className="password-input-wrapper">
                      <input type={showSignupPassword ? 'text' : 'password'} placeholder="Password (min 8 characters)"
                        className="email-input" value={signupData.password}
                        onChange={(e) => setSignupData({ ...signupData, password: e.target.value })} required minLength={8} />
                      <button type="button" className="password-toggle-btn" aria-label="Toggle password visibility"
                        onClick={() => setShowSignupPassword(!showSignupPassword)} tabIndex={-1}>
                        {showSignupPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                      </button>
                    </div>
                  </div>
                  <button type="submit" className="primary-btn" disabled={loading}>
                    {loading ? 'Signing up...' : 'Sign up'}
                  </button>
                  <div className="divider-wrapper"><span className="divider-text">Or continue with</span></div>
                  <div className="social-buttons">
                    <button className="social-btn google-btn">Google</button>
                    <button className="social-btn facebook-btn">Facebook</button>
                  </div>
                  <p className="terms-text">
                    Already have an account?{' '}
                    <button type="button" className="link-button" onClick={() => setIsFlipped(true)}>Sign in</button>
                  </p>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="signup-card">
                  <h2 className="signup-title">VERIFY EMAIL</h2>
                  <p className="signup-subtitle">Enter the 6-digit code sent to {signupData.email}</p>
                  <div className="otp-container">
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => { otpRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        className="otp-box"
                        value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        onPaste={handleOtpPaste}
                      />
                    ))}
                  </div>
                  <button type="submit" className="primary-btn" disabled={loading}>
                    {loading ? 'Verifying...' : 'Verify Code'}
                  </button>
                  <p className="terms-text">
                    Already have an account?{' '}
                    <button type="button" className="link-button" onClick={() => setIsFlipped(true)}>Sign in</button>
                  </p>
                </form>
              )}
            </div>

            {/* BACK: SIGN IN */}
            <div className="flip-face flip-back">
              <form onSubmit={handleSignin} className="signup-card">
                <h2 className="signup-title">SIGN IN</h2>
                <p className="signup-subtitle">Sign in with email address &amp; password</p>
                <div className="input-group">
                  <input type="email" placeholder="Yourname@gmail.com" className="email-input"
                    value={signinData.username} onChange={(e) => setSigninData({ ...signinData, username: e.target.value })} required />
                </div>
                <div className="input-group">
                  <div className="password-input-wrapper">
                    <input type={showSigninPassword ? 'text' : 'password'} placeholder="Password" className="email-input"
                      value={signinData.password} onChange={(e) => setSigninData({ ...signinData, password: e.target.value })} required />
                    <button type="button" className="password-toggle-btn" aria-label="Toggle password visibility"
                      onClick={() => setShowSigninPassword(!showSigninPassword)} tabIndex={-1}>
                      {showSigninPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                    </button>
                  </div>
                </div>
                <p className="terms-text">
                  <button type="button" className="link-button" onClick={() => setShowForgetPassword(true)}>Forget password?</button>
                </p>
                <button type="submit" className="primary-btn" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
                <div className="divider-wrapper"><span className="divider-text">Or continue with</span></div>
                <div className="social-buttons">
                  <button className="social-btn google-btn">Google</button>
                  <button className="social-btn facebook-btn">Facebook</button>
                </div>
                <p className="terms-text">
                  New here?{' '}
                  <button type="button" className="link-button" onClick={() => setIsFlipped(false)}>Sign up</button>
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
