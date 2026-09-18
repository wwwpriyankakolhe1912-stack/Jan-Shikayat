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

Create a public Supabase Storage bucket named `issue-audio`, then set these server-side environment variables:

```powershell
$env:SUPABASE_URL = "https://YOUR_PROJECT.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "YOUR_SERVER_ONLY_SERVICE_ROLE_KEY"
$env:SUPABASE_AUDIO_BUCKET = "issue-audio"
```

With those values configured, each uploaded voice note is sent to Supabase Storage and the resulting `audio_url` is saved in SQLite. Never expose the service-role key in browser JavaScript. If the variables are absent or Supabase is unavailable, the app keeps the local audio file and leaves `audio_url` empty.

A hosted deployment needs persistent disk or a managed database so local records survive redeploys.
