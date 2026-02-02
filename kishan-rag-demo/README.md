# RAG Demo: Explainable, Modern, and Robust

**A full-stack Retrieval-Augmented Generation (RAG) chatbot demo with professional UX, explainable answers, and robust handling of large documents.**

---

## 🚀 Tech Stack

- **Frontend:** Next.js (React, Tailwind CSS, react-markdown)
- **Backend:** FastAPI (Python)
- **Vector DB:** Pinecone
- **LLM:** Google Gemini Pro

---

## ✨ Features

- **Batch PDF Upload:** Upload large PDF documents, processed in memory-efficient batches for reliability.
- **Upload Progress Bar:** Visual feedback for upload progress, even with large files.
- **Source Traceability:** Every answer cites the exact document and chunk used, with clickable source links.
- **Streaming Chat UI:** Answers stream in real-time for a professional, conversational feel.
- **Modern, Full-Screen Chat:** Clean, mobile-friendly, full-screen chat interface with consistent font sizing and spacing.
- **Markdown Rendering:** Answers are formatted with Markdown (headings, lists, bold, etc.) for clarity.
- **Toggle Source Citations:** Show/hide the retrieved context and sources for each answer with a single click.
- **Separation of Upload & Chat:** Dedicated upload and chat pages for a focused user experience.
- **Robust Backend Logging:** Backend logs batch progress for uploads, aiding debugging and transparency.
- **Explainable RAG Pipeline:** See exactly which sources were used for each answer—no black box!

---

## 🖥️ Project Structure

```
rag-demo/
├── backend/    # FastAPI backend (PDF upload, Pinecone, Gemini Pro, streaming)
├── frontend/   # Next.js frontend (chat UI, upload UI, Markdown, toggles)
└── README.md   # (this file)
```

---

## ⚡ Quickstart

### 1. Backend Setup

```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file with your API keys:

```env
PINECONE_API_KEY=your-pinecone-key
PINECONE_ENVIRONMENT=aws-us-east-1
PINECONE_INDEX_NAME=demo
GOOGLE_API_KEY=your-google-api-key
```

Start the FastAPI server:

```powershell
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Frontend Setup

```powershell
cd ../frontend
npm install
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000)

---

## 📝 Usage

1. **Upload PDFs:** Go to the upload page and submit your PDF (with a source URL for citation).
2. **Chat:** Switch to the chat page and ask questions about your documents.
3. **See Sources:** Click "Show Sources" under any answer to view the exact context and document links used.
4. **Enjoy Streaming:** Watch answers appear in real-time, formatted with Markdown for easy reading.

---

## 🧩 How It Works

1. **PDF Upload:**
   - PDFs are split into batches and chunked for memory efficiency.
   - Each chunk is embedded and upserted to Pinecone with full source metadata (filename, URL, chunk index).
   - Upload progress is shown in real time.
2. **Chat:**
   - User questions are sent to the backend.
   - The backend retrieves the top relevant chunks from Pinecone (with metadata).
   - Gemini Pro LLM generates a Markdown-formatted answer, streamed to the frontend.
   - Source metadata is sent alongside the answer for full transparency.
3. **Frontend:**
   - Modern, full-screen chat UI with Markdown rendering and toggles for source context.
   - Upload page with progress bar and error handling.

---

## 🛡️ Notes & Tips

- Ensure your Pinecone index dimension matches your embedding model (default: 384 for all-MiniLM-L6-v2).
- CORS is configured for local development.
- For production, secure your API keys and use HTTPS.
- All code is modular and easy to extend for new features or models.

---

## ❤️ Credits

Made with Next.js, FastAPI, Pinecone, Gemini Pro, and a passion for explainable AI.

https://static.vikaspedia.in/media/files_en/education/Digital%20Litercy/TheHistoryofComputers1.pdf

Transcription using a multilingual Whisper will default to language detection followed by transcription instead of translation to English. This might be a breaking change for your use case. If you want to instead always translate your audio to English, make sure to pass `language='en'`. See https://github.com/huggingface/transformers/pull/28687 for more details.
