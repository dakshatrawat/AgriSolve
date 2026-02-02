# Backend for RAG Demo

## Setup Instructions

1. **Create a virtual environment (recommended):**

   ```powershell
   python -m venv venv
   .\venv\Scripts\activate
   ```

2. **Install dependencies:**

   ```powershell
   pip install -r requirements.txt
   ```

3. **Set up environment variables:**

   - Copy `.env` and fill in your Pinecone credentials:
     - `PINECONE_API_KEY`
     - `PINECONE_ENVIRONMENT`
     - `PINECONE_INDEX_NAME`

4. **Run the FastAPI server:**

   ```powershell
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

5. **API Endpoints:**
   - **POST** `/api/upload` — Upload a PDF file. Returns chunk upload status.
   - **POST** `/api/chat` — Ask a question. Returns top 3 relevant chunks from Pinecone.

CORS is configured to allow requests from `http://localhost:3000` (Next.js frontend).

## Notes

# RAG Demo: Backend & Frontend

## Backend (FastAPI)

1. **Create a virtual environment (recommended):**
   ```powershell
   python -m venv venv
   .\venv\Scripts\activate
   ```
2. **Install dependencies:**
   ```powershell
   pip install -r requirements.txt
   ```
3. **Set up environment variables:**
   - Copy `.env` and fill in:
     - `PINECONE_API_KEY`
     - `PINECONE_ENVIRONMENT`
     - `PINECONE_INDEX_NAME`
     - `GOOGLE_API_KEY` (for Gemini Pro)
4. **Run the FastAPI server:**
   ```powershell
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

## Frontend (Next.js)

1. **Install dependencies:**
   ```powershell
   cd ../frontend
   npm install
   ```
2. **Run the Next.js dev server:**
   ```powershell
   npm run dev
   ```
   The app will be available at http://localhost:3000

## Running Both Concurrently

- Open two terminals:
  - **Terminal 1:** Start FastAPI backend in `backend` folder:
    ```powershell
    uvicorn main:app --reload --host 0.0.0.0 --port 8000
    ```
  - **Terminal 2:** Start Next.js frontend in `frontend` folder:
    ```powershell
    npm run dev
    ```

## Usage

- Upload a PDF using the upload section.
- Ask questions in the chat window.
- The backend retrieves context from Pinecone and uses Gemini Pro to generate answers.

---

CORS is configured to allow requests from `http://localhost:3000` (Next.js frontend).
