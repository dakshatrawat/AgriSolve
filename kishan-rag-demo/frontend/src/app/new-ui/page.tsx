"use client";

import { useRouter } from "next/navigation";
import { MouseEvent, useState } from "react";
import ThemeToggle from "@/lib/ThemeToggle";

export default function NewUILanding() {
  const router = useRouter();
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleScrollToFeatures = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    document.getElementById("features-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleScrollToTop = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAdminLogin = () => {
    if (adminEmail === "dakshatrawat77@gmail.com" && adminPassword === "Dakshat@123") {
      setShowAdminModal(false);
      setAdminEmail("");
      setAdminPassword("");
      setAdminError("");
      router.push("/new-ui/admin");
      return;
    }
    setAdminError("Invalid admin email or password.");
  };

  return (
    <>
      {/* Admin Login Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-6 max-w-md w-full mx-4 shadow-xl border border-gray-200 dark:border-neutral-700">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 dark:bg-neutral-800 rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-gray-700 dark:text-gray-300 text-xl">admin_panel_settings</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Admin Login</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Enter credentials to continue</p>
                </div>
              </div>
              <button
                onClick={() => { setShowAdminModal(false); setAdminEmail(""); setAdminPassword(""); setAdminError(""); }}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-gray-400 text-xl">close</span>
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => { setAdminEmail(e.target.value); if (adminError) setAdminError(""); }}
                  placeholder="admin@example.com"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Password</label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => { setAdminPassword(e.target.value); if (adminError) setAdminError(""); }}
                  placeholder="Enter password"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              {adminError && (
                <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-600 dark:text-red-400">{adminError}</p>
                </div>
              )}
              <button
                onClick={handleAdminLogin}
                disabled={!adminEmail.trim() || !adminPassword.trim()}
                className="w-full py-2.5 bg-white dark:bg-gray-100 text-gray-900 rounded-lg font-medium text-sm hover:bg-gray-100 dark:hover:bg-white transition-all disabled:opacity-40 disabled:cursor-not-allowed mt-1 border border-gray-300 dark:border-transparent"
              >
                Sign in
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-white dark:bg-[#0f0f0f]">
        {/* Navigation */}
        <nav className="sticky top-0 z-[100] w-full bg-white/90 dark:bg-[#0f0f0f]/90 backdrop-blur-md border-b border-gray-200 dark:border-neutral-800">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-gray-900 dark:bg-white rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-white dark:text-gray-900 text-lg">eco</span>
              </div>
              <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-gray-100">AgriSolve</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" href="#top" onClick={handleScrollToTop}>Home</a>
              <a className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" href="#features-section" onClick={handleScrollToFeatures}>Features</a>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button
                onClick={() => setShowAdminModal(true)}
                className="hidden sm:inline-flex px-4 py-2 rounded-lg border border-gray-300 dark:border-neutral-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
              >
                Admin
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-gray-700 dark:text-gray-300 text-xl">{mobileMenuOpen ? "close" : "menu"}</span>
              </button>
            </div>
          </div>
          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200 dark:border-neutral-800 px-6 py-3 flex flex-col gap-2 bg-white dark:bg-[#0f0f0f]">
              <a className="text-sm font-medium text-gray-900 dark:text-gray-100 py-2" href="#top" onClick={(e) => { handleScrollToTop(e); setMobileMenuOpen(false); }}>Home</a>
              <a className="text-sm font-medium text-gray-500 dark:text-gray-400 py-2" href="#features-section" onClick={(e) => { handleScrollToFeatures(e); setMobileMenuOpen(false); }}>Features</a>
              <button
                onClick={() => { setShowAdminModal(true); setMobileMenuOpen(false); }}
                className="text-left text-sm font-medium text-gray-500 dark:text-gray-400 py-2"
              >
                Admin
              </button>
            </div>
          )}
        </nav>

        {/* Hero */}
        <header className="relative w-full py-16 sm:py-24 md:py-32 flex items-center justify-center bg-gray-50 dark:bg-[#111111] border-b border-gray-200 dark:border-neutral-800">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-0 left-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-blue-50 dark:bg-blue-900/20 rounded-full blur-3xl opacity-60" />
            <div className="absolute bottom-0 right-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-emerald-50 dark:bg-emerald-900/20 rounded-full blur-3xl opacity-60" />
          </div>
          <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300 mb-6">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
              AI-Powered Agricultural Intelligence
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-50 leading-tight tracking-tight mb-5">
              Smarter decisions for
              <br />modern agriculture
            </h1>
            <p className="text-base sm:text-lg text-gray-500 dark:text-gray-400 mb-8 sm:mb-10 max-w-xl mx-auto leading-relaxed">
              Analyze soil reports, process crop documents, and get real-time expert advice powered by RAG and multilingual AI.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => router.push("/new-ui/chat")}
                className="w-full sm:w-auto px-6 py-3 bg-white dark:bg-gray-100 text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-white transition-colors flex items-center justify-center gap-2 border border-gray-300 dark:border-transparent"
              >
                <span className="material-symbols-outlined text-lg">chat</span>
                Start Chatting
              </button>
              <button
                onClick={() => router.push("/new-ui/analyze")}
                className="w-full sm:w-auto px-6 py-3 bg-transparent border border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">upload_file</span>
                Analyze Documents
              </button>
            </div>
          </div>
        </header>

        {/* Features */}
        <section id="features-section" className="py-20 px-6 max-w-6xl mx-auto w-full">
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-50 mb-3">Built for modern farming</h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-lg mx-auto text-sm">
              Combine deep agronomy knowledge with intelligent document processing and multilingual support.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-neutral-800 p-7 rounded-xl hover:border-gray-300 dark:hover:border-neutral-700 hover:shadow-sm transition-all">
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-xl">description</span>
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">Document Analysis</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                Extract key data from soil tests, chemical labels, and machinery manuals with intelligent processing.
              </p>
            </div>
            <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-neutral-800 p-7 rounded-xl hover:border-gray-300 dark:hover:border-neutral-700 hover:shadow-sm transition-all">
              <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-xl">forum</span>
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">Multilingual Chat</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                Get expert answers in 22 languages including Hindi, Bengali, Tamil, and Hinglish voice input.
              </p>
            </div>
            <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-neutral-800 p-7 rounded-xl hover:border-gray-300 dark:hover:border-neutral-700 hover:shadow-sm transition-all">
              <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-xl">tips_and_updates</span>
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">Source-Backed Answers</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                Every response cites official sources -- government portals, institutional advisories, and verified publications.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gray-50 dark:bg-[#111111] border-y border-gray-200 dark:border-neutral-800 py-16 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-3">Ready to get started?</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
              Upload your documents or start a conversation to get data-driven agricultural insights.
            </p>
            <button
              onClick={() => router.push("/new-ui/chat")}
              className="px-6 py-3 bg-white dark:bg-gray-100 text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-white transition-colors border border-gray-300 dark:border-transparent"
            >
              Open Assistant
            </button>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-200 dark:border-neutral-800 py-8 px-6">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gray-900 dark:bg-white rounded flex items-center justify-center">
                <span className="material-symbols-outlined text-white dark:text-gray-900 text-sm">eco</span>
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">AgriSolve</span>
            </div>
            <p className="text-xs text-gray-400">&copy; 2025 AgriSolve. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </>
  );
}
