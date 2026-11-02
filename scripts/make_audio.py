"""Synthesises the soundtrack (music bed + sound effects) for the HorCare ad.

Everything is generated procedurally (no samples, no licensing issues) and timed
from src/timeline.js so it lines up with the visuals.

    python3 scripts/make_audio.py build/audio.wav [build/voice.wav]

If a voiceover track exists (default build/voice.wav, see make_voice.py) it is mixed
in on top, with the music and effects ducked underneath it.
"""
import json
import sys
import wave
from pathlib import Path

import numpy as np
from scipy.signal import butter, sosfilt

SR = 44100
ROOT = Path(__file__).resolve().parent.parent
src = (ROOT / "src/timeline.js").read_text(encoding="utf-8")
TL = json.loads(src[src.index("{"): src.rindex("}") + 1])
DUR = TL["duration"]
N = int(SR * DUR)
rng = np.random.default_rng(7)

music = np.zeros((N, 2))
sfx = np.zeros((N, 2))


# ---------------------------------------------------------------- helpers
def tt(d):
    return np.arange(int(SR * d)) / SR


def noise(d):
    return rng.uniform(-1, 1, int(SR * d))


def filt(x, kind, f):
    sos = butter(2, f, btype=kind, fs=SR, output="sos")
    return sosfilt(sos, x)


def expdec(d, k):
    return np.exp(-tt(d) * k)


def sweep_sine(d, f0, f1, curve="exp"):
    t = tt(d)
    f = f0 * (f1 / f0) ** (t / d) if curve == "exp" else f0 + (f1 - f0) * t / d
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def svf_sweep(x, f0, f1, q=1.2):
    """Band-pass state-variable filter whose centre glides f0 -> f1 (exp)."""
    n = len(x)
    f = f0 * (f1 / f0) ** (np.arange(n) / max(n - 1, 1))
    g = 2 * np.sin(np.pi * np.minimum(f, SR / 6) / SR)
    damp = 1.0 / q
    low = band = 0.0
    out = np.empty(n)
    for i in range(n):
        high = x[i] - low - damp * band
        band += g[i] * high
        low += g[i] * band
        out[i] = band
    return out


def place(buf, t0, sig, gain=1.0, pan=0.0):
    if sig.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        sig = np.stack([sig * l * 1.414, sig * r * 1.414], axis=1)
    i0 = int(t0 * SR)
    if i0 >= N:
        return
    seg = sig[: N - i0]
    buf[i0: i0 + len(seg)] += seg * gain


def norm(x):
    m = np.max(np.abs(x))
    return x / m if m > 0 else x


def adsr(n, a=0.005, r=0.05):
    env = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    na, nr = min(na, n), min(nr, n)
    env[:na] = np.linspace(0, 1, na)
    if nr:
        env[-nr:] *= np.linspace(1, 0, nr)
    return env


# ---------------------------------------------------------------- sfx bank
def whoosh(d=0.5, f0=300, f1=4000, peak=0.6, stereo=True):
    x = svf_sweep(noise(d), f0, f1, 1.4)
    t = tt(d) / d
    env = np.where(t < peak, (t / peak) ** 2, ((1 - t) / (1 - peak)) ** 1.5)
    x = norm(x * env)
    if not stereo:
        return x
    pan = np.linspace(-0.7, 0.7, len(x))
    return np.stack([x * np.cos((pan + 1) * np.pi / 4), x * np.sin((pan + 1) * np.pi / 4)], axis=1) * 1.4


def impact(d=1.2):
    sub = sweep_sine(d, 110, 38) * expdec(d, 3.2)
    body = filt(noise(d), "low", 1800) * expdec(d, 14)
    click = filt(noise(d), "high", 3000) * expdec(d, 80)
    return norm(sub * 1.0 + body * 0.8 + click * 0.4)


def hit(d=0.4):
    return norm(sweep_sine(d, 190, 55) * expdec(d, 10) + filt(noise(d), "high", 1200) * expdec(d, 40) * 0.6)


def thud(d=0.25):
    return norm(sweep_sine(d, 150, 65) * expdec(d, 18) + filt(noise(d), "low", 900) * expdec(d, 35) * 0.4)


def pop(pitch=1.0, d=0.12):
    return norm(sweep_sine(d, 420 * pitch, 1100 * pitch) * expdec(d, 38) * adsr(int(SR * d), 0.002, 0.01))


