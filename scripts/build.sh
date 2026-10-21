#!/usr/bin/env bash
# Builds output/horcare-ad-30s.mp4 (1080x1920, 30fps, H.264 + AAC)
set -euo pipefail
cd "$(dirname "$0")/.."
export NODE_PATH="${NODE_PATH:-$(npm root -g)}"

FRAMES=build/frames
mkdir -p "$FRAMES" output
find "$FRAMES" -name 'f*.jpg' -delete

echo "▶ rendering frames"
node scripts/render.cjs "$FRAMES"
echo "▶ synthesising audio"
python3 scripts/make_audio.py build/audio.wav
echo "▶ encoding"
ffmpeg -loglevel error -y -framerate 30 -i "$FRAMES/f%05d.jpg" -i build/audio.wav \
  -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -profile:v high \
  -c:a aac -b:a 192k -ar 44100 -shortest -movflags +faststart \
  output/horcare-ad-30s.mp4
echo "✔ output/horcare-ad-30s.mp4"
