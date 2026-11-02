"""Generates the Thai voiceover track from the "voice" lines in src/timeline.js.

Uses Meta's MMS Thai TTS model (VITS) run offline through sherpa-onnx:
    https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-mms-tha.tar.bz2

    python3 scripts/make_voice.py <model_dir> build/voice.wav

Each line is placed at its "t" time and sped up (max 1.2x) when it would run past "end".
"""
import json
import sys
import wave
from math import gcd
from pathlib import Path

import numpy as np
import sherpa_onnx
from scipy.signal import butter, resample_poly, sosfilt

SR = 44100
BASE_SPEED = 0.92   # a touch slower than default reads more clearly
MAX_SPEED = 1.2
ROOT = Path(__file__).resolve().parent.parent
src = (ROOT / "src/timeline.js").read_text(encoding="utf-8")
TL = json.loads(src[src.index("{"): src.rindex("}") + 1])

model_dir = Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / "build/vits-mms-tha")
out = Path(sys.argv[2] if len(sys.argv) > 2 else ROOT / "build/voice.wav")

tokens = {ln.rsplit(" ", 1)[0] if not ln.startswith("  ") else " "
          for ln in (model_dir / "tokens.txt").read_text(encoding="utf-8").splitlines() if ln}
tts = sherpa_onnx.OfflineTts(sherpa_onnx.OfflineTtsConfig(
    model=sherpa_onnx.OfflineTtsModelConfig(
        vits=sherpa_onnx.OfflineTtsVitsModelConfig(
            model=str(model_dir / "model.onnx"), tokens=str(model_dir / "tokens.txt"),
            noise_scale=0.2, noise_scale_w=0.4),
        num_threads=4)))


def normalise(text):
    # the MMS vocabulary has no precomposed SARA AM: spell it as NIKHAHIT + SARA AA
    text = text.replace("ำ", "ํา")
    unknown = sorted({c for c in text if c not in tokens})
    if unknown:
        sys.exit(f"voice line has characters the model cannot speak {unknown}: {text!r}")
    return text


def synth(text, speed):
    a = tts.generate(normalise(text), sid=0, speed=speed)
    x = np.asarray(a.samples, dtype=np.float64)
    g = gcd(SR, a.sample_rate)
    x = resample_poly(x, SR // g, a.sample_rate // g)
    # trim leading/trailing silence so "t" is where the first syllable lands
    idx = np.flatnonzero(np.abs(x) > 0.02 * np.max(np.abs(x)))
    return x[max(idx[0] - 200, 0): idx[-1] + 2000]


N = int(SR * TL["duration"])
voice = np.zeros(N)
for line in TL["voice"]:
    window = line["end"] - line["t"]
    speed = BASE_SPEED
    x = synth(line["text"], speed)
    for _ in range(4):  # duration isn't exactly proportional to speed, so refine a few times
        if len(x) / SR <= window or speed >= MAX_SPEED:
            break
        speed = min(MAX_SPEED, speed * len(x) / SR / window * 1.03)
        x = synth(line["text"], speed)
    x = sosfilt(butter(2, 90, "high", fs=SR, output="sos"), x)
    x = x / np.sqrt(np.mean(x ** 2)) * 0.12           # even out loudness line to line
    i0 = int(line["t"] * SR)
    seg = x[: N - i0]
    voice[i0: i0 + len(seg)] += seg
    flag = "  !! overruns window" if len(x) / SR > window + 0.05 else ""
    print(f"  {line['t']:5.2f}s  {len(x) / SR:4.2f}s @x{speed:.2f}  {line['text']}{flag}")

voice = np.tanh(voice * 2.2) / np.tanh(2.2)          # gentle saturation = cheap compressor
voice = voice / np.max(np.abs(voice)) * 0.95
out.parent.mkdir(parents=True, exist_ok=True)
with wave.open(str(out), "wb") as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((voice * 32767).astype("<i2").tobytes())
print(f"wrote {out}")
