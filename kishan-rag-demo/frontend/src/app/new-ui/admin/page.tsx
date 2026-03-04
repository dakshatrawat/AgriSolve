"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminPage() {
  const router = useRouter();
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<{
    success: boolean;
    message: string;
    total_chunks_ingested?: number;
  } | null>(null);

  const handleScrapeAndIngest = async () => {
    if (!websiteUrl.trim()) return;

    setIsLoading(true);
    setScrapeResult(null);

    try {
      const response = await fetch("http://localhost:8000/api/pdf-rag/scrape-and-ingest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: websiteUrl,
          skip_image_pages: true,
          extract_webpage_content: true,
        }),
      });

      const data = await response.json();
      setScrapeResult(data);

      if (data.success) {
        setTimeout(() => {
          setShowLinkModal(false);
          setWebsiteUrl("");
          setScrapeResult(null);
        }, 3000);
      }
    } catch (error) {
      setScrapeResult({
        success: false,
        message: "Failed to connect to server. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a120b] text-[#111812] dark:text-white">
      {showLinkModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#111812] rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl border border-[#dbe6dc] dark:border-white/10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#2bee3b]/10 rounded-xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#2bee3b] text-2xl">link</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#111812] dark:text-white">Official Data Ingestion</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Add official data sources by secure web scraping</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowLinkModal(false);
                  setWebsiteUrl("");
                  setScrapeResult(null);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-gray-500">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Website URL
                </label>
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://example.com/agriculture-guide"
                  className="w-full px-4 py-3 rounded-xl border border-[#dbe6dc] dark:border-white/20 bg-white dark:bg-[#0a120b] text-[#111812] dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2bee3b] focus:border-transparent transition-all"
                  disabled={isLoading}
                />
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400">
                AgriSolve will scrape the webpage content and any linked PDFs, then add them to your knowledge base for intelligent Q&amp;A.
              </p>

              {scrapeResult && (
                <div className={`p-4 rounded-xl ${scrapeResult.success ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800" : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"}`}>
                  <div className="flex items-center gap-2">
                    <span className={`material-symbols-outlined ${scrapeResult.success ? "text-green-600" : "text-red-600"}`}>
                      {scrapeResult.success ? "check_circle" : "error"}
                    </span>
                    <p className={`text-sm font-medium ${scrapeResult.success ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}>
                      {scrapeResult.message}
                    </p>
                  </div>
                  {scrapeResult.success && scrapeResult.total_chunks_ingested && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1 ml-7">
                      {scrapeResult.total_chunks_ingested} chunks added to knowledge base
                    </p>
                  )}
                </div>
              )}

              <button
                onClick={handleScrapeAndIngest}
                disabled={isLoading || !websiteUrl.trim()}
                className="w-full py-4 bg-[#2bee3b] text-[#111812] rounded-xl font-bold text-lg hover:bg-[#24c932] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">cloud_download</span>
                    Scrape &amp; Ingest
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="sticky top-0 z-[100] w-full bg-white/80 dark:bg-[#0a120b]/80 backdrop-blur-md border-b border-[#dbe6dc] dark:border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-[#2bee3b] p-1.5 rounded-lg">
              <span className="material-symbols-outlined text-[#111812] font-bold">eco</span>
            </div>
            <span className="text-2xl font-black tracking-tight text-[#111812] dark:text-white">AgriSolve</span>
            <span className="ml-3 text-xs font-bold px-3 py-1 rounded-full bg-[#2bee3b]/10 text-[#111812] dark:text-white border border-[#2bee3b]/30">
              ADMIN
            </span>
          </div>
          <button
            onClick={() => router.push("/new-ui")}
            className="px-5 py-2.5 rounded-full border border-[#dbe6dc] dark:border-white/20 text-sm font-bold hover:border-[#2bee3b] hover:text-[#2bee3b] transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </nav>

      <main className="px-6 py-10 md:py-14">
        <div className="max-w-6xl mx-auto space-y-8">
          <section className="relative overflow-hidden rounded-3xl border border-[#dbe6dc] dark:border-white/10 bg-white dark:bg-[#111812] p-8 md:p-10 soft-green-shadow">
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-[#2bee3b]/10 blur-2xl" />
            <div className="absolute -bottom-16 -left-16 w-40 h-40 rounded-full bg-[#2bee3b]/10 blur-2xl" />

            <div className="relative z-10 flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold tracking-wide text-[#2bee3b] mb-3">OFFICIAL KNOWLEDGE MANAGEMENT</p>
                <h1 className="text-3xl md:text-5xl font-black leading-tight mb-4">Admin Control Panel</h1>
                <p className="text-gray-600 dark:text-gray-400 text-base md:text-lg">
                  Curate verified agricultural sources and enrich your assistant with trusted official information.
                </p>
              </div>

              <button
                onClick={() => setShowLinkModal(true)}
                className="w-full md:w-auto px-8 py-4 bg-[#2bee3b] text-[#111812] rounded-2xl text-base font-bold hover:bg-[#24c932] transition-all inline-flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">link</span>
                Add Official Data via Web Scraping
              </button>
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-[#dbe6dc] dark:border-white/10 bg-white dark:bg-[#111812] p-6">
              <div className="w-12 h-12 rounded-xl bg-[#2bee3b]/10 text-[#2bee3b] flex items-center justify-center mb-4">
                <span className="material-symbols-outlined">verified</span>
              </div>
              <h2 className="text-xl font-bold mb-2">Verified Source Intake</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Add links from government portals, institutional advisories, and trusted agricultural publications.
              </p>
            </div>

            <div className="rounded-2xl border border-[#dbe6dc] dark:border-white/10 bg-white dark:bg-[#111812] p-6">
              <div className="w-12 h-12 rounded-xl bg-[#2bee3b]/10 text-[#2bee3b] flex items-center justify-center mb-4">
                <span className="material-symbols-outlined">security</span>
              </div>
              <h2 className="text-xl font-bold mb-2">Controlled Access</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Keep ingestion actions inside the admin workspace to maintain data quality and governance.
              </p>
            </div>
          </section>
        </div>
      </main>

      <style jsx>{`
        .soft-green-shadow {
          box-shadow: 0 14px 35px -12px rgba(43, 238, 59, 0.18);
        }
      `}</style>
    </div>
  );
}
