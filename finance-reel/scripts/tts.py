#!/usr/bin/env python3
"""
Generate the Thai voiceover + word timestamps for the finance reel.

Pipeline
  1. Each scene's script is split into chunks (at "(เว้น)" and at the scene-4 beats).
  2. Every chunk is synthesised separately:
       - ElevenLabs (eleven_multilingual_v2, with character alignment) if ELEVENLABS_API_KEY is in .env
       - otherwise edge-tts, voice th-TH-NiwatNeural, rate -5%, pitch +0Hz, with WordBoundary events
     If a provider returns no timestamps, faster-whisper (if installed) is used for alignment,
     else timings are spread proportionally over the chunk's characters.
  3. Chunks are trimmed to speech, faded (12 ms), joined with exact silences
     ("(เว้น)" = 350 ms), and the whole track is loudness-normalised to -14 LUFS (two-pass loudnorm).
  4. public/voice/voice.wav + public/voice/timeline.json are written. Scene lengths come from
     the real audio — nothing is hard-coded except the small gaps below.

Run:  python3 scripts/tts.py            (re-uses cached chunk audio in build/tts/)
      python3 scripts/tts.py --fresh    (re-synthesise everything)
"""
from __future__ import annotations

import asyncio
import base64
import hashlib
import json
import os
import subprocess
import sys
import urllib.request
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "build" / "tts"
OUT_DIR = ROOT / "public" / "voice"
SR = 48000

EDGE_VOICE = "th-TH-NiwatNeural"
EDGE_RATE = "-5%"
EDGE_PITCH = "+0Hz"

PAUSE_MS = 350          # "(เว้น)"
CHUNK_GAP_MS = 140      # between chunks of one scene that are NOT a (เว้น)
FADE_MS = 12
LEAD_TRIM_MS = 40       # audio kept before the first word of a chunk
TAIL_TRIM_MS = 170      # audio kept after the last word of a chunk
TARGET_LUFS = -14.0

PAUSE = "(เว้น)"

# Scene script. "|" splits a chunk without a pause (separate TTS request, short gap);
# "(เว้น)" splits with an exact 350 ms silence.
SCENES = [
    {"id": "hook", "pre": 250, "post": 300,
     "text": "รายได้ผมเพิ่มทุกปี… | แต่เงินเก็บผมเท่าเดิม"},
    {"id": "relate", "pre": 200, "post": 300,
     "text": "ผมเคยคิดว่าปัญหาคือหาเงินไม่พอ (เว้น) แต่พอได้มากขึ้น ผมก็ใช้มากขึ้น กาแฟแพงขึ้น ผ่อนนั่นนี่ สิ้นเดือนก็เหลือเท่าเดิม"},
    {"id": "turn", "pre": 200, "post": 300,
     "text": "จนผมลองจดรายจ่ายจริงจังหนึ่งเดือน (เว้น) แล้วตกใจ เงินหายไปกับเรื่องที่ผมไม่ได้ตั้งใจจะจ่ายเลย | ปัญหาไม่ใช่รายได้ ปัญหาคือเราไม่รู้ว่าเงินไปไหน"},
    {"id": "tools", "pre": 200, "post": 300,
     "beats": [
         "ผมเริ่มจาก 3 อย่าง | หนึ่ง จดรายจ่าย ตอนนี้มีตัวช่วยใน LINE อย่างเหมียวจดหรือป้านวล ใช้แบบแชทได้เลย ไม่ต้องลงแอปเพิ่ม",
         "สอง แยกบัญชี บัญชีใช้จ่าย บัญชีเก็บ บัญชีฉุกเฉิน แล้วตั้งโอนอัตโนมัติทุกวันที่เงินเข้า",
         "สาม ให้เงินทำงาน ลงทุนเท่ากันทุกเดือน เริ่มจากเงินน้อยๆ ก็ได้ | เพราะสิ่งที่ช่วยเราที่สุดคือเวลา",
     ]},
    {"id": "payoff", "pre": 250, "post": 350,
     "text": "อิสรภาพทางการเงินไม่ได้แปลว่าต้องรวยล้นฟ้า (เว้น) มันคือวันที่คุณได้ทำงานเพราะอยากทำ ไม่ใช่เพราะต้องทำ"},
    {"id": "cta", "pre": 200, "post": 1800,
     "text": "ไม่ต้องรอให้รายได้เพิ่มนะ | วันนี้ลองจดรายจ่ายแค่รายการเดียวก่อน | แล้วคอมเมนต์มาว่าคุณใช้ตัวช่วยอะไรอยู่"},
]
BEAT_GAP_MS = 260  # between the three beats of scene 4