def click(d=0.05):
    return norm(filt(noise(d), "high", 2500) * expdec(d, 220) + np.sin(2 * np.pi * 2200 * tt(d)) * expdec(d, 160) * 0.5)


def bell(f, d=0.9, k=4.0):
    t = tt(d)
    parts = [(1, 1.0, 1.0), (2.0, 0.45, 1.6), (2.76, 0.25, 2.2), (5.4, 0.12, 3.5)]
    x = sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t * k * kk) for m, a, kk in parts)
    return norm(x * adsr(len(t), 0.002, 0.05))


def ping():
    return bell(1568, 0.45, 7)


def msg_in():
    x = np.zeros(int(SR * 0.7))
    a, b = bell(880, 0.5, 8), bell(1318.5, 0.6, 6)
    x[: len(a)] += a
    o = int(0.09 * SR)
    x[o: o + len(b)] += b
    return norm(x)


def msg_out():
    w = whoosh(0.22, 800, 5000, 0.7, stereo=False) * 0.6
    x = np.zeros(int(SR * 0.3))
    x[: len(w)] += w
    p = pop(1.6)
    o = int(0.16 * SR)
    x[o: o + len(p)] += p
    return norm(x)


def coin():
    x = np.zeros(int(SR * 0.45))
    sq = lambda f, d: np.sign(np.sin(2 * np.pi * f * tt(d))) * 0.5 + np.sin(2 * np.pi * f * tt(d)) * 0.5
    a = sq(1975.5, 0.07) * adsr(int(SR * 0.07), 0.001, 0.005)
    b = sq(2637, 0.38) * expdec(0.38, 9)
    x[: len(a)] += a
    o = int(0.07 * SR)
    x[o: o + len(b)] += b
    return norm(filt(x, "low", 7000))


def chaching():
    d = 0.9
    x = np.zeros(int(SR * d))
    rattle = filt(noise(0.12), "band", [2500, 7500]) * expdec(0.12, 30)
    x[: len(rattle)] += rattle * 0.7
    for off, f in [(0.07, 2093), (0.16, 2637)]:
        bl = bell(f, 0.7, 5)
        o = int(off * SR)
        x[o: o + len(bl)] += bl[: len(x) - o] * 0.8
    return norm(x)


def buzz(d=0.35):
    t = tt(d)
    x = np.tanh(3 * np.sin(2 * np.pi * 170 * t)) * (0.6 + 0.4 * np.sin(2 * np.pi * 30 * t))
    return norm(filt(x, "low", 900) * adsr(len(t), 0.01, 0.04))


def error_beep():
    x = np.zeros(int(SR * 0.3))
    for i, f in enumerate([311, 233]):
        d = 0.1
        s = np.tanh(2 * np.sin(2 * np.pi * f * tt(d))) * adsr(int(SR * d), 0.003, 0.02)
        o = int(i * 0.12 * SR)
        x[o: o + len(s)] += s
    return norm(filt(x, "low", 2500))


def riser(d=0.8):
    t = tt(d) / d
    n = svf_sweep(noise(d), 300, 7000, 2.0)
    s = sweep_sine(d, 180, 1400) * 0.35
    return norm((n + s) * t ** 2.2)


def sparkle(d=0.8, count=16):
    x = np.zeros((int(SR * d), 2))
    for _ in range(count):
        f = rng.uniform(2200, 6000)
        dd = 0.12
        s = np.sin(2 * np.pi * f * tt(dd)) * expdec(dd, 30)
        place_local(x, rng.uniform(0, d - dd), s, rng.uniform(0.3, 1), rng.uniform(-0.8, 0.8))
    return x / np.max(np.abs(x))


def place_local(buf, t0, sig, gain, pan):
    i0 = int(t0 * SR)
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    seg = sig[: len(buf) - i0]
    buf[i0: i0 + len(seg), 0] += seg * l * gain
    buf[i0: i0 + len(seg), 1] += seg * r * gain


def scribble(d=0.32):
    t = tt(d)
    am = 0.5 + 0.5 * np.sin(2 * np.pi * 22 * t + 2 * np.sin(2 * np.pi * 5 * t))
    return norm(filt(noise(d), "band", [1400, 4200]) * am * adsr(len(t), 0.01, 0.05))


def paper(d=0.35):
    t = tt(d)
    jitter = np.abs(filt(noise(d), "low", 40))
    return norm(filt(noise(d), "band", [900, 5000]) * jitter * adsr(len(t), 0.02, 0.1))


