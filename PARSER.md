# Parser Microservice

## What's included

- `parser/requirements.txt` – dependencies for the FastAPI PDF parser.
- `parser/main.py` – FastAPI app that downloads PDFs, extracts text, and infers metadata.
- `app/api/parse/route.ts` – Next.js API that bridges Firebase documents with the parser.
- `app/api/documents/[id]/route.ts` – secure document CRUD for the detail page (uses Firebase Admin).
- `lib/server/document-serializer.ts` – normalizes Firestore timestamps into plain JSON for the APIs.
- `/documents/[id]` UI updates – surface parsed metadata, extracted text, and trigger parsing.
- This `PARSER.md` guide – setup steps plus the end-to-end flow summary.

## Local setup

```bash
cd parser
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The service exposes `POST /parse` and expects a JSON body:

```json
{ "pdf_url": "https://..." }
```

It downloads the PDF, extracts the text with `pdfplumber`, runs lightweight heuristics to detect provider, category, totals, and relevant dates, then returns a normalized JSON payload.

## Next.js integration

The route handler `app/api/parse/route.ts` calls the Python service at `http://localhost:8000/parse` (override via `PARSER_SERVICE_URL`). For a given document id it:

1. Fetches the Firestore document to get the PDF URL.
2. Calls the Python parser with `{ pdf_url }`.
3. Updates Firestore with `textExtract`, provider/category metadata, monetary values, detected dates (stored as timestamps), and parsing status (`parsed`, `needs_review`, or `error`).
4. Returns the updated document JSON.

If the parser is unreachable the document status switches to `error` and the API responds with `502`.

## UI workflow

The detail page at `/documents/[id]` now:

- Displays provider/category info, totals, currency, detected dates, and the current parsing status.
- Shows the extracted text (scrollable) when available.
- Offers a **Parse PDF** button whenever the document has not been parsed or needs another attempt. The button triggers `/api/parse`, which chains the Python service and Firestore update as described above. The UI refreshes once parsing completes.

## End-to-end flow summary

1. Upload a PDF → `/api/upload` stores it in Firebase Storage and `/api/documents` creates the Firestore record (`status: pending`).  
2. Visit `/documents/[id]` → Review current metadata; click **Parse PDF** if the document is pending/error/unparsed.  
3. Next.js calls the Python parser → Parser extracts text & metadata → Firestore is updated with parsed fields (`textExtract`, provider/category, totals, dates, status).  
4. The page refreshes automatically to show the extracted data; manual overrides are still available if needed.
