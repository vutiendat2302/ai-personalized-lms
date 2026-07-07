import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export const Landing: React.FC = () => {
  const { auth } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white text-gray-900 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Navigation */}
        <nav className="flex justify-between items-center py-6">
          <div className="text-2xl font-extrabold text-indigo-600 tracking-tight">
            AI-LMS
          </div>
          <div className="space-x-4">
            {auth.accessToken ? (
              <Link
                to="/dashboard"
                className="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-lg shadow hover:bg-indigo-700 transition duration-200"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-5 py-2.5 text-indigo-600 font-medium hover:text-indigo-800 transition duration-200"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-lg shadow hover:bg-indigo-700 transition duration-200"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </nav>

        {/* Hero Section */}
        <div className="text-center py-24 sm:py-32">
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-gray-900 mb-8">
            Personalized Learning, <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
              Powered by AI.
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-xl text-gray-500 mx-auto">
            Experience the next generation of education. Our AI-driven LMS adapts to your unique learning style, tracking progress and providing intelligent insights to maximize your potential.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            {!auth.accessToken ? (
              <Link
                to="/register"
                className="px-8 py-3.5 bg-indigo-600 text-white text-lg font-semibold rounded-full shadow-lg hover:bg-indigo-700 hover:-translate-y-0.5 transition-all duration-200"
              >
                Get Started for Free
              </Link>
            ) : (
              <Link
                to="/dashboard"
                className="px-8 py-3.5 bg-indigo-600 text-white text-lg font-semibold rounded-full shadow-lg hover:bg-indigo-700 hover:-translate-y-0.5 transition-all duration-200"
              >
                Continue Learning
              </Link>
            )}
          </div>
        </div>

        {/* Feature Grid */}
        <div className="py-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition duration-200">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4 text-2xl">
              🎯
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Smart Assessments</h3>
            <p className="text-gray-500">Automated grading and real-time feedback to keep you on the right track.</p>
          </div>
          <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition duration-200">
            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4 text-2xl">
              🧠
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">AI Pathways</h3>
            <p className="text-gray-500">Dynamic course materials tailored exactly to your strengths and weaknesses.</p>
          </div>
          <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition duration-200">
            <div className="w-12 h-12 bg-pink-100 text-pink-600 rounded-xl flex items-center justify-center mx-auto mb-4 text-2xl">
              📊
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Progress Tracking</h3>
            <p className="text-gray-500">Comprehensive dashboards and analytics to visualize your learning journey.</p>
          </div>
        </div>

      </div>
    </div>
  );
};
