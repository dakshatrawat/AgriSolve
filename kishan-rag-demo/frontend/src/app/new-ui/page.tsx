"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NewUILanding() {
  const router = useRouter();

  return (
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
              href="#"
            >
              Home
            </a>
            <a
              className="text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-[#2bee3b] transition-colors"
              href="#"
            >
              Features
            </a>
            <a
              className="text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-[#2bee3b] transition-colors"
              href="#"
            >
              About
            </a>
          </div>
          <div className="flex items-center gap-4">
            <button className="px-6 py-2.5 rounded-full bg-[#111812] dark:bg-white text-white dark:text-[#111812] text-sm font-bold transition-transform active:scale-95">
              Sign In
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
      <section className="py-24 px-6 max-w-7xl mx-auto w-full">
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
          <button className="px-12 py-5 bg-[#2bee3b] text-[#111812] rounded-full text-xl font-bold shadow-xl shadow-[#2bee3b]/20 hover:scale-105 transition-transform">
            Create Free Account
          </button>
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
          <div className="flex gap-8 text-sm font-medium text-gray-500">
            <a className="hover:text-[#2bee3b]" href="#">
              Privacy Policy
            </a>
            <a className="hover:text-[#2bee3b]" href="#">
              Terms of Service
            </a>
            <a className="hover:text-[#2bee3b]" href="#">
              Contact Support
            </a>
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
  );
}
