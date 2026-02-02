"use client";
import React, { useRef, useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";

type Source = {
  text: string;
  doc_name?: string;
  doc_url?: string;
  chunk_index?: number;
};

type Message = {
  sender: string;
  text: string;
  sources?: Source[];
};

// Design tokens for consistency
const TOKENS = {
  borderRadius: {
    sm: "0.5rem",
    md: "0.75rem",
    lg: "1rem",
    xl: "1.5rem",
  },
  shadow: {
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  },
};

// Subtle decorative background elements
const DecorativeElements = () => (
  <>
    {/* Soft background blurs */}
    <div className="absolute top-0 right-0 w-96 h-96 bg-blue-50 rounded-full blur-3xl opacity-30 -z-10 pointer-events-none" />
    <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-50 rounded-full blur-3xl opacity-20 -z-10 pointer-events-none" />
    
    {/* Minimal corner accents */}
    <div className="absolute top-24 right-24 w-2 h-2 bg-blue-200 rounded-full opacity-40 -z-10 pointer-events-none" />
    <div className="absolute top-32 right-32 w-1.5 h-1.5 bg-indigo-200 rounded-full opacity-30 -z-10 pointer-events-none" />
  </>
);

// Message bubble component
// CRITICAL: Displays messages exactly as stored - no translation in UI
const MessageBubble = ({ message, isUser }: { message: Message; isUser: boolean }) => (
  <div
    className={`px-4 py-3 rounded-lg transition-all duration-200 ${
      isUser
        ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-md"
        : "bg-white text-gray-900 border border-gray-200 shadow-sm hover:shadow-md"
    }`}
    style={{ borderRadius: TOKENS.borderRadius.md }}
    translate="no" // Prevent browser auto-translation
  >
    {isUser ? (
      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
        {message.text}
      </p>
    ) : (
      <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-800 prose-a:text-blue-600 prose-strong:text-gray-900 prose-ul:text-gray-800 prose-ol:text-gray-800 prose-headings:my-2 prose-p:my-2 prose-li:my-1">
        <ReactMarkdown>{message.text || "..."}</ReactMarkdown>
      </div>
    )}
  </div>
);

// Sources card component
const SourcesCard = ({
  sources,
  isExpanded,
  onToggle,
}: {
  sources: Source[];
  isExpanded: boolean;
  onToggle: () => void;
}) => {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3 animate-in fade-in duration-200">
      <button
        type="button"
        onClick={onToggle}
        className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-200 rounded-md px-2 py-1 hover:bg-blue-50"
      >
        {isExpanded ? "− Hide Sources" : "+ Show Sources"}
      </button>

      {isExpanded && (
        <div
          className="mt-2 p-4 bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200 shadow-sm"
          style={{ borderRadius: TOKENS.borderRadius.md }}
        >
          <div className="flex items-center gap-2 mb-3">
            <svg
              className="w-4 h-4 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h4 className="text-sm font-semibold text-gray-900">
              Retrieved Context
            </h4>
          </div>
          <div className="space-y-3">
            {sources.map((source: Source, idx: number) => (
              <div
                key={idx}
                className="text-sm text-gray-700 pl-3 border-l-2 border-blue-200 hover:border-blue-300 transition-colors"
              >
                <p className="italic mb-2 text-gray-600 leading-relaxed">
                  "{source.text.substring(0, 200)}
                  {source.text.length > 200 ? "..." : ""}"
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  {source.doc_name && (
                    <span className="font-medium">{source.doc_name}</span>
                  )}
                  {source.doc_url && (
                    <>
                      <span>•</span>
                      <a
                        href={source.doc_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 underline transition-colors"
                      >
                        View Document
                      </a>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Icon button component
const IconButton = ({
  onClick,
  disabled,
  isActive,
  children,
  title,
  className = "",
}: {
  onClick: () => void;
  disabled?: boolean;
  isActive?: boolean;
  children: React.ReactNode;
  title: string;
  className?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-40 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 ${className}`}
    style={{ borderRadius: TOKENS.borderRadius.md }}
  >
    {children}
  </button>
);

export default function Home() {
  // Refs
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([
    { sender: "bot", text: "Hello! Ask me anything about your documents." },
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

  // Language selection state - FIRST CLASS STATE (persists across messages)
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");

  // Supported languages - easily extensible
  const supportedLanguages = [
    { code: "en", name: "English" },
    { code: "hi", name: "Hindi" },
    { code: "mr", name: "Marathi" },
  ];

  // Language-specific placeholders - reflects selected language
  const getPlaceholder = (): string => {
    if (isRecording) return "Recording...";
    if (isTranscribing) return "Transcribing...";
    
    const placeholders: { [key: string]: string } = {
      en: "Type your message or use voice...",
      hi: "अपना संदेश टाइप करें या आवाज़ का उपयोग करें...",
      mr: "तुमचा संदेश टाइप करा किंवा आवाज वापरा...",
    };
    return placeholders[selectedLanguage] || placeholders.en;
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Audio recording handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Prefer webm over mp4 (mp4 requires FFmpeg, webm works better with librosa)
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/wav")
          ? "audio/wav"
          : MediaRecorder.isTypeSupported("audio/mp4")
            ? "audio/mp4"
            : "audio/webm"; // fallback

      console.log(`Using audio format: ${mimeType}`);
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: mimeType });
        const extension = mimeType.includes("wav")
          ? ".wav"
          : mimeType.includes("mp4")
            ? ".mp4"
            : ".webm";
        const audioFile = new File([audioBlob], `recording${extension}`, {
          type: mimeType,
        });

        // Transcribe but don't auto-send
        await transcribeAudio(audioFile);

        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err: any) {
      console.error("Microphone error:", err);
      alert(
        "Microphone access denied. Please allow microphone access and try again.",
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  // Handle audio file upload
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await transcribeAudio(file);
      // Reset file input
      if (audioInputRef.current) audioInputRef.current.value = "";
    }
  };

  // Transcribe audio and populate input field (don't auto-send)
  // Audio transcription respects selected language
  // Transcribed text appears in selected language (may be native script or phonetic)
  const transcribeAudio = async (file: File) => {
    try {
      setIsTranscribing(true);
      const formData = new FormData();
      formData.append("audio", file);
      // Send selected language code to backend for transcription
      // Backend will transcribe in the selected language
      formData.append("language", selectedLanguage);

      const res = await fetch("http://localhost:8000/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        let errorMessage = "Transcription failed";
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          const errorText = await res.text();
          errorMessage = errorText || errorMessage;
        }
        console.error("Transcription error:", errorMessage);
        throw new Error(errorMessage);
      }

      const data = await res.json();
      if (data.success && data.text) {
        // Set transcribed text to input field in selected language
        // Text may be in native script or phonetic (Hinglish) - both are valid
        // Backend will normalize it internally when processing
        setInput(data.text);
      } else {
        throw new Error(data.error || "Transcription returned no text");
      }
    } catch (err: any) {
      console.error("Audio transcription error:", err);
      const errorMsg =
        err.message ||
        "Could not transcribe audio. Please try again or type your message.";
      alert(errorMsg);
    } finally {
      setIsTranscribing(false);
    }
  };

  // Chat send handler
  // LANGUAGE FLOW:
  // 1. User types in selected language (native script or Hinglish) - preserved exactly as typed
  // 2. Input is sent to backend with language code
  // 3. Backend normalizes to English internally (handles native script and Hinglish)
  // 4. Backend processes in English (vector search, LLM)
  // 5. Backend translates response back to selected language
  // 6. Frontend displays translated response
  // User NEVER sees English unless English is selected
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending || isRecording || isTranscribing) return;

    setSending(true);
    // CRITICAL: Preserve EXACT input as typed by user
    // Do NOT modify, translate, or normalize in frontend
    // Backend will handle normalization internally
    const question = input.trim();
    setInput(""); // Clear input but language state persists

    // Add user message in ORIGINAL language (exactly as typed)
    // This is what user will see in chat - their original text
    setMessages((msgs) => [...msgs, { sender: "user", text: question }]);

    // Prepare chat history
    const history = messages.slice(-6);

    try {
      const res = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          history,
          language: selectedLanguage, // Send language code for response translation
        }),
      });

      if (!res.body) throw new Error("No response from server");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let botMsg = "";
      let sources: Source[] | undefined = undefined;
      let buffer = "";

      // Add placeholder bot message
      setMessages((msgs) => [...msgs, { sender: "bot", text: "" }]);

      // Stream response character by character
      const appendCharByChar = async (text: string) => {
        for (let i = 0; i < text.length; i++) {
          botMsg += text[i];
          setMessages((msgs) => {
            const updated = [...msgs];
            const lastBotIdx = updated.findLastIndex((m) => m.sender === "bot");
            if (lastBotIdx !== -1) {
              updated[lastBotIdx] = { ...updated[lastBotIdx], text: botMsg };
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

      // Update final message with sources
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
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div 
      className="flex flex-col h-screen w-full relative overflow-hidden"
      translate="no" // Prevent browser auto-translation of entire app
    >
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50 -z-10" />
      <DecorativeElements />

      {/* Floating Chat Container */}
      <div className="flex flex-col h-full max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Header with subtle gradient */}
        <header className="flex-shrink-0 bg-gradient-to-r from-white to-blue-50/30 backdrop-blur-sm border border-gray-200/50 rounded-t-2xl shadow-sm mb-4">
          <div className="px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* AI Icon with subtle gradient */}
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-gray-900">
                AgriSolve Assistant
              </h1>
            </div>

            {/* Language Selection - FIRST CLASS STATE */}
            {/* Language persists across messages and affects future messages only */}
            <div className="flex items-center gap-3">
              <label
                htmlFor="language-select"
                className="text-sm font-medium text-gray-700"
              >
                Language:
              </label>
              <select
                id="language-select"
                value={selectedLanguage}
                onChange={(e) => {
                  // Language change affects future messages only
                  // Existing messages remain in their original language
                  setSelectedLanguage(e.target.value);
                }}
                disabled={sending || isRecording || isTranscribing}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white/80 backdrop-blur-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all duration-200 disabled:bg-gray-50 disabled:cursor-not-allowed hover:border-gray-400"
                style={{ borderRadius: TOKENS.borderRadius.md }}
              >
                {supportedLanguages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        {/* Chat Messages Area - Floating Card */}
        <div className="flex-1 overflow-y-auto bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl shadow-lg mb-4">
          <div className="px-6 py-6">
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex w-full ${
                    msg.sender === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[80%] ${
                      msg.sender === "user" ? "ml-auto" : "mr-auto"
                    }`}
                  >
                    <MessageBubble
                      message={msg}
                      isUser={msg.sender === "user"}
                    />

                    {msg.sender === "bot" &&
                      msg.sources &&
                      msg.sources.length > 0 && (
                        <SourcesCard
                          sources={msg.sources}
                          isExpanded={showSources[idx] || false}
                          onToggle={() =>
                            setShowSources((prev) => ({
                              ...prev,
                              [idx]: !prev[idx],
                            }))
                          }
                        />
                      )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          </div>
        </div>

        {/* Input Area - Floating Card */}
        <div className="flex-shrink-0 bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-b-2xl shadow-lg">
          {/* Transcribing indicator */}
          {isTranscribing && (
            <div className="px-6 py-2.5 text-sm text-gray-600 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100/50">
              <div className="flex items-center gap-2">
                <svg
                  className="animate-spin h-4 w-4 text-blue-600"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8z"
                  />
                </svg>
                <span>Transcribing audio...</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSend} className="px-6 py-4">
            <div className="flex items-center gap-3">
              {/* Hidden audio file input */}
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={handleAudioUpload}
              />

              {/* Microphone Button */}
              <IconButton
                onClick={isRecording ? stopRecording : startRecording}
                disabled={sending || isTranscribing}
                isActive={isRecording}
                title={isRecording ? "Stop recording" : "Record voice message"}
                className={
                  isRecording
                    ? "bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-md"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                }
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                </svg>
              </IconButton>

              {/* Upload Audio Button */}
              <IconButton
                onClick={() => audioInputRef.current?.click()}
                disabled={sending || isRecording || isTranscribing}
                title="Upload audio file"
                className="bg-gray-100 hover:bg-gray-200 text-gray-700"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z" />
                </svg>
              </IconButton>

              {/* Text Input - Preserves selected language, NO auto-translation */}
              <input
                type="text"
                value={input}
                onChange={(e) => {
                  // CRITICAL: Preserve exact input as typed
                  // Accept native script (Hindi/Marathi) or Hinglish
                  // Do NOT translate or modify in frontend
                  setInput(e.target.value);
                }}
                disabled={sending || isRecording || isTranscribing}
                placeholder={getPlaceholder()}
                className="flex-1 h-11 px-4 rounded-lg border border-gray-300 bg-white/90 backdrop-blur-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all duration-200 text-sm text-gray-900 placeholder-gray-400 disabled:bg-gray-50 disabled:cursor-not-allowed hover:border-gray-400"
                style={{ borderRadius: TOKENS.borderRadius.md }}
                // Prevent browser auto-translation
                translate="no"
                autoComplete="off"
                spellCheck="false"
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={
                  !input.trim() || sending || isRecording || isTranscribing
                }
                className="flex-shrink-0 h-11 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-200 transform hover:scale-105 active:scale-95"
                style={{ borderRadius: TOKENS.borderRadius.md }}
              >
                {sending ? (
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
