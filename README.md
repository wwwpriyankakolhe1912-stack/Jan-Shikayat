# CivicPulse input API

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
