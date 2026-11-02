#!/usr/bin/env bash
# Builds the HorCare ad (1080x1920, 30fps, H.264 + AAC).
#   ./scripts/build.sh              -> output/horcare-ad-30s-voiceover.mp4 (Thai voiceover)
#   NO_VOICE=1 ./scripts/build.sh   -> output/horcare-ad-30s.mp4           (music + SFX only)
# To use a human recording instead of the TTS voice, put it at voice/voiceover.wav
# (any format ffmpeg reads, timed to the 30s cut — see "voice" in src/timeline.js).
set -euo pipefail
cd "$(dirname "$0")/.."
export NODE_PATH="${NODE_PATH:-$(npm root -g)}"

FRAMES=build/frames
MODEL=build/vits-mms-tha
mkdir -p "$FRAMES" output
find "$FRAMES" -name 'f*.jpg' -delete
rm -f build/voice.wav

if [[ -z "${NO_VOICE:-}" ]]; then
  if [[ -f voice/voiceover.wav ]]; then
    echo "▶ using recorded voice/voiceover.wav"
    ffmpeg -loglevel error -y -i voice/voiceover.wav -ac 1 -ar 44100 -t 30 build/voice.wav
  else
    if [[ ! -f "$MODEL/model.onnx" ]]; then
      echo "▶ downloading Thai TTS model (MMS, ~110 MB)"
      curl -sSL https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-mms-tha.tar.bz2 \
        | tar -xj -C build
    fi
    echo "▶ synthesising Thai voiceover"
    python3 scripts/make_voice.py "$MODEL" build/voice.wav
  fi
  OUT=output/horcare-ad-30s-voiceover.mp4
else
  OUT=output/horcare-ad-30s.mp4
fi

echo "▶ rendering frames"
node scripts/render.cjs "$FRAMES"
echo "▶ synthesising music + sfx"
python3 scripts/make_audio.py build/audio.wav build/voice.wav
echo "▶ encoding"
ffmpeg -loglevel error -y -framerate 30 -i "$FRAMES/f%05d.jpg" -i build/audio.wav \
  -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -profile:v high \
  -c:a aac -b:a 192k -ar 44100 -shortest -movflags +faststart \
  "$OUT"
echo "✔ $OUT"
