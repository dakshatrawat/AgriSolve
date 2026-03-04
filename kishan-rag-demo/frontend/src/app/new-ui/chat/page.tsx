"use client";

import React, { useRef, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { getOrCreateTempSessionId } from "@/lib/tempSession";

type Source = {
  text: string;
  doc_name?: string;
  doc_url?: string;
  chunk_index?: number;
  // New fields for website/PDF source tracking
  source?: string;        // URL of the webpage or PDF
  source_type?: string;   // "webpage" or "pdf"
  page_url?: string;      // For PDFs: the webpage where the PDF link was found
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
    ? "Hello! Ask me anything about your documents. I can help you analyze soil reports, crop schedules, or market trends. Please upload a document to get started."
    : "Hello! Ask me about wheat and rice advisories or crop information. I provide guidance from official sources.";

  // Chat state
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "bot",
      text: initialBotMessage,
      timestamp: "9:41 AM",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showSources, setShowSources] = useState<{ [key: number]: boolean }>(
    {},
  );

  // Audio state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null,
  );

  // Sidebar state
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");

  const supportedLanguages = [
    { code: "en", name: "English" },
    { code: "hi", name: "Hindi (हिन्दी)" },
    { code: "bn", name: "Bengali (বাংলা)" },
    { code: "te", name: "Telugu (తెలుగు)" },
    { code: "mr", name: "Marathi (मराठी)" },
    { code: "ta", name: "Tamil (தமிழ்)" },
    { code: "gu", name: "Gujarati (ગુજરાતી)" },
    { code: "kn", name: "Kannada (ಕನ್ನಡ)" },
    { code: "ml", name: "Malayalam (മലയാളം)" },
    { code: "pa", name: "Punjabi (ਪੰਜਾਬੀ)" },
    { code: "or", name: "Odia (ଓଡ଼ିଆ)" },
    { code: "as", name: "Assamese (অসমীয়া)" },
    { code: "ur", name: "Urdu (اردو)" },
    { code: "sa", name: "Sanskrit (संस्कृतम्)" },
    { code: "ne", name: "Nepali (नेपाली)" },
    { code: "kok", name: "Konkani (कोंकणी)" },
    { code: "mni", name: "Manipuri (ꯃꯅꯤꯄꯨꯔꯤ)" },
    { code: "brx", name: "Bodo (बड़ो)" },
    { code: "doi", name: "Dogri (डोगरी)" },
    { code: "mai", name: "Maithili (मैथिली)" },
    { code: "sat", name: "Santali (ᱥᱟᱱᱛᱟᱲᱤ)" },
    { code: "ks", name: "Kashmiri (कॉशुर)" },
  ];

  const getTimestamp = (): string => {
    return new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

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

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: mimeType });
        const extension = mimeType.includes("wav") ? ".wav" : ".webm";
        const audioFile = new File([audioBlob], `recording${extension}`, {
          type: mimeType,
        });
        await transcribeAudio(audioFile);
        stream.getTracks().forEach((track) => track.stop());
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
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await transcribeAudio(file);
      if (audioInputRef.current) audioInputRef.current.value = "";
    }
  };

  const transcribeAudio = async (file: File) => {
    try {
      setIsTranscribing(true);
      const formData = new FormData();
      formData.append("audio", file);
      formData.append("language", selectedLanguage);

      const res = await fetch("http://localhost:8000/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Transcription failed");
      }

      const data = await res.json();
      if (data.success && data.text) {
        setInput(data.text);
      } else {
        throw new Error(data.error || "Transcription failed");
      }
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

    setMessages((msgs) => [
      ...msgs,
      { sender: "user", text: question, timestamp },
    ]);

    const history = messages.slice(-6);

    try {
      const res = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-temp-session-id": tempSessionId,
        },
        body: JSON.stringify({
          question,
          history,
          language: selectedLanguage,
        }),
      });

      if (!res.body) throw new Error("No response from server");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let botMsg = "";
      let sources: Source[] | undefined = undefined;
      let buffer = "";
      const botTimestamp = getTimestamp();

      setMessages((msgs) => [
        ...msgs,
        { sender: "bot", text: "", timestamp: botTimestamp },
      ]);

      const appendCharByChar = async (text: string) => {
        for (let i = 0; i < text.length; i++) {
          botMsg += text[i];
          setMessages((msgs) => {
            const updated = [...msgs];
            const lastBotIdx = updated.findLastIndex((m) => m.sender === "bot");
            if (lastBotIdx !== -1) {
              updated[lastBotIdx] = {
                ...updated[lastBotIdx],
                text: botMsg,
              };
            }
            return updated;
          });
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      };

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunk = value ? decoder.decode(value) : "";
        buffer += chunk;

        const marker = "[[SOURCES]]";
        const markerIdx = buffer.indexOf(marker);

        if (markerIdx !== -1) {
          const answerPart = buffer.slice(0, markerIdx);
          await appendCharByChar(answerPart);

          const sourcesJson = buffer.slice(markerIdx + marker.length);
          try {
            const parsed = JSON.parse(sourcesJson);
            sources = parsed.sources;
          } catch (e) {
            sources = undefined;
          }
          buffer = "";
          done = true;
        } else {
          await appendCharByChar(buffer);
          buffer = "";
        }
      }

      setMessages((msgs) => {
        const updated = [...msgs];
        const lastBotIdx = updated.findLastIndex((m) => m.sender === "bot");
        if (lastBotIdx !== -1) {
          updated[lastBotIdx] = {
            ...updated[lastBotIdx],
            text: botMsg,
            sources,
          };
        }
        return updated;
      });
    } catch (err: any) {
      console.error("Chat error:", err);
      setMessages((msgs) => [
        ...msgs,
        {
          sender: "bot",
          text: "Sorry, I couldn't process your request. Please try again.",
          timestamp: getTimestamp(),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-white">
      {/* Sidebar */}
      <aside className="w-80 bg-green-50 border-r border-green-100 flex flex-col shrink-0 h-screen overflow-hidden">
        {/* Logo - Fixed at top */}
        <div className="p-8 pb-4 border-b border-green-100 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/new-ui")}
              className="size-10 bg-green-700 rounded-xl flex items-center justify-center text-white hover:bg-green-800 transition-colors"
            >
              <span className="material-symbols-outlined">eco</span>
            </button>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800">
              AgriSolve
            </h1>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          {/* Language Selection */}
          <div className="mb-10">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
              Preferred Language
            </h3>
            <div className="flex flex-col gap-2">
              {supportedLanguages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setSelectedLanguage(lang.code)}
                  className={`flex items-center justify-between w-full px-4 py-3 rounded-xl font-medium transition-all shadow-sm ${
                    selectedLanguage === lang.code
                      ? "bg-white border border-green-700 text-slate-700"
                      : "bg-white/50 border border-transparent text-slate-600 hover:bg-white hover:border-green-200"
                  }`}
                >
                  <span>{lang.name}</span>
                  {selectedLanguage === lang.code && (
                    <span className="material-symbols-outlined text-green-700 text-sm">
                      check_circle
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative bg-slate-50">
        {/* Header */}
        <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-2">
            <span className="size-2 bg-green-700 rounded-full animate-pulse"></span>
            <h2 className="font-semibold text-slate-800">AI Agricultural Assistant</h2>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-green-50 text-green-700 border border-green-100">
              Official Sources Enabled
            </span>
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 uppercase">
              {selectedLanguage}
            </span>
          </div>
        </header>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          <div className="max-w-5xl mx-auto space-y-8">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-4 ${msg.sender === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`size-10 rounded-xl flex items-center justify-center text-white shrink-0 mt-1 shadow-md ${
                    msg.sender === "user" ? "bg-slate-800" : "bg-green-700"
                  }`}
                >
                  <span className="material-symbols-outlined">
                    {msg.sender === "user" ? "person" : "smart_toy"}
                  </span>
                </div>
                <div
                  className={`space-y-1 max-w-3xl ${msg.sender === "user" ? "text-right" : ""}`}
                >
                  <div
                    className={`p-6 rounded-2xl ${
                      msg.sender === "user"
                        ? "bg-green-700 text-white rounded-tr-none shadow-md"
                        : "bg-white border border-slate-200 rounded-tl-none shadow-sm"
                    }`}
                  >
                    {msg.sender === "user" ? (
                      <p className="leading-relaxed text-[15px] font-medium">
                        {msg.text}
                      </p>
                    ) : (
                      <div className="prose prose-sm max-w-none prose-headings:text-slate-900 prose-p:text-slate-800 prose-a:text-green-700 prose-strong:text-green-700 prose-ul:text-slate-800 prose-ol:text-slate-800 prose-li:my-0.5 text-slate-800">
                        <ReactMarkdown>{msg.text || "..."}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                  {msg.timestamp && (
                    <p
                      className={`text-[11px] text-slate-400 ${msg.sender === "user" ? "mr-1" : "ml-1"}`}
                    >
                      {msg.timestamp}
                    </p>
                  )}

                  {/* Sources Display */}
                  {msg.sender === "bot" &&
                    msg.sources &&
                    msg.sources.length > 0 && (
                      <div className="mt-2">
                        <button
                          onClick={() =>
                            setShowSources((prev) => ({
                              ...prev,
                              [idx]: !prev[idx],
                            }))
                          }
                          className="text-xs font-medium text-green-700 hover:text-green-800 transition-colors flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-sm">
                            {showSources[idx] ? "expand_less" : "expand_more"}
                          </span>
                          {showSources[idx] ? "Hide" : "View"} Sources (
                          {msg.sources.length})
                        </button>

                        {showSources[idx] && (
                          <div className="mt-2 space-y-2">
                            {msg.sources.map((source, sourceIdx) => (
                              <div
                                key={sourceIdx}
                                className="p-3 bg-green-50 border-l-4 border-green-500 rounded text-xs text-slate-700"
                              >
                                {/* Source Type & Name Header */}
                                <div className="font-semibold text-green-800 mb-1 flex items-center gap-1">
                                  {source.source_type === "pdf" ? (
                                    <>📄 {source.doc_name || "PDF Document"}</>
                                  ) : source.source_type === "webpage" ? (
                                    <>🌐 Webpage Content</>
                                  ) : source.doc_name ? (
                                    <>📄 {source.doc_name}</>
                                  ) : null}
                                </div>
                                
                                {/* Source Text Preview */}
                                <p className="line-clamp-3 text-slate-600 italic">
                                  "{source.text}"
                                </p>
                                
                                {/* Source URL - Priority: source > doc_url */}
                                {(source.source || source.doc_url) && (
                                  <a
                                    href={source.source || source.doc_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-green-700 hover:text-green-800 underline mt-2 inline-flex items-center gap-1"
                                  >
                                    <span className="material-symbols-outlined text-sm">
                                      {source.source_type === "pdf" ? "picture_as_pdf" : "link"}
                                    </span>
                                    {source.source_type === "pdf" 
                                      ? "Open PDF →" 
                                      : source.source_type === "webpage"
                                        ? "View Webpage →"
                                        : "View Source →"
                                    }
                                  </a>
                                )}
                                
                                {/* Show parent webpage URL for PDFs found on a page */}
                                {source.source_type === "pdf" && source.page_url && (
                                  <div className="mt-1 text-[10px] text-slate-500">
                                    Found on:{" "}
                                    <a
                                      href={source.page_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="hover:text-green-700 underline"
                                    >
                                      {source.page_url}
                                    </a>
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

        {/* Input Area */}
        <div className="p-8 z-10">
          <div className="max-w-5xl mx-auto">
            <div className="bg-white border border-slate-200 rounded-3xl shadow-xl p-3 flex items-center gap-3">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={sending || isTranscribing}
                className={`p-3 rounded-full transition-all ${
                  isRecording
                    ? "bg-red-100 text-red-600"
                    : "text-slate-400 hover:text-green-700 hover:bg-green-50"
                } disabled:opacity-50`}
              >
                <span className="material-symbols-outlined">
                  {isRecording ? "stop_circle" : "mic"}
                </span>
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSend(e as any)}
                disabled={sending || isRecording || isTranscribing}
                className="flex-1 bg-transparent border-none focus:ring-0 text-slate-800 placeholder-slate-400 text-lg py-2 outline-none disabled:opacity-50"
                placeholder="Ask your agricultural assistant..."
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="bg-green-700 hover:bg-green-800 disabled:bg-gray-300 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <span className="material-symbols-outlined animate-spin">
                    hourglass_bottom
                  </span>
                ) : (
                  <>
                    <span>Send</span>
                    <span className="material-symbols-outlined">send</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-center text-[12px] text-slate-400 mt-4">
              AgriSolve provides guidance from official sources. Always cross-verify by visiting the sites provided in the sources button.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
