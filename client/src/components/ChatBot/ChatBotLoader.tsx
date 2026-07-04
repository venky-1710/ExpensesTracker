import React, { useEffect, useState } from 'react';
import webotLogo from '../../assets/webot_logo.png';

const steps = [
  'Uploading your file...',
  'Scanning the document...',
  'Reading transaction data...',
  'Analyzing the transactions...',
  'Categorizing expenses...',
  'Almost done...',
];

const ChatBotLoader: React.FC = () => {
  const [stepIndex, setStepIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setStepIndex((prev) => (prev + 1) % steps.length);
        setFade(true);
      }, 300);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="chatbot-loader-overlay">
      <div className="chatbot-loader-box">
        {/* Blinking logo with ripple rings */}
        <div className="chatbot-loader-logo-wrap">
          <span className="chatbot-loader-ring ring1" />
          <span className="chatbot-loader-ring ring2" />
          <img
            src={webotLogo}
            alt="WeBot"
            className="chatbot-loader-logo"
          />
        </div>

        {/* Rotating status text */}
        <p className={`chatbot-loader-text ${fade ? 'fade-in' : 'fade-out'}`}>
          {steps[stepIndex]}
        </p>

        {/* Animated progress dots */}
        <div className="chatbot-loader-dots">
          <span /><span /><span />
        </div>
      </div>
    </div>
  );
};

export default ChatBotLoader;
