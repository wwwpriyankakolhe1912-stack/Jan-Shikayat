from __future__ import annotations

import json
import os
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import httpx
from PIL import Image, UnidentifiedImageError
from dotenv import load_dotenv

try:
    import speech_recognition as speech_recognition
except ImportError:
    speech_recognition = None

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")
UPLOAD_DIR = BASE_DIR / "uploads"
IMAGE_DIR = UPLOAD_DIR / "images"
AUDIO_DIR = UPLOAD_DIR / "audio"
DATABASE_PATH = BASE_DIR / "civicpulse.db"
SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_AUDIO_BUCKET = os.getenv("SUPABASE_AUDIO_BUCKET", "issue-audio")
SUPABASE_IMAGE_BUCKET = os.getenv("SUPABASE_IMAGE_BUCKET", "issue-photos")
for directory in (IMAGE_DIR, AUDIO_DIR):
    directory.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Jan Samasya Input API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_IMAGE_BYTES = 10 * 1024 * 1024
MAX_AUDIO_BYTES = 25 * 1024 * 1024
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_AUDIO_TYPES = {"audio/webm", "audio/wav", "audio/ogg", "audio/mpeg", "audio/mp4"}


def get_db() -> sqlite3.Connection:
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database() -> None:
    with get_db() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS incidents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ticket_id TEXT NOT NULL UNIQUE,
                status TEXT NOT NULL DEFAULT 'received',
                name TEXT NOT NULL,
                phone TEXT NOT NULL,
                address TEXT NOT NULL,
                category TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                image_file TEXT,
                image_url TEXT,
                audio_file TEXT,
                audio_url TEXT,
                audio_transcript TEXT,
                created_at TEXT NOT NULL
            )
            """
        )
        columns = {row[1] for row in connection.execute("PRAGMA table_info(incidents)")}
        if "audio_url" not in columns:
            connection.execute("ALTER TABLE incidents ADD COLUMN audio_url TEXT")
        if "image_url" not in columns:
            connection.execute("ALTER TABLE incidents ADD COLUMN image_url TEXT")


initialize_database()


def safe_suffix(filename: str | None, content_type: str | None) -> str:
    suffix = Path(filename or "").suffix.lower()
    if suffix:
        return suffix[:10]
    return {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "audio/webm": ".webm",
        "audio/wav": ".wav",
        "audio/ogg": ".ogg",
        "audio/mpeg": ".mp3",
        "audio/mp4": ".m4a",
    }.get(content_type or "", ".bin")


async def save_upload(upload: UploadFile, destination: Path, max_bytes: int) -> Path:
    data = await upload.read(max_bytes + 1)
    if len(data) > max_bytes:
        raise ValueError(f"{upload.filename or 'File'} is too large")
    path = destination / f"{uuid.uuid4().hex}{safe_suffix(upload.filename, upload.content_type)}"
    path.write_bytes(data)
    return path


async def validate_image(upload: UploadFile) -> Path:
    if upload.content_type not in ALLOWED_IMAGE_TYPES:
        raise ValueError("Image must be JPG, PNG, or WebP")
    path = await save_upload(upload, IMAGE_DIR, MAX_IMAGE_BYTES)
    try:
        with Image.open(path) as image:
            image.verify()
    except (UnidentifiedImageError, OSError) as error:
        path.unlink(missing_ok=True)
        raise ValueError("The uploaded image is not valid") from error
    return path


async def save_audio(upload: UploadFile) -> Path:
    if upload.content_type not in ALLOWED_AUDIO_TYPES:
        raise ValueError("Audio must be WebM, WAV, OGG, MP3, or M4A")
    return await save_upload(upload, AUDIO_DIR, MAX_AUDIO_BYTES)


def transcribe_audio(path: Path) -> str | None:
    if speech_recognition is None:
        return None
    recognizer = speech_recognition.Recognizer()
    try:
        with speech_recognition.AudioFile(str(path)) as source:
            audio = recognizer.record(source)
        return recognizer.recognize_google(audio)
    except (speech_recognition.UnknownValueError, speech_recognition.RequestError, ValueError):
        return None


async def upload_to_supabase(path: Path, bucket: str, content_type: str) -> str | None:
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        return None
    object_path = f"{datetime.now(timezone.utc):%Y/%m}/{uuid.uuid4().hex}{path.suffix}"
    endpoint = f"{SUPABASE_URL}/storage/v1/object/{bucket}/{object_path}"
    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": content_type,
        "x-upsert": "false",
    }
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(endpoint, content=path.read_bytes(), headers=headers)
        response.raise_for_status()
    return f"{SUPABASE_URL}/storage/v1/object/public/{bucket}/{object_path}"


async def insert_supabase_incident(record: dict[str, object]) -> None:
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        return
    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            f"{SUPABASE_URL}/rest/v1/incidents",
            json=record,
            headers=headers,
        )
        response.raise_for_status()


@app.get("/")
def serve_app() -> FileResponse:
    return FileResponse(BASE_DIR / "index.html")


@app.post("/api/incidents")
async def create_incident(
    name: Annotated[str, Form()],
    phone: Annotated[str, Form()],
    address: Annotated[str, Form()],
    category: Annotated[str, Form()],
    description: Annotated[str, Form()] = "",
    latitude: Annotated[float, Form()] = 26.2389,
    longitude: Annotated[float, Form()] = 73.0243,
    image: Annotated[UploadFile | None, File()] = None,
    audio: Annotated[UploadFile | None, File()] = None,
) -> dict[str, object]:
    if not name.strip() or not phone.strip() or not address.strip():
        return {"ok": False, "error": "Name, phone, and address are required"}
    if not description.strip() and image is None and audio is None:
        return {"ok": False, "error": "Add text, an audio note, or an image"}

    image_path = None
    audio_path = None
    image_url = None
    audio_url = None
    transcript = None
    try:
        if image is not None and image.filename:
            image_path = await validate_image(image)
            try:
                image_url = await upload_to_supabase(
                    image_path, SUPABASE_IMAGE_BUCKET, image.content_type or "image/jpeg"
                )
            except httpx.HTTPError:
                image_url = None
        if audio is not None and audio.filename:
            audio_path = await save_audio(audio)
            transcript = transcribe_audio(audio_path)
            try:
                audio_url = await upload_to_supabase(
                    audio_path, SUPABASE_AUDIO_BUCKET, audio.content_type or "audio/webm"
                )
            except httpx.HTTPError:
                audio_url = None
    except ValueError as error:
        return {"ok": False, "error": str(error)}

    ticket_id = f"CP-{datetime.now(timezone.utc):%y%m%d}-{uuid.uuid4().hex[:6].upper()}"
    record = {
        "ticket_id": ticket_id,
        "status": "received",
        "name": name.strip(),
        "phone": phone.strip(),
        "address": address.strip(),
        "category": category,
        "description": description.strip(),
        "latitude": latitude,
        "longitude": longitude,
        "image_file": image_path.name if image_path else None,
        "image_url": image_url,
        "audio_file": audio_path.name if audio_path else None,
        "audio_url": audio_url,
        "audio_transcript": transcript,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    with get_db() as connection:
        connection.execute(
            """
            INSERT INTO incidents (
                ticket_id, status, name, phone, address, category, description,
                latitude, longitude, image_file, image_url, audio_file, audio_url,
                audio_transcript, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            tuple(record.values()),
        )
    try:
        await insert_supabase_incident(record)
        storage_mode = "supabase" if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY else "local"
    except httpx.HTTPError:
        storage_mode = "local-fallback"
    (UPLOAD_DIR / f"{ticket_id}.json").write_text(json.dumps(record, indent=2), encoding="utf-8")
    return {"ok": True, "storage_mode": storage_mode, **record}


@app.get("/api/incidents")
def list_incidents(limit: int = 25) -> dict[str, object]:
    safe_limit = max(1, min(limit, 100))
    with get_db() as connection:
        rows = connection.execute(
            "SELECT * FROM incidents ORDER BY created_at DESC LIMIT ?", (safe_limit,)
        ).fetchall()
    return {"ok": True, "incidents": [dict(row) for row in rows]}


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "civicpulse-input-api"}


app.mount("/", StaticFiles(directory=BASE_DIR, html=True), name="static")