def tick(f=2400):
    d = 0.04
    return norm(np.sin(2 * np.pi * f * tt(d)) * expdec(d, 120) + filt(noise(d), "high", 4000) * expdec(d, 300) * 0.4)


def keytap():
    d = 0.035
    return norm(filt(noise(d), "band", [1500, 6000]) * expdec(d, 180))


# ---------------------------------------------------------------- cue sheet
H, P, R, F, B, C = (TL[k] for k in ("hook", "pain", "reveal", "features", "benefit", "cta"))
fst = lambda i: F["start"] + i * F["step"]

cues = [
    # hook
    (0.0, hit(), 0.55, 0), (H["line1"] - .05, whoosh(0.35, 400, 3500), 0.35, 0),
    (H["line2"], hit(), 0.8, 0), (H["line2"], paper(), 0.35, -0.4), (1.5, paper(), 0.3, 0.5),
    (H["mark"], scribble(0.3), 0.3, 0), (2.2, paper(), 0.25, -0.2),
    (H["out"] - .05, whoosh(0.35, 3000, 400, 0.4), 0.4, 0),
    # pain
    (3.0, thud(), 0.6, 0), (P["title"], whoosh(0.3, 500, 3000), 0.3, 0),
    (P["tired"], impact(), 0.75, 0), (P["tired"] + .02, buzz(0.45), 0.35, 0),
    (P["implode"] - .45, riser(0.8), 0.45, 0),
]
for i, c in enumerate(P["cards"]):
    cues += [(c, whoosh(0.32, 600, 4000, 0.7), 0.35, -0.6 if i % 2 == 0 else 0.6),
             (c + .3, thud(), 0.6, 0), (c + .34, error_beep(), 0.22, 0)]
for k in range(5):
    cues.append((P["cards"][3] + .4 + k * .12, ping(), 0.18 + k * .02, (-1) ** k * 0.4))
cues += [(P["cards"][3] + .45, buzz(), 0.3, 0)]
# reveal
cues += [(R["wipe"], impact(1.6), 1.0, 0), (R["wipe"] - .02, whoosh(0.4, 4000, 300, 0.2), 0.45, 0),
         (R["logo"] + .1, sparkle(0.9), 0.35, 0), (R["word"], whoosh(0.4, 600, 6000, 0.5), 0.3, 0),
         (R["thai"], pop(0.9), 0.4, 0), (R["tag"], whoosh(0.3, 800, 4000), 0.2, 0)]
cues += [(t, pop(1.0 + i * 0.25), 0.45, (i - 1) * 0.4) for i, t in enumerate(R["tag2"])]
# features
cues += [(F["enter"], whoosh(0.5, 300, 5000, 0.55), 0.55, 0), (F["phone"] + .35, thud(), 0.45, 0)]
for i in range(1, F["count"]):
    cues.append((fst(i) - .18, whoosh(0.4, 700, 5500, 0.55), 0.38, 0))
cues += [(fst(0) + .3, click(), 0.6, 0)]
cues += [(fst(0) + .62 + j * .12, pop(1.0 + j * 0.12), 0.32, 0.2) for j in range(6)]
cues += [(fst(0) + 1.3, ping(), 0.25, 0)]
cues += [(fst(1) + .15, whoosh(0.9, 500, 6000, 0.5), 0.35, 0)]
cues += [(fst(1) + .7 + j * .25, ping(), 0.25, (j - 1) * 0.4) for j in range(3)]
cues += [(fst(2) + .35, chaching(), 0.45, 0)]
cues += [(fst(2) + .45 + j * .16, coin(), 0.16, (j % 2 - .5)) for j in range(1, 6)]
cues += [(fst(3) + s, tick(1800 + j * 400), 0.5, 0) for j, s in enumerate([.35, .75])]
cues += [(fst(3) + 1.15, bell(1318.5, 0.9, 4), 0.35, 0)]
cues += [(fst(4) + .15 + k * 0.05, tick(2600 + k * 25), 0.12, 0) for k in range(20)]
cues += [(fst(4) + 1.2, chaching(), 0.45, 0), (fst(4) + .2, whoosh(0.5, 300, 2000, 0.6), 0.2, 0)]
# benefit
cues += [(B["in"], whoosh(0.5, 300, 5000, 0.5), 0.5, 0), (B["line1"], whoosh(0.3, 600, 3000), 0.25, 0),
         (B["strike"], scribble(), 0.45, 0), (B["line2"], hit(), 0.6, 0), (B["line2"] + .05, sparkle(0.8), 0.35, 0),
         (B["line3"], pop(1.2), 0.35, 0), (B["out"], whoosh(0.4, 3000, 500, 0.3), 0.35, 0)]
