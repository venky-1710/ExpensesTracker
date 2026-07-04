import React from 'react';
import { FiArrowLeft } from 'react-icons/fi';
import { Link } from 'react-router-dom';

const Terms = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 mb-8 transition-colors">
          <FiArrowLeft /> Back to Home
        </Link>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 sm:p-12 transition-colors duration-300">
          <h1 className="text-3xl font-extrabold tracking-tight mb-8">Terms of Service</h1>
          <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 space-y-6">
            <p>Last updated: {new Date().toLocaleDateString()}</p>
            
            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">1. Agreement to Terms</h2>
              <p>By viewing or using this website, you agree to be bound by all of these Terms of Service. If you do not agree with any of these terms, you are prohibited from using or accessing this site.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">2. Use License</h2>
              <p>Permission is granted to temporarily download one copy of the materials (information or software) on ExpensesTracker's website for personal, non-commercial transitory viewing only.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">3. Disclaimer</h2>
              <p>The materials on ExpensesTracker's website are provided on an 'as is' basis. ExpensesTracker makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">4. Limitations</h2>
              <p>In no event shall ExpensesTracker or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on ExpensesTracker's website.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">5. Revisions and Errata</h2>
              <p>The materials appearing on ExpensesTracker's website could include technical, typographical, or photographic errors. ExpensesTracker does not warrant that any of the materials on its website are accurate, complete, or current.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;