# ----------------------------------------------------------------------------- helpers
def load_dotenv() -> dict:
    env = {}
    for p in (ROOT / ".env", ROOT.parent / ".env"):
        if p.exists():
            for line in p.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def run(cmd: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, check=True, capture_output=True, text=True)


def decode_to_float(path: Path) -> np.ndarray:
    """Any audio file -> mono float32 @ 48 kHz."""
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
        check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def write_wav(path: Path, x: np.ndarray) -> None:
    pcm = (np.clip(x, -1, 1) * 32767).astype(np.int16)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def map_tokens_to_chars(text: str, tokens: list[dict]) -> list[dict]:
    """Attach charStart/charEnd (into `text`) to each provider token, in order."""
    out, cursor = [], 0
    for t in tokens:
        tok = t["text"].strip()
        if not tok:
            continue
        idx = text.find(tok, cursor)
        if idx < 0 or idx - cursor > 12:   # not found nearby -> try case-insensitive / give up
            low = text.lower().find(tok.lower(), cursor)
            idx = low if 0 <= low and low - cursor <= 12 else -1
        if idx < 0:
            continue
        out.append({**t, "text": tok, "charStart": idx, "charEnd": idx + len(tok)})
        cursor = idx + len(tok)
    return out


def proportional_tokens(text: str, dur_ms: float) -> list[dict]:
    """Last-resort timing: split on spaces, spread time by character count."""
    parts, pos = [], 0
    for w in text.split():
        i = text.find(w, pos)
        parts.append((w, i))
        pos = i + len(w)
    total = sum(len(w) for w, _ in parts) or 1
    t, out = 80.0, []
    span = max(dur_ms - 200, 100)
    for w, i in parts:
        d = span * len(w) / total
        out.append({"text": w, "startMs": t, "endMs": t + d, "charStart": i, "charEnd": i + len(w)})
        t += d
    return out


# ----------------------------------------------------------------------------- providers
async def edge_synth(text: str, mp3_path: Path) -> list[dict]:
    import edge_tts
    proxy = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy")
    com = edge_tts.Communicate(text, EDGE_VOICE, rate=EDGE_RATE, pitch=EDGE_PITCH,
                               boundary="WordBoundary", proxy=proxy)
    tokens, audio = [], bytearray()
    async for ch in com.stream():
        if ch["type"] == "audio":
            audio += ch["data"]
        elif ch["type"] == "WordBoundary":
            s = ch["offset"] / 10_000            # 100-ns ticks -> ms
            tokens.append({"text": ch["text"], "startMs": s, "endMs": s + ch["duration"] / 10_000})
    mp3_path.write_bytes(bytes(audio))
    return tokens


