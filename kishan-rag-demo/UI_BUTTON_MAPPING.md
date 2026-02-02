# UI Button & Endpoint Mapping

This document tracks the mapping between UI buttons/actions and their backend API endpoints. Use this as a reference when implementing new UI designs.

## Current Old UI (USE_OLD_UI = True)

### Page: Main Chat Page (`frontend/src/app/page.tsx`)

#### UI Elements and Their API Endpoints

| UI Element                     | Action                             | Backend Endpoint                                        | Method | Request Body                                                 | Response                                                             |
| ------------------------------ | ---------------------------------- | ------------------------------------------------------- | ------ | ------------------------------------------------------------ | -------------------------------------------------------------------- |
| **Text Input + Send Button**   | Send chat message                  | `/api/chat`                                             | POST   | `{ question: string, history: Message[], language: string }` | Streamed response with `[[SOURCES]]` marker followed by JSON sources |
| **Microphone Button** (record) | Start/stop voice recording         | (Client-side recording using MediaRecorder API)         | N/A    | N/A                                                          | N/A                                                                  |
| **Upload Audio Button**        | Upload audio file                  | `/api/transcribe`                                       | POST   | FormData with `audio` file + `language` code                 | `{ success: boolean, text: string, error?: string }`                 |
| **Language Dropdown**          | Select message language (en/hi/mr) | (Frontend state, affects transcription & chat language) | N/A    | N/A                                                          | Changes `selectedLanguage` state                                     |

### Page: Document Upload Page (`frontend/src/app/upload/page.tsx`)

#### UI Elements and Their API Endpoints

| UI Element           | Action                  | Backend Endpoint             | Method | Request Body                                      | Response                    |
| -------------------- | ----------------------- | ---------------------------- | ------ | ------------------------------------------------- | --------------------------- |
| **File Input (PDF)** | Select PDF file         | (Client-side file selection) | N/A    | N/A                                               | N/A                         |
| **URL Input Field**  | Enter document URL      | (Frontend state)             | N/A    | N/A                                               | N/A                         |
| **Upload Button**    | Upload PDF + metadata   | `/api/upload`                | POST   | FormData with `file` (PDF) + `doc_url` (optional) | Success message or error    |
| **Progress Bar**     | Display upload progress | (XHR upload event tracking)  | N/A    | N/A                                               | Progress percentage (0-100) |

---

## Backend API Endpoints Reference

### Endpoint: `/api/upload`

**Method:** POST

**Purpose:** Upload and ingest a PDF document into the vector database

**Request:**

```
FormData:
  - file: File (application/pdf) - Required
  - doc_url: string (optional) - URL reference for the document
```

**Response:**

```
200 OK: Success message
400/500: Error message
```

**Processing:**

- Extracts text from PDF using PyMuPDF
- Splits text into chunks
- Generates embeddings
- Stores in vector database (Pinecone or ChromaDB)

---

### Endpoint: `/api/transcribe`

**Method:** POST

**Purpose:** Transcribe audio to text in specified language

**Request:**

```
FormData:
  - audio: File (audio file) - Required
  - language: string - Language code (en, hi, mr, etc.) - Required
```

**Response:**

```json
{
  "success": boolean,
  "text": string,
  "error": string (optional)
}
```

**Processing:**

- Accepts formats: WebM, WAV, MP4
- Uses Google Speech-to-Text API
- Transcribes in selected language
- Returns text in native script or Hinglish

---

### Endpoint: `/api/chat`

**Method:** POST

**Purpose:** Send chat message and get AI response with sources

**Request:**

```json
{
  "question": string,
  "history": [
    {
      "sender": "user" | "bot",
      "text": string,
      "sources": [optional, only for bot messages]
    }
  ],
  "language": string (language code: en, hi, mr)
}
```

**Response (Streamed):**

```
[Response text content streamed character by character]
[[SOURCES]]
{
  "sources": [
    {
      "text": string,
      "doc_name": string,
      "doc_url": string,
      "chunk_index": number
    }
  ]
}
```

**Processing:**

1. Normalizes input text (handles native script, Hinglish)
2. Performs semantic search in vector database
3. Retrieves relevant document chunks (sources)
4. Sends query + sources to LLM (Gemini API or Local Model)
5. LLM generates response in selected language
6. Streams response back to client
7. Appends source metadata at end

---

## Language Flow

### Language Codes

- `en` - English
- `hi` - Hindi (Devanagari script or Hinglish)
- `mr` - Marathi (Devanagari script or Hinglish)

### User Input Flow

1. User types message in selected language (native script or Hinglish) → preserved exactly
2. Frontend sends: `question` (original text) + `language` code
3. Backend: Normalizes text internally → searches in English → generates response in selected language
4. User sees response in their selected language

### Voice Input Flow

1. User clicks microphone or uploads audio
2. Frontend sends: audio file + selected `language` code
3. Backend transcribes in selected language
4. Transcribed text appears in input field
5. User can edit or send immediately
6. Same chat flow as text input

---

## Frontend State Management

### Language Selection State

```typescript
const [selectedLanguage, setSelectedLanguage] = useState<string>("en");
```

- Persists across messages
- Affects future transcriptions and responses
- Existing messages retain their original language

### Chat Messages Structure

```typescript
type Message = {
  sender: "user" | "bot";
  text: string;
  sources?: Source[]; // Only for bot messages with retrieved context
};

type Source = {
  text: string;
  doc_name?: string;
  doc_url?: string;
  chunk_index?: number;
};
```

---

## UI Component Mapping

| Component            | File            | Responsibility                               |
| -------------------- | --------------- | -------------------------------------------- |
| `MessageBubble`      | page.tsx        | Renders individual message (user or bot)     |
| `SourcesCard`        | page.tsx        | Expandable sources/context display           |
| `IconButton`         | page.tsx        | Reusable button for microphone, upload, etc. |
| `DecorativeElements` | page.tsx        | Background decorative SVG elements           |
| Main Chat Container  | page.tsx        | Layout and chat state management             |
| Upload Page          | upload/page.tsx | Document ingestion interface                 |

---

## Key Implementation Notes for New UI

When implementing the new UI design, ensure:

1. **API Endpoints Remain Unchanged** - All requests must go to `/api/upload`, `/api/transcribe`, and `/api/chat`
2. **Language Parameter Required** - Always send `language` code with chat and transcribe requests
3. **Message Structure** - Maintain the `{ sender, text, sources? }` structure for compatibility with backend
4. **Streaming Response Handling** - Chat endpoint streams with `[[SOURCES]]` marker; parse correctly
5. **File Upload FormData** - Use FormData for file uploads; don't JSON stringify
6. **CORS** - Backend accepts requests from localhost:3000, 3001, 3002

---

## Configuration

UI selection is controlled by `flags.py`:

- `USE_OLD_UI = True` - Enable old UI
- `USE_NEW_UI = False` - Enable new UI (set to True when new design is ready)

Only one UI flag should be True at any time.
