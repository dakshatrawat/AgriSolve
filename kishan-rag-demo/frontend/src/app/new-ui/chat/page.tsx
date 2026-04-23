"use client";

import React, { useRef, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { getOrCreateTempSessionId } from "@/lib/tempSession";
import ThemeToggle from "@/lib/ThemeToggle";
import { API_URL } from "@/lib/api";

type Source = {
  text: string;
  doc_name?: string;
  doc_url?: string;
  chunk_index?: number;
  source?: string;
  source_type?: string;
  page_url?: string;
};

type Message = {
  sender: string;
  text: string;
  sources?: Source[];
  timestamp?: string;
};

export default function NewUIChat() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tempSessionId = getOrCreateTempSessionId();
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const isDocsMode = searchParams.get("mode") === "docs";
  const initialBotMessage = isDocsMode
    ? "Ready to help with your documents. Ask me anything about the files you've uploaded -- soil reports, crop schedules, or market data."
    : "Hello. Ask me about crop advisories, farming practices, or agricultural information. I provide guidance backed by official sources.";

  const [messages, setMessages] = useState<Message[]>([
    { sender: "bot", text: initialBotMessage, timestamp: "Now" },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showSources, setShowSources] = useState<{ [key: number]: boolean }>({});

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const supportedLanguages = [
    { code: "en", name: "English" },
    { code: "hi", name: "Hindi", native: "हिन्दी" },
    { code: "bn", name: "Bengali", native: "বাংলা" },
    { code: "te", name: "Telugu", native: "తెలుగు" },
    { code: "mr", name: "Marathi", native: "मराठी" },
    { code: "ta", name: "Tamil", native: "தமிழ்" },
    { code: "gu", name: "Gujarati", native: "ગુજરાતી" },
    { code: "kn", name: "Kannada", native: "ಕನ್ನಡ" },
    { code: "ml", name: "Malayalam", native: "മലയാളം" },
    { code: "pa", name: "Punjabi", native: "ਪੰਜਾਬੀ" },
    { code: "or", name: "Odia", native: "ଓଡ଼ିଆ" },
    { code: "as", name: "Assamese", native: "অসমীয়া" },
    { code: "ur", name: "Urdu", native: "اردو" },
    { code: "sa", name: "Sanskrit", native: "संस्कृतम्" },
    { code: "ne", name: "Nepali", native: "नेपाली" },
    { code: "kok", name: "Konkani", native: "कोंकणी" },
    { code: "mni", name: "Manipuri", native: "ꯃꯅꯤꯄꯨꯔꯤ" },
    { code: "brx", name: "Bodo", native: "बड़ो" },
    { code: "doi", name: "Dogri", native: "डोगरी" },
    { code: "mai", name: "Maithili", native: "मैथिली" },
    { code: "sat", name: "Santali", native: "ᱥᱟᱱᱛᱟᱲᱤ" },
    { code: "ks", name: "Kashmiri", native: "कॉशुर" },
  ];

  const getTimestamp = (): string =>
    new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/wav")
          ? "audio/wav"
          : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: mimeType });
        const ext = mimeType.includes("wav") ? ".wav" : ".webm";
        await transcribeAudio(new File([audioBlob], `recording${ext}`, { type: mimeType }));
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err: any) {
      console.error("Microphone error:", err);
      alert("Microphone access denied. Please allow microphone access.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) { mediaRecorder.stop(); setIsRecording(false); setMediaRecorder(null); }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { await transcribeAudio(file); if (audioInputRef.current) audioInputRef.current.value = ""; }
  };

  const transcribeAudio = async (file: File) => {
    try {
      setIsTranscribing(true);
      const formData = new FormData();
      formData.append("audio", file);
      formData.append("language", selectedLanguage);
      const res = await fetch(`${API_URL}/api/transcribe`, { method: "POST", body: formData });
      if (!res.ok) throw new Error("Transcription failed");
      const data = await res.json();
      if (data.success && data.text) setInput(data.text);
      else throw new Error(data.error || "Transcription failed");
    } catch (err: any) {
      console.error("Audio transcription error:", err);
      alert("Could not transcribe audio. Please try again.");
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending || isRecording || isTranscribing) return;

    setSending(true);
    const question = input.trim();
    const timestamp = getTimestamp();
    setInput("");
    const botTimestamp = getTimestamp();
    setMessages((msgs) => [
      ...msgs,
      { sender: "user", text: question, timestamp },
      { sender: "bot", text: "", timestamp: botTimestamp },
    ]);
    const history = messages.slice(-6);

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-temp-session-id": tempSessionId },
        body: JSON.stringify({ question, history, language: selectedLanguage }),
      });
      if (!res.body) throw new Error("No response from server");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false, botMsg = "", buffer = "";
      let sources: Source[] | undefined;

      const appendCharByChar = async (text: string) => {
        for (let i = 0; i < text.length; i++) {
          botMsg += text[i];
          setMessages((msgs) => {
            const updated = [...msgs];
            const idx = updated.findLastIndex((m) => m.sender === "bot");
            if (idx !== -1) updated[idx] = { ...updated[idx], text: botMsg };
            return updated;
          });
          await new Promise((r) => setTimeout(r, 10));
        }
      };

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        buffer += value ? decoder.decode(value) : "";
        const marker = "[[SOURCES]]";
        const markerIdx = buffer.indexOf(marker);
        if (markerIdx !== -1) {
          await appendCharByChar(buffer.slice(0, markerIdx));
          try { sources = JSON.parse(buffer.slice(markerIdx + marker.length)).sources; } catch { sources = undefined; }
          buffer = "";
          done = true;
        } else {
          await appendCharByChar(buffer);
          buffer = "";
        }
      }

      setMessages((msgs) => {
        const updated = [...msgs];
        const idx = updated.findLastIndex((m) => m.sender === "bot");
        if (idx !== -1) updated[idx] = { ...updated[idx], text: botMsg, sources };
        return updated;
      });
    } catch (err: any) {
      console.error("Chat error:", err);
      setMessages((msgs) => [...msgs, { sender: "bot", text: "Sorry, I couldn't process your request. Please try again.", timestamp: getTimestamp() }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-white dark:bg-[#0f0f0f]">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? "w-64" : "w-0"} bg-gray-50 dark:bg-[#141414] border-r border-gray-200 dark:border-neutral-800 flex flex-col shrink-0 h-screen overflow-hidden transition-all duration-200`}>
        <div className="px-5 py-4 border-b border-gray-200 dark:border-neutral-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <button onClick={() => router.push("/new-ui")} className="w-8 h-8 bg-gray-900 dark:bg-white rounded-lg flex items-center justify-center text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors">
              <span className="material-symbols-outlined text-lg">eco</span>
            </button>
            <span className="text-sm font-bold tracking-tight text-gray-900 dark:text-gray-100">AgriSolve</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <h3 className="text-[10px] font-semibold text-gray-400 dark:text-neutral-500 uppercase tracking-wider mb-3 px-2">Language</h3>
          <div className="flex flex-col gap-0.5">
            {supportedLanguages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setSelectedLanguage(lang.code)}
                className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedLanguage === lang.code
                    ? "bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 text-gray-900 dark:text-gray-100 font-medium shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800"
                }`}
              >
                <span className="truncate">
                  {lang.name}
                  {lang.native && <span className="text-gray-400 dark:text-neutral-500 ml-1">({lang.native})</span>}
                </span>
                {selectedLanguage === lang.code && (
                  <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-sm">check</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="px-3 py-3 border-t border-gray-200 dark:border-neutral-800">
          <button
            onClick={() => router.push("/new-ui/analyze")}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">upload_file</span>
            Upload Documents
          </button>
        </div>
      </aside>

      {/* Main Chat */}
      <main className="flex-1 flex flex-col relative bg-white dark:bg-[#0f0f0f]">
        <header className="h-14 border-b border-gray-200 dark:border-neutral-800 bg-white dark:bg-[#0f0f0f] flex items-center justify-between px-5 z-10 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
              <span className="material-symbols-outlined text-gray-500 dark:text-gray-400 text-xl">{sidebarOpen ? "menu_open" : "menu"}</span>
            </button>
            <div className="h-5 w-px bg-gray-200 dark:bg-neutral-700" />
            <h2 className="text-sm font-medium text-gray-900 dark:text-gray-100">Agricultural Assistant</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">RAG Active</span>
            <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-neutral-700 uppercase">{selectedLanguage}</span>
            <ThemeToggle />
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-6">
          <div className="max-w-3xl mx-auto space-y-5">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 ${msg.sender === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                  msg.sender === "user"
                    ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                    : "bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-400"
                }`}>
                  <span className="material-symbols-outlined text-base">{msg.sender === "user" ? "person" : "smart_toy"}</span>
                </div>
                <div className={`space-y-1 max-w-2xl ${msg.sender === "user" ? "text-right" : ""}`}>
                  <div className={`px-4 py-3 rounded-xl text-sm leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-tr-sm"
                      : "bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-neutral-800 text-gray-800 dark:text-gray-200 rounded-tl-sm"
                  }`}>
                    {msg.sender === "user" ? (
                      <p>{msg.text}</p>
                    ) : !msg.text ? (
                      <div className="flex items-center gap-1 py-1 px-0.5">
                        <span className="w-2 h-2 bg-gray-400 dark:bg-neutral-500 rounded-full animate-bounce [animation-delay:0ms]" />
                        <span className="w-2 h-2 bg-gray-400 dark:bg-neutral-500 rounded-full animate-bounce [animation-delay:150ms]" />
                        <span className="w-2 h-2 bg-gray-400 dark:bg-neutral-500 rounded-full animate-bounce [animation-delay:300ms]" />
                      </div>
                    ) : (
                      <div className="prose prose-sm max-w-none prose-headings:text-gray-900 dark:prose-headings:text-gray-100 prose-headings:font-semibold prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-ul:text-gray-700 dark:prose-ul:text-gray-300 prose-ol:text-gray-700 dark:prose-ol:text-gray-300 prose-li:my-0.5 prose-code:text-gray-800 dark:prose-code:text-gray-200 prose-code:bg-gray-100 dark:prose-code:bg-neutral-800 prose-code:px-1 prose-code:rounded">
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                  {msg.timestamp && (
                    <p className={`text-[10px] text-gray-400 dark:text-neutral-500 ${msg.sender === "user" ? "mr-1" : "ml-1"}`}>{msg.timestamp}</p>
                  )}

                  {/* Sources */}
                  {msg.sender === "bot" && msg.sources && msg.sources.length > 0 && (
                    <div className="mt-1.5">
                      <button
                        onClick={() => setShowSources((prev) => ({ ...prev, [idx]: !prev[idx] }))}
                        className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors flex items-center gap-0.5"
                      >
                        <span className="material-symbols-outlined text-sm">{showSources[idx] ? "expand_less" : "expand_more"}</span>
                        {showSources[idx] ? "Hide" : "View"} {msg.sources.length} source{msg.sources.length !== 1 ? "s" : ""}
                      </button>
                      {showSources[idx] && (
                        <div className="mt-2 space-y-1.5">
                          {msg.sources.map((source, sourceIdx) => (
                            <div key={sourceIdx} className="p-2.5 bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-neutral-800 rounded-lg text-xs">
                              <div className="font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-sm text-gray-400 dark:text-neutral-500">
                                  {source.source_type === "pdf" ? "picture_as_pdf" : source.source_type === "webpage" ? "language" : "article"}
                                </span>
                                {source.source_type === "pdf" ? source.doc_name || "PDF Document" : source.source_type === "webpage" ? "Webpage" : source.doc_name || "Document"}
                              </div>
                              <p className="line-clamp-2 text-gray-500 dark:text-gray-400 mb-1.5">{source.text}</p>
                              {(source.source || source.doc_url) && (
                                <a href={source.source || source.doc_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1">
                                  <span className="material-symbols-outlined text-xs">open_in_new</span>Open source
                                </a>
                              )}
                              {source.source_type === "pdf" && source.page_url && (
                                <div className="mt-1 text-[10px] text-gray-400 dark:text-neutral-500">
                                  Found on: <a href={source.page_url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 dark:hover:text-blue-400 underline">{source.page_url}</a>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="px-5 pb-5 pt-3 z-10 border-t border-gray-100 dark:border-neutral-800">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-neutral-700 rounded-xl p-1.5 flex items-center gap-1.5 focus-within:border-gray-400 dark:focus-within:border-neutral-600 focus-within:ring-1 focus-within:ring-gray-200 dark:focus-within:ring-neutral-700 transition-all">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={sending || isTranscribing}
                className={`p-2 rounded-lg transition-colors ${isRecording ? "bg-red-50 dark:bg-red-900/30 text-red-500" : "text-gray-400 dark:text-neutral-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800"} disabled:opacity-40`}
              >
                <span className="material-symbols-outlined text-xl">{isRecording ? "stop_circle" : "mic"}</span>
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSend(e as any)}
                disabled={sending || isRecording || isTranscribing}
                className="flex-1 bg-transparent border-none focus:ring-0 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-neutral-500 text-sm py-2 outline-none disabled:opacity-50"
                placeholder={isTranscribing ? "Transcribing..." : "Ask a question..."}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 disabled:bg-gray-200 dark:disabled:bg-neutral-700 disabled:text-gray-400 dark:disabled:text-neutral-500 text-white dark:text-gray-900 p-2.5 rounded-lg transition-colors disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-lg">arrow_upward</span>
              </button>
            </div>
            <p className="text-center text-[11px] text-gray-400 dark:text-neutral-500 mt-2.5">
              Responses cite official sources. Verify critical decisions independently.
            </p>
          </div>
        </div>
      </main>

      <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={handleAudioUpload} />
    </div>
  );
}