def eleven_synth(text: str, mp3_path: Path, key: str, voice_id: str) -> list[dict]:
    body = json.dumps({
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {"stability": 0.4, "similarity_boost": 0.75, "style": 0.3, "use_speaker_boost": True},
    }).encode()
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/with-timestamps?output_format=mp3_44100_128",
        data=body, headers={"xi-api-key": key, "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        data = json.loads(r.read())
    mp3_path.write_bytes(base64.b64decode(data["audio_base64"]))
    al = data.get("alignment") or {}
    chars = al.get("characters") or []
    # one token per character; Remotion groups them into words with Intl.Segmenter.
    return [{"text": c, "startMs": s * 1000, "endMs": e * 1000}
            for c, s, e in zip(chars, al.get("character_start_times_seconds", []),
                               al.get("character_end_times_seconds", []))]


def whisper_align(text: str, audio_path: Path) -> list[dict]:
    try:
        from faster_whisper import WhisperModel  # type: ignore
    except ImportError:
        return []
    model = WhisperModel("small", compute_type="int8")
    segs, _ = model.transcribe(str(audio_path), language="th", word_timestamps=True,
                               initial_prompt=text)
    return [{"text": w.word, "startMs": w.start * 1000, "endMs": w.end * 1000}
            for s in segs for w in (s.words or [])]


def synth_chunk(text: str, provider: dict, fresh: bool) -> tuple[np.ndarray, list[dict]]:
    key = hashlib.sha1(f"{provider['name']}|{provider.get('voice')}|{EDGE_RATE}|{EDGE_PITCH}|{text}".encode()).hexdigest()[:16]
    mp3, js = CACHE / f"{key}.mp3", CACHE / f"{key}.json"
    if fresh or not (mp3.exists() and js.exists() and mp3.stat().st_size > 0):
        for attempt in range(4):
            try:
                if provider["name"] == "elevenlabs":
                    tokens = eleven_synth(text, mp3, provider["key"], provider["voice"])
                else:
                    tokens = asyncio.run(edge_synth(text, mp3))
                break
            except Exception as e:  # network hiccups
                if attempt == 3:
                    raise
                print(f"   retry ({e.__class__.__name__}: {e})")
        js.write_text(json.dumps(tokens, ensure_ascii=False), encoding="utf-8")
    tokens = json.loads(js.read_text(encoding="utf-8"))
    audio = decode_to_float(mp3)
    if not tokens:
        tokens = whisper_align(text, mp3)
    mapped = map_tokens_to_chars(text, tokens) if tokens else []
    if not mapped:
        mapped = proportional_tokens(text, len(audio) / SR * 1000)
    return audio, mapped


# ----------------------------------------------------------------------------- build
def split_chunks(text: str) -> list[tuple[str, int]]:
    """-> [(chunk_text, gap_before_ms)]"""
    out = []
    for i, part in enumerate(text.split(PAUSE)):
        for j, sub in enumerate(part.split("|")):
            sub = " ".join(sub.split())
            if not sub:
                continue
            gap = 0 if not out else (PAUSE_MS if j == 0 else CHUNK_GAP_MS)
            out.append((sub, gap))
    return out


def fade(x: np.ndarray) -> np.ndarray:
    n = min(int(SR * FADE_MS / 1000), len(x) // 2)
    if n > 0:
        ramp = 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, n))
        x[:n] *= ramp
        x[-n:] *= ramp[::-1]
    return x


def measure_lufs(path: Path) -> tuple[float, float]:
    p = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(path), "-af", "ebur128=peak=true",
                        "-f", "null", "-"], capture_output=True, text=True)
    summary = p.stderr[p.stderr.rfind("Summary:"):]
    vals = {}
    for line in summary.splitlines():
        line = line.strip()
        if line.startswith("I:"):
            vals["I"] = float(line.split()[1])
        elif line.startswith("Peak:"):
            vals["TP"] = float(line.split()[1])
    return vals["I"], vals.get("TP", 0.0)


def loudnorm(src: Path, dst: Path) -> dict:
    """Static gain to TARGET_LUFS + a transparent true-peak limiter (-1.5 dBTP), refined twice.
    (ffmpeg's loudnorm silently falls back to dynamic mode / misses the target when the peak
    budget is exceeded, so we do gain + limiter and re-measure instead.)"""
    i_in, _ = measure_lufs(src)
    gain = TARGET_LUFS - i_in
    for _ in range(6):
        run(["ffmpeg", "-y", "-v", "error", "-i", str(src), "-af",
             f"volume={gain:.3f}dB,alimiter=limit=0.86:attack=2:release=60:level=false,"
             f"aresample={SR}", "-ac", "1", "-c:a", "pcm_s16le", str(dst)])
        i_out, tp = measure_lufs(dst)
        if abs(i_out - TARGET_LUFS) < 0.15:
            break
        gain += TARGET_LUFS - i_out
    return {"input_lufs": i_in, "output_lufs": i_out, "true_peak_dbfs": tp, "gain_db": round(gain, 2)}


