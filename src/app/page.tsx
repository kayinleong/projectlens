"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      {/* Subtle background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-32 w-96 h-96 bg-gradient-to-br from-purple-200/30 to-blue-200/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-32 w-96 h-96 bg-gradient-to-tr from-blue-200/30 to-indigo-200/30 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-slate-200/60 relative z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform">
                <span className="text-white font-bold text-sm">PL</span>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-900">
                  ProjectLens
                </h1>
                <p className="text-xs text-slate-500">
                  Accenture Enterprise Platform
                </p>
              </div>
            </div>
            <div className="text-sm text-slate-600 bg-slate-100/50 px-3 py-1 rounded-full">
              Enterprise Portal
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-16 relative z-10">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-block p-1 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl mb-8 shadow-xl transform hover:scale-105 transition-transform duration-300">
            <div className="bg-white rounded-xl px-8 py-6">
              <h2 className="text-4xl font-light bg-gradient-to-r from-slate-900 via-purple-800 to-blue-800 bg-clip-text text-transparent mb-4">
                Project Management Platform
              </h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
                Comprehensive project oversight and collaboration tools built
                specifically for Accenture teams. Access real-time analytics,
                resource management, and strategic insights.
              </p>
            </div>
          </div>

          {/* Login Section */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/50 p-8 max-w-md mx-auto transform hover:scale-105 transition-all duration-300 hover:shadow-purple-500/10">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl mx-auto mb-4 flex items-center justify-center shadow-lg">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-4">
              Employee Access
            </h3>
            <Link
              href="/auth/login"
              className="w-full inline-flex justify-center items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
            >
              <span>Sign In to ProjectLens</span>
              <svg
                className="ml-2 w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="group bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-6 transform hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/10">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-3">
              Project Analytics
            </h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Comprehensive dashboards with real-time metrics, progress
              tracking, and performance indicators across all project
              portfolios.
            </p>
          </div>

          <div className="group bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-6 transform hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-3">
              Team Collaboration
            </h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Integrated communication tools, resource allocation management,
              and cross-functional team coordination capabilities.
            </p>
          </div>

          <div className="group bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-6 transform hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-3">
              Strategic Insights
            </h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              AI-powered recommendations, trend analysis, and strategic planning
              tools to optimize project outcomes and resource utilization.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white/80 backdrop-blur-md border-t border-slate-200/60 mt-16 relative z-10">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <div>
              © {new Date().getFullYear()} Accenture. All rights reserved.
            </div>
            <div className="flex space-x-6"></div>
          </div>
        </div>
      </footer>
    </div>
  );
}
