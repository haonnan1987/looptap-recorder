import socket
import sys
import threading
import time
import webbrowser
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import soundcard as sc
import soundfile as sf
from flask import Flask, jsonify, render_template, send_from_directory


APP_TITLE = "LoopTap"
HOST = "127.0.0.1"
PORT = 8765
DEFAULT_SAMPLE_RATE = 48_000
BLOCK_FRAMES = 4_096
BASE_DIR = Path(__file__).resolve().parent
RESOURCE_DIR = Path(getattr(sys, "_MEIPASS", BASE_DIR))
RECORDINGS_DIR = BASE_DIR / "recordings"


@dataclass(frozen=True)
class FormatOption:
    label: str
    extension: str
    subtype: str


FORMATS = {
    "wav24": FormatOption("WAV 24-bit PCM", ".wav", "PCM_24"),
    "flac24": FormatOption("FLAC 24-bit", ".flac", "PCM_24"),
    "wavfloat": FormatOption("WAV 32-bit Float", ".wav", "FLOAT"),
}


class LoopbackRecorder:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None
        self._started_at = 0.0
        self._sample_rate = DEFAULT_SAMPLE_RATE
        self._status = "Ready"
        self._current_path: Path | None = None
        self._last_path: Path | None = None
        self._error: str | None = None
        self._frames_written = 0
        RECORDINGS_DIR.mkdir(exist_ok=True)

    @property
    def is_recording(self) -> bool:
        return self._thread is not None and self._thread.is_alive()

    def start(self, format_key: str) -> dict:
        if format_key not in FORMATS:
            raise ValueError("Unsupported output format.")

        with self._lock:
            if self.is_recording:
                raise RuntimeError("Recording is already running.")

            option = FORMATS[format_key]
            filename = f"computer_audio_{time.strftime('%Y%m%d_%H%M%S')}{option.extension}"
            self._current_path = RECORDINGS_DIR / filename
            self._last_path = None
            self._error = None
            self._frames_written = 0
            self._status = "Starting"
            self._stop_event.clear()
            self._started_at = time.monotonic()
            self._thread = threading.Thread(
                target=self._record_loop,
                args=(self._current_path, option),
                daemon=True,
            )
            self._thread.start()

        return self.status()

    def stop(self) -> dict:
        thread = self._thread
        if not thread:
            return self.status()

        self._stop_event.set()
        thread.join(timeout=10)

        with self._lock:
            self._thread = None
            if self._current_path and self._current_path.exists() and self._frames_written > 0:
                self._last_path = self._current_path
                self._status = "Saved"
            elif self._current_path and self._current_path.exists():
                self._current_path.unlink(missing_ok=True)
                self._status = "No audio captured"
            self._current_path = None

        return self.status()

    def status(self) -> dict:
        with self._lock:
            is_recording = self.is_recording
            elapsed = time.monotonic() - self._started_at if is_recording else 0
            last_file = self._last_path.name if self._last_path else None
            bytes_written = self._last_path.stat().st_size if self._last_path and self._last_path.exists() else 0
            return {
                "recording": is_recording,
                "elapsed": int(max(0, elapsed)),
                "status": self._status,
                "error": self._error,
                "framesWritten": self._frames_written,
                "lastFile": last_file,
                "downloadUrl": f"/recordings/{last_file}" if last_file else None,
                "bytesWritten": bytes_written,
            }

    def _record_loop(self, path: Path, option: FormatOption) -> None:
        try:
            speaker = sc.default_speaker()
            microphone = sc.get_microphone(speaker.name, include_loopback=True)
            with self._lock:
                self._status = f"Recording from {speaker.name}"

            with microphone.recorder(
                samplerate=self._sample_rate,
                channels=2,
                blocksize=BLOCK_FRAMES,
            ) as recorder, sf.SoundFile(
                path,
                mode="w",
                samplerate=self._sample_rate,
                channels=2,
                subtype=option.subtype,
            ) as audio_file:
                while not self._stop_event.is_set():
                    data = recorder.record(numframes=BLOCK_FRAMES)
                    if data.size:
                        audio_file.write(np.asarray(data, dtype=np.float32))
                        with self._lock:
                            self._frames_written += len(data)

            with self._lock:
                self._status = "Stopping"
        except Exception as exc:
            with self._lock:
                self._error = str(exc)
                self._status = "Error"
            self._stop_event.set()


recorder = LoopbackRecorder()
app = Flask(
    __name__,
    template_folder=str(RESOURCE_DIR / "templates"),
    static_folder=str(RESOURCE_DIR / "static"),
)


@app.get("/")
def index():
    return render_template("index.html", formats={key: option.label for key, option in FORMATS.items()})


@app.post("/api/start/<format_key>")
def start_recording(format_key: str):
    try:
        return jsonify(recorder.start(format_key))
    except Exception as exc:
        return jsonify({"error": str(exc)}), 400


@app.post("/api/stop")
def stop_recording():
    return jsonify(recorder.stop())


@app.get("/api/status")
def get_status():
    return jsonify(recorder.status())


@app.get("/recordings/<path:filename>")
def download_recording(filename: str):
    return send_from_directory(RECORDINGS_DIR, filename, as_attachment=True)


def _port_is_free(host: str, port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.2)
        return sock.connect_ex((host, port)) != 0


def main() -> None:
    url = f"http://{HOST}:{PORT}"
    if _port_is_free(HOST, PORT):
        threading.Timer(1.0, lambda: webbrowser.open(url)).start()
    print(f"Open {url}")
    app.run(host=HOST, port=PORT, debug=False, threaded=True)


if __name__ == "__main__":
    main()
