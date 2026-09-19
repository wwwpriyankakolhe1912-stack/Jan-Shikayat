# Jan Samasya input API

The app accepts three input modes:

- Text: incident description and contact fields
- Voice: browser microphone recording uploaded as WebM
- Image: file upload or camera capture validated with Pillow

## Run locally

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app:app --reload
```

Open `http://127.0.0.1:8000` after starting the server. The browser submits reports to `POST /api/incidents` as multipart form data. When the server is unavailable, the frontend keeps its mock ticket fallback.

Voice transcription is optional. `SpeechRecognition` returns a transcript when the uploaded audio format is supported and a recognition service is available; the report is still saved when transcription is unavailable.

## Deploy publicly with Render

1. Push this folder to a GitHub repository.
2. In Render, choose **New +** then **Blueprint** and select the repository.
3. Render will use `render.yaml` and build the included `Dockerfile`.
4. Open the generated HTTPS URL. The health check is `/api/health`.

The current upload folder is local to the server. For production, replace it with S3, Supabase Storage, or a persistent disk before storing important citizen media.

Incident records are stored in the local SQLite database `civicpulse.db`. Audio is saved locally under `uploads/audio` and its filename is stored in SQLite by default. The API provides `GET /api/incidents?limit=25` for reading recent reports.

## Optional Supabase audio storage

This project is configured for the Supabase project `yceqxowlpllgszolebrm`. Create public Supabase Storage buckets named `issue-audio` and `issue-photos`, then copy `.env.example` to `.env` and replace the placeholder service key:

```powershell
$env:SUPABASE_URL = "https://yceqxowlpllgszolebrm.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "YOUR_SERVER_ONLY_SERVICE_ROLE_KEY"
$env:BACKEND_API_KEY = "YOUR_BACKEND_API_KEY"
$env:SUPABASE_AUDIO_BUCKET = "issue-audio"
$env:SUPABASE_IMAGE_BUCKET = "issue-photos"
```

For local development, the same values can be placed in `.env`. For Render, add them in the service Environment settings. Generate the backend key with `py -c "import secrets; print(secrets.token_urlsafe(32))"`. Send it from another app in the `X-API-Key` header. The `POST /api/incidents` and `GET /api/incidents` routes return `401` when the key is missing or invalid. The Supabase dashboard URL alone cannot authenticate the backend; use the server-only `service_role` key from Supabase Project Settings > API.

Also create the `incidents` table by running [supabase_schema.sql](supabase_schema.sql) in the Supabase SQL Editor. With those values configured, each report is inserted into Supabase, images go to `issue-photos`, voice notes go to `issue-audio`, and their URLs are saved in the `incidents` row. Never expose the service-role key in browser JavaScript. If the variables are absent or Supabase is unavailable, the app keeps the local files and uses SQLite fallback.

A hosted deployment needs persistent disk or a managed database so local records survive redeploys.
