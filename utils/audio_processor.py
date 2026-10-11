"""
Turns whatever the user handed us — a YouTube URL, a direct/shared
recording link, or a local file path (e.g. the temp .webm from a live
in-browser recording) — into a list of short audio chunk files ready for
core.transcriber.transcribe_all().

Chunks are capped at 25 seconds: Sarvam's synchronous speech-to-text
endpoint (used for Hinglish) only accepts up to 30s per request, so every
chunk is sized to fit that regardless of which engine ends up handling it.

Uses imageio-ffmpeg to get a bundled, static ffmpeg binary so this works on
Render's standard Python runtime without needing apt/Docker to install
ffmpeg system-wide.
"""
from __future__ import annotations
import os
import re
import tempfile
import subprocess
from urllib.parse import urlparse

import requests
import imageio_ffmpeg

FFMPEG_BIN = imageio_ffmpeg.get_ffmpeg_exe()
CHUNK_SECONDS = 25  # stays under Sarvam's 30s/request cap


def _is_youtube(url: str) -> bool:
    return bool(re.search(r"(youtube\.com|youtu\.be)", url, re.I))


def _is_url(source: str) -> bool:
    try:
        return urlparse(source).scheme in ("http", "https")
    except Exception:
        return False


def _download_youtube(url: str, workdir: str) -> str:
    import yt_dlp

    out_template = os.path.join(workdir, "source.%(ext)s")
    ydl_opts = {
        "format": "bestaudio/best",
        "outtmpl": out_template,
        "postprocessors": [{
            "key": "FFmpegExtractAudio",
            "preferredcodec": "mp3",
            "preferredquality": "128",
        }],
        "ffmpeg_location": FFMPEG_BIN,
        "quiet": True,
        "noplaylist": True,
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([url])

    mp3_path = os.path.join(workdir, "source.mp3")
    if not os.path.exists(mp3_path):
        raise RuntimeError("Could not extract audio from that YouTube URL.")
    return mp3_path


def _download_direct(url: str, workdir: str) -> str:
    """Best-effort download for a shared recording link.

    Many Zoom/Teams/Meet cloud recordings sit behind a login wall or a
    short-lived signed URL that a browser needs to render — a plain HTTP GET
    here can't get past that. If this raises, the fix is usually: download
    the recording file yourself from the meeting platform, then use
    'Record live' or paste a direct, unauthenticated download link instead.
    """
    resp = requests.get(url, stream=True, timeout=60, allow_redirects=True)
    resp.raise_for_status()

    content_type = resp.headers.get("content-type", "")
    if "webm" in content_type:
        ext = ".webm"
    elif "audio" in content_type:
        ext = ".mp3"
    else:
        ext = ".mp4"

    dest = os.path.join(workdir, f"source{ext}")
    with open(dest, "wb") as f:
        for chunk in resp.iter_content(chunk_size=1 << 20):
            if chunk:
                f.write(chunk)
    return dest


def _chunk_audio(path: str, workdir: str) -> list[str]:
    pattern = os.path.join(workdir, "chunk_%03d.wav")
    cmd = [
        FFMPEG_BIN, "-y", "-i", path,
        "-vn", "-ac", "1", "-ar", "16000",
        "-f", "segment", "-segment_time", str(CHUNK_SECONDS),
        pattern,
    ]
    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if proc.returncode != 0:
        raise RuntimeError(
            "ffmpeg failed to process the recording:\n"
            + proc.stderr.decode(errors="ignore")[-800:]
        )

    chunks = sorted(
        os.path.join(workdir, f) for f in os.listdir(workdir)
        if f.startswith("chunk_") and f.endswith(".wav")
    )
    if not chunks:
        raise RuntimeError("No audio could be extracted from that recording.")
    return chunks


def process_input(source: str) -> list[str]:
    workdir = tempfile.mkdtemp(prefix="meeting_audio_")

    if _is_youtube(source):
        raw_path = _download_youtube(source, workdir)
    elif _is_url(source):
        raw_path = _download_direct(source, workdir)
    elif os.path.exists(source):
        raw_path = source
    else:
        raise FileNotFoundError(
            f"'{source}' is not a reachable URL and not a local file that exists on the server."
        )

    return _chunk_audio(raw_path, workdir)
