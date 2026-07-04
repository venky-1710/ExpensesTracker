import React from 'react';
import { FiArrowLeft } from 'react-icons/fi';
import { Link } from 'react-router-dom';

const Privacy = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 mb-8 transition-colors">
          <FiArrowLeft /> Back to Home
        </Link>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 sm:p-12 transition-colors duration-300">
          <h1 className="text-3xl font-extrabold tracking-tight mb-8">Privacy Policy</h1>
          <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 space-y-6">
            <p>Last updated: {new Date().toLocaleDateString()}</p>
            
            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">1. Information We Collect</h2>
              <p>We collect information that you provide directly to us when you create an account, update your profile, use our interactive features, or communicate with us. This may include your name, email address, phone number, and any other information you choose to provide.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">2. How We Use Your Information</h2>
              <p>We use the information we collect to provide, maintain, and improve our services, to develop new ones, and to protect ExpensesTracker and our users. We also use this information to offer you tailored content.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">3. Information Sharing</h2>
              <p>We do not share your personal information with companies, organizations, or individuals outside of ExpensesTracker except in the following cases: with your consent, for external processing, or for legal reasons.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">4. Data Security</h2>
              <p>We work hard to protect ExpensesTracker and our users from unauthorized access to or unauthorized alteration, disclosure, or destruction of information we hold. We use encryption to keep your data private while in transit.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">5. Your Choices</h2>
              <p>You can review and update information about you by logging into your account and visiting your profile page. You may also contact us to request access to, correct, or delete any personal information that you have provided to us.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
