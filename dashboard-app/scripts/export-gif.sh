#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$ROOT_DIR/e2e-artifacts"
mkdir -p "$OUT_DIR"

LATEST_WEBM=$(ls -1t "$ROOT_DIR"/test-results/**/video.webm 2>/dev/null | head -n 1 || true)
if [ -z "$LATEST_WEBM" ]; then
  echo "No Playwright video found under test-results" >&2
  exit 0
fi

GIF_OUT="$OUT_DIR/playback-demo.gif"

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg not found; cannot generate GIF" >&2
  exit 1
fi

# Generate palette for best quality
PAL="$OUT_DIR/palette.png"
ffmpeg -y -i "$LATEST_WEBM" -vf "fps=8,scale=800:-1:flags=lanczos,palettegen" -t 9 "$PAL"
ffmpeg -y -i "$LATEST_WEBM" -i "$PAL" -lavfi "fps=8,scale=800:-1:flags=lanczos [x]; [x][1:v] paletteuse" -loop 0 "$GIF_OUT"

echo "GIF written to $GIF_OUT"

