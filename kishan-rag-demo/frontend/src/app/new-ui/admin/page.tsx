"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ThemeToggle from "@/lib/ThemeToggle";
import { API_URL } from "@/lib/api";

export default function AdminPage() {
  const router = useRouter();
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<{ success: boolean; message: string; total_chunks_ingested?: number } | null>(null);

  const handleScrapeAndIngest = async () => {
    if (!websiteUrl.trim()) return;
    setIsLoading(true);
    setScrapeResult(null);
    try {
      const response = await fetch(`${API_URL}/api/pdf-rag/scrape-and-ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: websiteUrl, skip_image_pages: true, extract_webpage_content: true }),
      });
      const data = await response.json();
      setScrapeResult(data);
      if (data.success) setTimeout(() => { setShowLinkModal(false); setWebsiteUrl(""); setScrapeResult(null); }, 3000);
    } catch {
      setScrapeResult({ success: false, message: "Failed to connect to server. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0f0f0f] text-gray-900 dark:text-gray-100">
      {/* Ingest Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-6 max-w-md w-full mx-4 shadow-xl border border-gray-200 dark:border-neutral-700">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 dark:bg-neutral-800 rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-gray-700 dark:text-gray-300 text-xl">link</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Ingest from URL</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Scrape webpage content and linked PDFs</p>
                </div>
              </div>
              <button onClick={() => { setShowLinkModal(false); setWebsiteUrl(""); setScrapeResult(null); }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
                <span className="material-symbols-outlined text-gray-400 text-xl">close</span>
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Website URL</label>
                <input
                  type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://example.com/agriculture-guide" disabled={isLoading}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              <p className="text-xs text-gray-400 dark:text-neutral-500">Content and linked PDFs will be extracted, chunked, and added to the knowledge base.</p>

              {scrapeResult && (
                <div className={`p-3 rounded-lg ${scrapeResult.success ? "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800" : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"}`}>
                  <div className="flex items-center gap-2">
                    <span className={`material-symbols-outlined text-lg ${scrapeResult.success ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                      {scrapeResult.success ? "check_circle" : "error"}
                    </span>
                    <p className={`text-sm font-medium ${scrapeResult.success ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>{scrapeResult.message}</p>
                  </div>
                  {scrapeResult.success && scrapeResult.total_chunks_ingested && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 ml-7">{scrapeResult.total_chunks_ingested} chunks added</p>
                  )}
                </div>
              )}

              <button
                onClick={handleScrapeAndIngest} disabled={isLoading || !websiteUrl.trim()}
                className="w-full py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-medium text-sm hover:bg-gray-800 dark:hover:bg-gray-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <><span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>Processing...</>
                ) : (
                  <><span className="material-symbols-outlined text-lg">cloud_download</span>Scrape & Ingest</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="sticky top-0 z-[100] w-full bg-white/90 dark:bg-[#0f0f0f]/90 backdrop-blur-md border-b border-gray-200 dark:border-neutral-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 bg-gray-900 dark:bg-white rounded-lg flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-white dark:text-gray-900 text-lg">eco</span>
            </div>
            <span className="text-sm font-bold tracking-tight text-gray-900 dark:text-gray-100">AgriSolve</span>
            <span className="ml-1 sm:ml-2 text-[10px] font-semibold px-1.5 sm:px-2 py-0.5 rounded bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-neutral-700 uppercase tracking-wider">Admin</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle />
            <button onClick={() => router.push("/new-ui")} className="p-1.5 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors sm:hidden">
              <span className="material-symbols-outlined text-gray-500 dark:text-gray-400 text-xl">arrow_back</span>
            </button>
            <button onClick={() => router.push("/new-ui")} className="hidden sm:inline-flex text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">Back to home</button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="px-4 sm:px-6 py-6 sm:py-10">
        <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
          <section className="rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-[#1a1a1a] p-5 sm:p-8">
            <div className="flex flex-col gap-4 sm:gap-6 md:flex-row md:items-center md:justify-between">
              <div className="max-w-lg">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-50 mb-2">Knowledge Base Management</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  Add verified agricultural sources to the knowledge base. Content is scraped, chunked, embedded, and made available for RAG retrieval.
                </p>
              </div>
              <button
                onClick={() => setShowLinkModal(true)}
                className="w-full md:w-auto px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors inline-flex items-center justify-center gap-2 shrink-0"
              >
                <span className="material-symbols-outlined text-lg">add</span>Add Source
              </button>
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-[#1a1a1a] p-6">
              <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-lg">verified</span>
              </div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1.5">Verified Sources</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Add government portals, institutional advisories, and trusted agricultural publications to maintain data quality.
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-[#1a1a1a] p-6">
              <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-lg">security</span>
              </div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1.5">Access Control</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Ingestion is restricted to admin users to maintain knowledge base integrity and data governance.
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