def main() -> None:
    fresh = "--fresh" in sys.argv
    CACHE.mkdir(parents=True, exist_ok=True)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    env = {**load_dotenv(), **{k: v for k, v in os.environ.items() if k.startswith("ELEVENLABS")}}
    if env.get("ELEVENLABS_API_KEY"):
        provider = {"name": "elevenlabs", "key": env["ELEVENLABS_API_KEY"],
                    # default: a multilingual premade voice; override with ELEVENLABS_VOICE_ID
                    "voice": env.get("ELEVENLABS_VOICE_ID", "pNInz6obpgDQGcFmaJgB")}
    else:
        provider = {"name": "edge-tts", "voice": EDGE_VOICE}
    print(f"TTS provider: {provider['name']} ({provider['voice']})")

    track: list[np.ndarray] = []
    cursor = 0  # samples
    ms = lambda n: n * 1000 / SR  # noqa: E731

    def silence(msec: float):
        nonlocal cursor
        n = int(round(SR * msec / 1000))
        track.append(np.zeros(n, dtype=np.float32))
        cursor += n

    scenes_out = []
    for sc in SCENES:
        start = cursor
        silence(sc["pre"])
        beats_src = sc.get("beats") or [sc["text"]]
        beats_out = []
        for bi, beat_text in enumerate(beats_src):
            if bi > 0:
                silence(BEAT_GAP_MS)
            beat_start = cursor
            chunks_out = []
            for text, gap in split_chunks(beat_text):
                if gap:
                    silence(gap)
                print(f"  [{sc['id']}] {text}")
                audio, toks = synth_chunk(text, provider, fresh)
                first = min(t["startMs"] for t in toks)
                last = max(t["endMs"] for t in toks)
                a0 = max(0, int(SR * (first - LEAD_TRIM_MS) / 1000))
                a1 = min(len(audio), int(SR * (last + TAIL_TRIM_MS) / 1000))
                seg = fade(audio[a0:a1].copy())
                off = ms(cursor) - ms(a0)          # chunk-local ms -> track ms
                chunks_out.append({
                    "text": text,
                    "startMs": round(ms(cursor), 1),
                    "endMs": round(ms(cursor + len(seg)), 1),
                    "pauseBeforeMs": gap,
                    "tokens": [{"text": t["text"], "charStart": t["charStart"], "charEnd": t["charEnd"],
                                "startMs": round(t["startMs"] + off, 1), "endMs": round(t["endMs"] + off, 1)}
                               for t in toks],
                })
                track.append(seg)
                cursor += len(seg)
            beats_out.append({"startMs": round(ms(beat_start), 1), "endMs": round(ms(cursor), 1),
                              "chunks": chunks_out})
        silence(sc["post"])
        scenes_out.append({"id": sc["id"], "startMs": round(ms(start), 1), "endMs": round(ms(cursor), 1),
                           "beats": beats_out})

    raw = CACHE / "voice_raw.wav"
    write_wav(raw, np.concatenate(track))
    loud = loudnorm(raw, OUT_DIR / "voice.wav")

    total_ms = ms(cursor)
    timeline = {
        "provider": provider["name"], "voice": provider["voice"],
        "rate": EDGE_RATE if provider["name"] == "edge-tts" else None,
        "pitch": EDGE_PITCH if provider["name"] == "edge-tts" else None,
        "sampleRate": SR, "totalMs": round(total_ms, 1), "loudness": loud,
        "voiceFile": "voice/voice.wav", "scenes": scenes_out,
    }
    (OUT_DIR / "timeline.json").write_text(json.dumps(timeline, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"\nTotal {total_ms / 1000:.2f}s  loudness {loud}")
    for s in scenes_out:
        print(f"  {s['id']:7s} {s['startMs'] / 1000:6.2f} → {s['endMs'] / 1000:6.2f}  ({(s['endMs'] - s['startMs']) / 1000:.2f}s)")


if __name__ == "__main__":
    main()