cues += [(c, click(), 0.6, (i - 1) * 0.5) for i, c in enumerate(B["clicks"])]
# CTA
cues += [(C["in"], whoosh(0.45, 300, 5000, 0.6), 0.5, 0), (C["head1"], whoosh(0.3, 800, 4000), 0.2, 0),
         (C["head2"], hit(), 0.7, 0), (C["head2"] + .2, whoosh(0.4, 400, 3000), 0.25, 0),
         (C["msg1"], msg_in(), 0.55, -0.2), (C["msg2"], msg_out(), 0.5, 0.2), (C["msg3"], msg_in(), 0.55, -0.2),
         (C["button"], impact(1.2), 0.65, 0), (C["button"] + .05, sparkle(0.9), 0.4, 0),
         (C["tap"], click(), 0.8, 0.2), (C["tap"] + .02, pop(1.4), 0.4, 0.2),
         (C["hint"], whoosh(0.3, 800, 3500), 0.2, 0), (C["footer"], sparkle(0.6, 10), 0.2, 0),
         (C["end"], bell(1046.5, 1.0, 2.5), 0.3, 0)]
for s0, s1 in [(C["typing1"], C["msg1"]), (C["typing2"], C["msg3"])]:
    cues += [(s0 + k * .17, pop(0.7, 0.06), 0.08, -0.3) for k in range(int((s1 - s0) / .17))]
nkeys = 12
cues += [(C["type"][0] + k * (C["type"][1] - C["type"][0]) / nkeys, keytap(), 0.28, 0.25) for k in range(nkeys)]
cues += [(C["send"] - .05, click(), 0.4, 0.3)]

for t0, sig, g, pan in cues:
    place(sfx, t0, sig, g, pan)

# ---------------------------------------------------------------- music
BPM = 120
BEAT = 60 / BPM
NOTE = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def hz(name, octave):
    return 440 * 2 ** ((NOTE[name] + 12 * (octave + 1) - 69) / 12)


def kick():
    d = 0.35
    return norm(sweep_sine(d, 160, 45) * expdec(d, 9) + filt(noise(d), "high", 3000) * expdec(d, 200) * 0.3)


def clap():
    d = 0.25
    x = np.zeros(int(SR * d))
    n = filt(noise(d), "band", [900, 5000])
    for o in (0, 0.012, 0.024):
        i = int(o * SR)
        m = len(x) - i
        x[i:] += n[:m] * np.exp(-np.arange(m) / SR * (60 if o < 0.02 else 18))
    return norm(x)


def hat(open_=False):
    d = 0.18 if open_ else 0.05
    return norm(filt(noise(d), "high", 7500) * expdec(d, 18 if open_ else 90))


def pluck(f, d=0.35):
    t = tt(d)
    x = sum(np.sin(2 * np.pi * f * k * t) / k * np.exp(-t * (6 + 5 * k)) for k in range(1, 7))
    return norm(x * adsr(len(t), 0.003, 0.03))


def bass(f, d):
    t = tt(d)
    x = sum(np.sin(2 * np.pi * f * k * t) / k for k in range(1, 6))
    x = filt(x, "low", 700)
    return norm(x * np.exp(-t * 4) * adsr(len(t), 0.004, 0.03))


def pad(freqs, d):
    t = tt(d)
    x = np.zeros(len(t))
    for f in freqs:
        for det in (-0.12, 0.12):
            ph = (f * 2 ** (det / 12)) * t
            x += 2 * (ph - np.floor(ph + 0.5))
    x = filt(x, "low", 1400)
    env = np.minimum(1, t / 0.25) * np.minimum(1, (d - t) / 0.2)
    return norm(x * env)


# --- part A (hook + pain): tension bed — drone + clock + heartbeat
drone_end = R["wipe"] - 0.35
td = tt(drone_end)
drone = (np.sin(2 * np.pi * 55 * td) + 0.5 * np.sin(2 * np.pi * 82.4 * td) + 0.25 * np.sin(2 * np.pi * 110 * td * (1 + 0.002 * np.sin(td))))
drone *= np.minimum(1, td / 0.6) * np.minimum(1, (drone_end - td) / 0.3) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.5 * td))
place(music, 0, norm(drone), 0.22)
for k in range(int(drone_end / BEAT)):
    t0 = k * BEAT
    place(music, t0, tick(2000 if k % 2 == 0 else 1500), 0.10, 0.3 if k % 2 else -0.3)
    if t0 >= 3.0 and k % 2 == 0:  # heartbeat in the pain section
        place(music, t0, kick(), 0.30)
        place(music, t0 + 0.18, kick(), 0.18)

