"use client";

import { useRouter } from "next/navigation";
import { MouseEvent, useState } from "react";

export default function NewUILanding() {
  const router = useRouter();
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");

  const handleScrollToFeatures = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const featuresSection = document.getElementById("features-section");
    featuresSection?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleScrollToTop = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAdminLogin = () => {
    if (
      adminEmail === "dakshatrawat77@gmail.com" &&
      adminPassword === "Dakshat@123"
    ) {
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
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#111812] rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl border border-[#dbe6dc] dark:border-white/10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#2bee3b]/10 rounded-xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#2bee3b] text-2xl">admin_panel_settings</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#111812] dark:text-white">Admin Login</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Enter admin credentials to continue</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAdminModal(false);
                  setAdminEmail("");
                  setAdminPassword("");
                  setAdminError("");
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-gray-500">close</span>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Admin Email
                </label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => {
                    setAdminEmail(e.target.value);
                    if (adminError) setAdminError("");
                  }}
                  placeholder="Enter admin email"
                  className="w-full px-4 py-3 rounded-xl border border-[#dbe6dc] dark:border-white/20 bg-white dark:bg-[#0a120b] text-[#111812] dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2bee3b] focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => {
                    setAdminPassword(e.target.value);
                    if (adminError) setAdminError("");
                  }}
                  placeholder="Enter password"
                  className="w-full px-4 py-3 rounded-xl border border-[#dbe6dc] dark:border-white/20 bg-white dark:bg-[#0a120b] text-[#111812] dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2bee3b] focus:border-transparent transition-all"
                />
              </div>

              {adminError && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-700 dark:text-red-300">{adminError}</p>
                </div>
              )}
              
              <button
                onClick={handleAdminLogin}
                disabled={!adminEmail.trim() || !adminPassword.trim()}
                className="w-full py-4 bg-[#2bee3b] text-[#111812] rounded-xl font-bold text-lg hover:bg-[#24c932] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">login</span>
                Login as Admin
              </button>
            </div>
          </div>
        </div>
      )}
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-[100] w-full bg-white/80 dark:bg-[#0a120b]/80 backdrop-blur-md border-b border-[#dbe6dc] dark:border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-[#2bee3b] p-1.5 rounded-lg">
              <span className="material-symbols-outlined text-[#111812] font-bold">
                eco
              </span>
            </div>
            <span className="text-2xl font-black tracking-tight text-[#111812] dark:text-white">
              AgriSolve
            </span>
          </div>
          <div className="hidden md:flex items-center gap-10">
            <a
              className="text-sm font-semibold hover:text-[#2bee3b] transition-colors"
              href="#top"
              onClick={handleScrollToTop}
            >
              Home
            </a>
            <a
              className="text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-[#2bee3b] transition-colors"
              href="#features-section"
              onClick={handleScrollToFeatures}
            >
              Features
            </a>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowAdminModal(true)}
              className="px-6 py-2.5 rounded-full bg-[#111812] dark:bg-white text-white dark:text-[#111812] text-sm font-bold transition-transform active:scale-95"
            >
              Admin
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Header */}
      <header className="relative w-full min-h-[85vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-black/40 z-10"></div>
          <img
            alt="Sunlit crops"
            className="w-full h-full object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDLqu6bS93JTBN3khzbtS56LTvzi0bhHqcXKlV4Iyn864l963n0plN8Npf4qEnB5xvj-K3ziVx4E1_LOVBTsUhUFxj6LNbWFdk-6IWvG4GHYIr1BPHqJ9rlgD-L5Vgpuc3moLS8gqXfKPT5piMDSTBu6_yZl2WMb9cBPxjkz7erf2sc6Dc_FtbHIjztraN1yEEMUtopy_CFLRh-PLL8PlmzJWvL04P-3R3P6vmbLcPO7d7uRFVB0aYhEn7gOvvsb2TEEIz4rB25whJR"
          />
        </div>
        <div className="relative z-20 max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-5xl md:text-7xl font-black text-white leading-[1.1] tracking-tight mb-6">
            Modern Agricultural Assistant
          </h1>
          <p className="text-lg md:text-xl text-white/90 font-medium mb-12 max-w-2xl mx-auto leading-relaxed">
            Harness the power of AI to analyze soil reports, crop documents, and
            get real-time expert advice for your farm.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => router.push("/new-ui/chat")}
              className="w-full sm:w-auto px-10 py-5 bg-[#2bee3b] text-[#111812] rounded-full text-lg font-bold shadow-2xl shadow-[#2bee3b]/40 hover:bg-[#24c932] transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">chat_bubble</span>
              Start Chatting
            </button>
            <button
              onClick={() => router.push("/new-ui/analyze")}
              className="w-full sm:w-auto px-10 py-5 bg-white/20 backdrop-blur-xl border border-white/40 text-white rounded-full text-lg font-bold hover:bg-white/30 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">upload_file</span>
              Analyze Documents
            </button>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section id="features-section" className="py-24 px-6 max-w-7xl mx-auto w-full">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-black mb-4">
            Empowering Modern Farmers
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
            Our platform combines deep agronomy knowledge with cutting-edge
            document processing.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Feature Card 1 */}
          <div className="soft-green-shadow bg-white dark:bg-[#152016] border border-[#dbe6dc] dark:border-white/5 p-10 rounded-2xl flex flex-col items-center text-center group hover:-translate-y-2 transition-transform duration-300">
            <div className="w-16 h-16 bg-[#2bee3b]/10 text-[#2bee3b] rounded-2xl flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-4xl">
                description
              </span>
            </div>
            <h3 className="text-xl font-bold mb-4">Document Analysis</h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Instantly extract key data from soil tests, chemical labels, and
              machinery manuals with our intelligent OCR.
            </p>
          </div>

          {/* Feature Card 2 */}
          <div className="soft-green-shadow bg-white dark:bg-[#152016] border border-[#dbe6dc] dark:border-white/5 p-10 rounded-2xl flex flex-col items-center text-center group hover:-translate-y-2 transition-transform duration-300">
            <div className="w-16 h-16 bg-[#2bee3b]/10 text-[#2bee3b] rounded-2xl flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-4xl">forum</span>
            </div>
            <h3 className="text-xl font-bold mb-4">Smart Chat</h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Get 24/7 expert answers to complex agricultural questions,
              specifically tailored to your local climate.
            </p>
          </div>

          {/* Feature Card 3 */}
          <div className="soft-green-shadow bg-white dark:bg-[#152016] border border-[#dbe6dc] dark:border-white/5 p-10 rounded-2xl flex flex-col items-center text-center group hover:-translate-y-2 transition-transform duration-300">
            <div className="w-16 h-16 bg-[#2bee3b]/10 text-[#2bee3b] rounded-2xl flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-4xl">
                tips_and_updates
              </span>
            </div>
            <h3 className="text-xl font-bold mb-4">Instant Solutions</h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Receive actionable recommendations for fertilization, pest
              control, and irrigation based on real-time data.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-[#2bee3b]/5 dark:bg-white/5 py-20 px-6 mt-10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-black mb-6">
            Ready to optimize your yield?
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-10 max-w-xl mx-auto">
            Join progressive farmers who use AgriSolve to make data-driven
            decisions every day.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#dbe6dc] dark:border-white/10 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="bg-[#2bee3b] p-1 rounded">
              <span className="material-symbols-outlined text-[#111812] text-sm font-bold">
                eco
              </span>
            </div>
            <span className="text-xl font-black tracking-tight">AgriSolve</span>
          </div>
          <p className="text-sm text-gray-400">
            © 2024 AgriSolve AI. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Tailwind CSS for soft shadow */}
      <style jsx>{`
        .soft-green-shadow {
          box-shadow: 0 10px 30px -5px rgba(43, 238, 59, 0.15);
        }
      `}</style>
    </div>
    </>
  );
}
