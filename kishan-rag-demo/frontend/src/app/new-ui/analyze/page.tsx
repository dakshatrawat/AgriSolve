"use client";

import React, { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getOrCreateTempSessionId } from "@/lib/tempSession";

interface UploadedDoc {
  id: string;
  name: string;
  url?: string;
  type: "pdf" | "docx" | "url";
  size?: string;
  uploadedAt: string;
}

export default function NewUIAnalyze() {
  const router = useRouter();
  const tempSessionId = getOrCreateTempSessionId();
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [docUrl, setDocUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);
    setUploadProgress(0);

    if (!fileInputRef.current?.files?.length) {
      setUploadError("Please select a file");
      return;
    }

    setUploading(true);
    setUploadSuccess(false);
    const file = fileInputRef.current.files[0];
    const formData = new FormData();
    formData.append("file", file);

    if (docUrl.trim()) {
      formData.append("doc_url", docUrl);
    }

    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "http://localhost:8000/api/upload");
        xhr.setRequestHeader("x-temp-session-id", tempSessionId);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setUploadProgress(Math.round((event.loaded / event.total) * 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setUploadSuccess(true);
            setUploadedDocs((prev) => [
              ...prev,
              {
                id: Date.now().toString(),
                name: file.name,
                type: file.name.endsWith(".pdf") ? "pdf" : "docx",
                size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
                uploadedAt: "just now",
              },
            ]);
            setDocUrl("");
            if (fileInputRef.current) fileInputRef.current.value = "";
            resolve();
          } else {
            setUploadError(xhr.responseText || "Upload failed");
            reject(new Error(xhr.responseText || "Upload failed"));
          }
        };

        xhr.onerror = () => {
          setUploadError("Failed to upload file");
          reject(new Error("Failed to upload file"));
        };

        xhr.send(formData);
      });
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload file");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setTimeout(() => setUploadSuccess(false), 3000);
    }
  };

  const addWebsiteUrl = () => {
    if (websiteUrl.trim()) {
      setUploadedDocs((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          name: websiteUrl.split("/")[2] || websiteUrl,
          url: websiteUrl,
          type: "url",
          uploadedAt: "just now",
        },
      ]);
      setWebsiteUrl("");
    }
  };

  const removeDoc = (id: string) => {
    setUploadedDocs((prev) => prev.filter((doc) => doc.id !== id));
  };

  const handleProcessDocuments = async () => {
    if (uploadedDocs.length === 0) {
      setUploadError("Please add at least one document or URL");
      return;
    }
    // Navigate to chat with a note about documents being processed
    router.push("/new-ui/chat");
  };

  return (
    <div className="bg-gradient-to-br from-[#f0f7ef] via-white to-[#fdfdec] dark:from-[#102212] dark:via-[#0f1710] dark:to-[#1a2310] min-h-screen flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-5xl bg-white dark:bg-[#1a2e1d] rounded-2xl shadow-2xl border border-[#dbe6dc] dark:border-[#2a3a2c] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#dbe6dc] dark:border-[#2a3a2c]">
          <div>
            <h1 className="text-[#111812] dark:text-white text-2xl font-bold tracking-tight">
              Input Documents and URLs
            </h1>
            <p className="text-[#618965] dark:text-[#a0c4a4] text-sm">
              Add sources for AgriSolve to analyze and provide farming insights.
            </p>
          </div>
          <button
            onClick={() => router.push("/new-ui")}
            className="text-[#618965] hover:text-[#111812] dark:hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-3xl">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Website Analysis */}
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#2bee3b]/10 rounded-lg">
                  <span className="material-symbols-outlined text-[#2bee3b]">
                    language
                  </span>
                </div>
                <h3 className="text-[#111812] dark:text-white text-lg font-bold">
                  Website Analysis
                </h3>
              </div>
              <div className="flex flex-col gap-4">
                <p className="text-[#618965] dark:text-[#a0c4a4] text-sm leading-relaxed">
                  Paste a link to a research paper, agriculture article, or
                  market report for automated analysis.
                </p>
                <div className="relative">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-[#618965] text-xl">
                      link
                    </span>
                  </div>
                  <input
                    className="w-full h-14 pl-12 pr-12 rounded-xl border border-[#dbe6dc] dark:border-[#2a3a2c] bg-[#f6f8f6] dark:bg-[#102212] text-[#111812] dark:text-white focus:ring-2 focus:ring-[#2bee3b] focus:border-transparent outline-none transition-all placeholder:text-[#618965]"
                    placeholder="https://example.com/soil-report-2024"
                    type="text"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && addWebsiteUrl()}
                  />
                  <button
                    onClick={addWebsiteUrl}
                    className="absolute inset-y-0 right-4 flex items-center text-[#2bee3b] hover:text-[#24c932] transition-colors"
                    title="Add URL"
                  >
                    <span className="material-symbols-outlined">
                      add_circle
                    </span>
                  </button>
                </div>
                <div className="w-full h-40 rounded-xl bg-[#f6f8f6] dark:bg-[#102212] border border-dashed border-[#dbe6dc] dark:border-[#2a3a2c] flex flex-col items-center justify-center text-[#618965] gap-2">
                  <div className="w-12 h-12 bg-white dark:bg-[#1a2e1d] rounded-lg shadow-sm flex items-center justify-center overflow-hidden">
                    <img
                      alt="Preview Icon"
                      className="w-full h-full object-cover opacity-50"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuBPRBz2EN0ReHMZcIJzwvBtU5O__ioUv1ztfcB16s-at0rhoeOfF-Lfg_4NQydl20ngJiLmmW4fXPFMdN9w-S-_lDauIZ52l6Xmr8prQK2zsoYZFnin2ja-qEV24oSKOGPZAKTatySdE9QRwuke77cLdVCa1CeVKylx3uYeWnBrx-lgTug5RvHz2Gx1OgSziLjJNkKqPR4ERzO7Hd1LprzX56Dqnf6ZVIkKhZ4WYtxtRTrLZOZ1bGukufWu9PL-3rBbOk3dmfP2"
                    />
                  </div>
                  <span className="text-xs uppercase font-semibold tracking-wider">
                    URL Preview Area
                  </span>
                </div>
              </div>
            </div>

            {/* Local Files */}
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#2bee3b]/10 rounded-lg">
                  <span className="material-symbols-outlined text-[#2bee3b]">
                    description
                  </span>
                </div>
                <h3 className="text-[#111812] dark:text-white text-lg font-bold">
                  Local Files
                </h3>
              </div>
              <div className="flex-1 flex flex-col">
                <label className="flex-1 border-2 border-dashed border-[#2bee3b]/40 dark:border-[#2bee3b]/20 hover:border-[#2bee3b] bg-[#2bee3b]/5 rounded-2xl flex flex-col items-center justify-center p-8 transition-all group cursor-pointer">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.doc"
                    onChange={(e) => {
                      if (e.target.files?.length) {
                        const event = new Event("submit", { bubbles: true });
                        const form = e.target.closest("form");
                        if (!form) {
                          handleFileUpload({
                            preventDefault: () => {},
                          } as React.FormEvent);
                        }
                      }
                    }}
                    className="hidden"
                  />
                  <div className="w-20 h-20 bg-[#2bee3b]/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-5xl text-[#2bee3b]">
                      cloud_upload
                    </span>
                  </div>
                  <h4 className="text-[#111812] dark:text-white font-bold text-lg mb-2">
                    Upload Documents
                  </h4>
                  <p className="text-[#618965] dark:text-[#a0c4a4] text-sm text-center mb-6">
                    Drag and drop PDF, DOCX or images of soil reports,
                    <br />
                    crop data, and invoices.
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-8 py-3 bg-white dark:bg-[#1a2e1d] border border-[#dbe6dc] dark:border-[#2a3a2c] text-[#111812] dark:text-white font-semibold rounded-xl hover:shadow-md transition-all"
                  >
                    Browse Files
                  </button>
                </label>
              </div>
            </div>
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="mt-8 p-4 bg-[#2bee3b]/10 border border-[#2bee3b]/30 rounded-lg">
              <div className="h-2 bg-gray-200 dark:bg-[#102212] rounded-full overflow-hidden mb-2">
                <div
                  className="h-2 bg-gradient-to-r from-[#2bee3b] to-[#24c932] rounded-full transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-xs text-[#2bee3b] font-medium text-center">
                {uploadProgress}% uploaded
              </p>
            </div>
          )}

          {/* Error Message */}
          {uploadError && (
            <div className="mt-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-lg flex gap-3">
              <span className="material-symbols-outlined text-red-600 dark:text-red-400 flex-shrink-0">
                error
              </span>
              <p className="text-sm text-red-700 dark:text-red-300">
                {uploadError}
              </p>
            </div>
          )}

          {/* Success Message */}
          {uploadSuccess && (
            <div className="mt-8 p-4 bg-green-50 dark:bg-[#2bee3b]/10 border border-green-200 dark:border-[#2bee3b]/30 rounded-lg flex gap-3">
              <span className="material-symbols-outlined text-green-600 dark:text-[#2bee3b] flex-shrink-0">
                check_circle
              </span>
              <p className="text-sm text-green-700 dark:text-[#2bee3b]">
                Document uploaded successfully! It is available temporarily for this session and resets on full page refresh.
              </p>
            </div>
          )}

          {/* Recently Added */}
          {uploadedDocs.length > 0 && (
            <div className="mt-12">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[#111812] dark:text-white text-sm font-bold uppercase tracking-widest">
                  Recently Added ({uploadedDocs.length})
                </h3>
                <span
                  onClick={() => setUploadedDocs([])}
                  className="text-[#618965] text-xs font-medium cursor-pointer hover:underline"
                >
                  Clear all
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {uploadedDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-4 p-4 bg-[#f6f8f6] dark:bg-[#102212] rounded-xl border border-[#dbe6dc] dark:border-[#2a3a2c]"
                  >
                    <div
                      className={`w-10 h-10 rounded flex items-center justify-center flex-shrink-0 ${
                        doc.type === "pdf"
                          ? "bg-red-100 dark:bg-red-900/30 text-red-600"
                          : doc.type === "docx"
                            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600"
                            : "bg-green-100 dark:bg-green-900/30 text-green-600"
                      }`}
                    >
                      <span className="material-symbols-outlined">
                        {doc.type === "pdf"
                          ? "picture_as_pdf"
                          : doc.type === "docx"
                            ? "article"
                            : "link"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#111812] dark:text-white truncate">
                        {doc.name}
                      </p>
                      <p className="text-xs text-[#618965]">
                        {doc.size || "URL"} • Added {doc.uploadedAt}
                      </p>
                    </div>
                    <button
                      onClick={() => removeDoc(doc.id)}
                      className="text-[#618965] hover:text-red-500 transition-colors flex-shrink-0"
                    >
                      <span className="material-symbols-outlined text-xl">
                        delete
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-white dark:bg-[#1a2e1d] border-t border-[#dbe6dc] dark:border-[#2a3a2c]">
          <button
            onClick={handleProcessDocuments}
            disabled={uploadedDocs.length === 0}
            className="w-full bg-[#2bee3b] hover:bg-[#24c932] disabled:bg-gray-300 dark:disabled:bg-gray-600 active:scale-[0.99] transition-all text-[#102212] dark:text-white disabled:text-gray-600 font-bold py-5 rounded-xl flex items-center justify-center gap-3 shadow-xl shadow-[#2bee3b]/20 text-lg disabled:shadow-none"
          >
            <span className="material-symbols-outlined text-2xl">
              analytics
            </span>
            Process Documents
          </button>
          <p className="text-center text-[#618965] text-xs mt-4">
            AgriSolve will analyze your sources to provide tailored farming
            advice. Privacy protected.
          </p>
        </div>
      </div>
    </div>
  );
}
