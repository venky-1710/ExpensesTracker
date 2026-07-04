import React, { useState } from 'react';
import { Link } from 'react-router-dom';

interface ContactForm {
  firstName: string;
  lastName: string;
  workEmail: string;
  phoneNumber: string;
  message: string;
}

const ContactSection = () => {
  const [form, setForm] = useState<ContactForm>({
    firstName: '',
    lastName: '',
    workEmail: '',
    phoneNumber: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
      setForm({ firstName: '', lastName: '', workEmail: '', phoneNumber: '', message: '' });
      setTimeout(() => setSubmitted(false), 3000);
    }, 1500);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  return (
    <section id="contact" className="relative w-full min-h-screen bg-transparent flex flex-col items-center pt-24 pb-20 overflow-hidden font-sans z-0 transition-colors duration-300">
      {/* Glow / Arc Effect removed to allow for continuous page gradient */}

      <div className="flex flex-col items-center text-center z-10 px-4 w-full max-w-4xl">
        <span className="text-indigo-600 dark:text-indigo-400 text-xs font-bold tracking-widest uppercase mb-4">Contacts</span>
        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight">Get in Touch with Us</h2>
        <p className="text-gray-600 dark:text-[#94a3b8] text-base md:text-lg max-w-lg mb-12">
          Please fill out the form below to share your feedback or request information about our services
        </p>

        {/* Form Container */}
        <div className="w-full max-w-[700px] bg-white/80 dark:bg-[#111827]/80 backdrop-blur-md rounded-[32px] p-8 md:p-10 border border-gray-200 dark:border-white/5 shadow-2xl relative transition-colors duration-300">
          
          {/* Subtle light specks in background - dark mode only */}
          <div className="absolute inset-0 overflow-hidden rounded-[32px] pointer-events-none -z-10 hidden dark:block">
             <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-indigo-400 rounded-full blur-[1px] opacity-40"></div>
             <div className="absolute top-1/3 right-1/4 w-1 h-1 bg-purple-300 rounded-full blur-[1px] opacity-60"></div>
             <div className="absolute bottom-1/4 right-1/3 w-1.5 h-1.5 bg-indigo-500 rounded-full blur-[2px] opacity-30"></div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* First Name */}
              <div className="flex flex-col gap-2 text-left">
                <label className="text-sm font-medium text-gray-700 dark:text-white/90 ml-1">First name</label>
                <div className="relative">
                  <input
                    type="text"
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    placeholder="Enter your first name"
                    required
                    className="w-full bg-gray-50 dark:bg-[#0B1120] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-colors"
                  />
                </div>
              </div>

              {/* Last Name */}
              <div className="flex flex-col gap-2 text-left">
                <label className="text-sm font-medium text-gray-700 dark:text-white/90 ml-1">Last name</label>
                <div className="relative">
                  <input
                    type="text"
                    name="lastName"
                    value={form.lastName}
                    onChange={handleChange}
                    placeholder="Enter your last name"
                    required
                    className="w-full bg-gray-50 dark:bg-[#0B1120] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Work Email */}
              <div className="flex flex-col gap-2 text-left">
                <label className="text-sm font-medium text-gray-700 dark:text-white/90 ml-1">Work email</label>
                <div className="relative">
                  <input
                    type="email"
                    name="workEmail"
                    value={form.workEmail}
                    onChange={handleChange}
                    placeholder="Enter work email"
                    required
                    className="w-full bg-gray-50 dark:bg-[#0B1120] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-colors"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div className="flex flex-col gap-2 text-left">
                <label className="text-sm font-medium text-gray-700 dark:text-white/90 ml-1">Phone number</label>
                <div className="relative">
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={form.phoneNumber}
                    onChange={handleChange}
                    placeholder="Enter your phone number"
                    required
                    className="w-full bg-gray-50 dark:bg-[#0B1120] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Feedback Message */}
            <div className="flex flex-col gap-2 text-left">
              <label className="text-sm font-medium text-gray-700 dark:text-white/90 ml-1">Feedback Message</label>
              <div className="relative">
                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  placeholder="How can we help?"
                  required
                  rows={4}
                  className="w-full bg-gray-50 dark:bg-[#0B1120] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-colors resize-y min-h-[100px]"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || submitted}
              className={`w-full mt-2 py-4 rounded-2xl text-white font-semibold text-sm transition-all shadow-[0_4px_14px_0_rgba(99,102,241,0.39)] dark:shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.23)] dark:hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 ${submitted ? 'bg-green-500' : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700'}`}
            >
              {submitted ? 'Submitted Successfully' : isSubmitting ? 'Submitting...' : 'Submit'}
            </button>

            {/* Footer Text */}
            <p className="text-[11px] text-gray-500 mt-1">
              By contacting with us you agree to our <Link to="/terms" className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors underline decoration-transparent hover:decoration-current">Terms</Link> and <Link to="/privacy" className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors underline decoration-transparent hover:decoration-current">Privacy Policy</Link>
            </p>
          </form>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
