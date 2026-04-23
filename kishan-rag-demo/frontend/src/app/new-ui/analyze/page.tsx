"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getOrCreateTempSessionId } from "@/lib/tempSession";
import ThemeToggle from "@/lib/ThemeToggle";
import { API_URL } from "@/lib/api";

interface UploadedDoc {
  id: string;
  name: string;
  type: "pdf" | "docx";
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
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);
    setUploadProgress(0);
    if (!fileInputRef.current?.files?.length) { setUploadError("Please select a file"); return; }

    setUploading(true);
    setUploadSuccess(false);
    const file = fileInputRef.current.files[0];
    const formData = new FormData();
    formData.append("file", file);

    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${API_URL}/api/upload`);
        xhr.setRequestHeader("x-temp-session-id", tempSessionId);
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) setUploadProgress(Math.round((event.loaded / event.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setUploadSuccess(true);
            setUploadedDocs((prev) => [...prev, {
              id: Date.now().toString(), name: file.name,
              type: file.name.endsWith(".pdf") ? "pdf" : "docx",
              size: `${(file.size / 1024 / 1024).toFixed(1)} MB`, uploadedAt: "just now",
            }]);
            if (fileInputRef.current) fileInputRef.current.value = "";
            resolve();
          } else { setUploadError(xhr.responseText || "Upload failed"); reject(new Error(xhr.responseText || "Upload failed")); }
        };
        xhr.onerror = () => { setUploadError("Failed to upload file"); reject(new Error("Failed to upload file")); };
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

  const removeDoc = (id: string) => setUploadedDocs((prev) => prev.filter((doc) => doc.id !== id));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f0f0f] flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-2xl bg-white dark:bg-[#1a1a1a] rounded-xl shadow-sm border border-gray-200 dark:border-neutral-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-neutral-800">
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Upload Documents</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">PDF or DOCX files for analysis</p>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <button onClick={() => router.push("/new-ui")} className="p-1.5 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
              <span className="material-symbols-outlined text-gray-400 text-xl">close</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <label className="border-2 border-dashed border-gray-300 dark:border-neutral-700 hover:border-gray-400 dark:hover:border-neutral-600 bg-gray-50 dark:bg-[#141414] hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-xl flex flex-col items-center justify-center p-10 transition-all cursor-pointer">
            <input ref={fileInputRef} type="file" accept=".pdf,.docx,.doc" onChange={(e) => { if (e.target.files?.length) handleFileUpload({ preventDefault: () => {} } as React.FormEvent); }} className="hidden" />
            <div className="w-12 h-12 bg-gray-200 dark:bg-neutral-700 rounded-xl flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-2xl text-gray-500 dark:text-gray-400">upload_file</span>
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Click to upload or drag and drop</p>
            <p className="text-xs text-gray-400 dark:text-neutral-500">PDF, DOCX up to 50MB</p>
          </label>

          {uploading && (
            <div className="mt-4 p-3 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg">
              <div className="h-1.5 bg-gray-200 dark:bg-neutral-700 rounded-full overflow-hidden mb-2">
                <div className="h-1.5 bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">{uploadProgress}%</p>
            </div>
          )}

          {uploadError && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex gap-2 items-start">
              <span className="material-symbols-outlined text-red-500 dark:text-red-400 text-lg shrink-0">error</span>
              <p className="text-sm text-red-600 dark:text-red-400">{uploadError}</p>
            </div>
          )}

          {uploadSuccess && (
            <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg flex gap-2 items-start">
              <span className="material-symbols-outlined text-emerald-500 dark:text-emerald-400 text-lg shrink-0">check_circle</span>
              <p className="text-sm text-emerald-700 dark:text-emerald-400">Document uploaded. Available for this session only.</p>
            </div>
          )}

          {uploadedDocs.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-400 dark:text-neutral-500 uppercase tracking-wider">Documents ({uploadedDocs.length})</h3>
                <button onClick={() => setUploadedDocs([])} className="text-xs text-gray-400 dark:text-neutral-500 hover:text-red-500 dark:hover:text-red-400 transition-colors">Clear all</button>
              </div>
              <div className="space-y-2">
                {uploadedDocs.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#141414] rounded-lg border border-gray-200 dark:border-neutral-800">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${doc.type === "pdf" ? "bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400" : "bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400"}`}>
                      <span className="material-symbols-outlined text-base">{doc.type === "pdf" ? "picture_as_pdf" : "article"}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{doc.name}</p>
                      <p className="text-xs text-gray-400 dark:text-neutral-500">{doc.size}</p>
                    </div>
                    <button onClick={() => removeDoc(doc.id)} className="text-gray-300 dark:text-neutral-600 hover:text-red-500 dark:hover:text-red-400 transition-colors shrink-0">
                      <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white dark:bg-[#1a1a1a] border-t border-gray-200 dark:border-neutral-800">
          <button
            onClick={() => { if (uploadedDocs.length === 0) { setUploadError("Please upload at least one document"); return; } router.push("/new-ui/chat?mode=docs"); }}
            disabled={uploadedDocs.length === 0}
            className="w-full bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 disabled:bg-gray-200 dark:disabled:bg-neutral-700 disabled:text-gray-400 dark:disabled:text-neutral-500 text-white dark:text-gray-900 font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm transition-colors disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-lg">chat</span>
            Analyze in Chat
          </button>
        </div>
      </div>
    </div>
  );
}