# --- part B (reveal -> end): upbeat I–V–vi–IV groove
prog = [("C", [("C", 3), ("E", 3), ("G", 3), ("C", 4)]),
        ("G", [("G", 2), ("B", 2), ("D", 3), ("G", 3)]),
        ("A", [("A", 2), ("C", 3), ("E", 3), ("A", 3)]),
        ("F", [("F", 2), ("A", 2), ("C", 3), ("F", 3)])]
start = R["wipe"]
end = C["end"]
bar = 4 * BEAT
nbars = int(round((end - start) / bar))
for b in range(nbars):
    t_bar = start + b * bar
    root, chord = prog[b % 4]
    freqs = [hz(n, o) for n, o in chord]
    place(music, t_bar, pad(freqs, bar), 0.10)
    for beat in range(4):
        tb = t_bar + beat * BEAT
        place(music, tb, kick(), 0.42)
        if beat in (1, 3):
            place(music, tb, clap(), 0.20, 0.1)
        place(music, tb + BEAT / 2, hat(open_=beat == 3), 0.09, 0.4)
        place(music, tb, hat(), 0.05, -0.4)
    for e in range(8):  # bass on 8ths, octave jump on offbeats
        f = hz(root, 2) * (2 if e % 2 else 1)
        place(music, t_bar + e * BEAT / 2, bass(f, BEAT / 2), 0.20)
    arp = [freqs[i] * 2 for i in (0, 1, 2, 3, 2, 1, 2, 3)]
    for e, f in enumerate(arp):
        place(music, t_bar + e * BEAT / 2, pluck(f), 0.07, -0.5 if e % 2 else 0.5)

# final resolving chord
place(music, end, pad([hz("C", 3), hz("E", 3), hz("G", 3), hz("C", 4)], DUR - end), 0.16)
place(music, end, kick(), 0.4)
for i, f in enumerate([hz("C", 5), hz("E", 5), hz("G", 5), hz("C", 6)]):
    place(music, end + i * 0.06, pluck(f, 0.8), 0.08, (i - 1.5) * 0.3)

# duck the music slightly under the big hits
duck = np.ones(N)
for t0 in [R["wipe"], P["tired"], B["line2"], C["head2"], C["button"]]:
    i0 = int(t0 * SR)
    seg = 1 - 0.45 * np.exp(-tt(0.6) * 6)
    duck[i0: i0 + len(seg)] = np.minimum(duck[i0: i0 + len(seg)], seg[: N - i0])

# voiceover (optional): duck music ~9 dB and sfx ~3 dB while someone is talking
voice = np.zeros(N)
vpath = Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / "build/voice.wav"
if vpath.exists():
    with wave.open(str(vpath)) as w:
        assert w.getframerate() == SR and w.getnchannels() == 1
        v = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2") / 32768
    voice[: min(N, len(v))] = v[:N]
    env = filt(np.abs(voice), "low", 6)                      # syllable-smoothed level
    talk = np.clip(env / (np.max(env) * 0.25), 0, 1)
    hold = int(0.25 * SR)                                     # release so the bed doesn't pump between words
    talk = np.convolve(talk, np.ones(hold) / hold, mode="same")
    talk = np.clip(talk * 2, 0, 1)
    duck = duck * (1 - 0.65 * talk)
    sfx_gain = (1 - 0.3 * talk)[:, None]
    print(f"mixed voiceover from {vpath}")
else:
    sfx_gain = 1.0

mix = music * duck[:, None] * 0.9 + sfx * 0.85 * sfx_gain + voice[:, None] * 0.95
fade = int(0.4 * SR)
mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
mix = mix / np.percentile(np.abs(mix), 99.95)   # set level from near-peaks, ignoring a few spikes
mix = np.tanh(mix * 0.8)                        # soft limiter
mix = mix / np.max(np.abs(mix)) * 0.68          # ≈ -14 LUFS with the voiceover in

out = Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / "build/audio.wav")
out.parent.mkdir(parents=True, exist_ok=True)
with wave.open(str(out), "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype("<i2").tobytes())
print(f"wrote {out} ({DUR}s, {len(cues)} sfx cues)")
