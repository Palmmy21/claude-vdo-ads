// Single source of truth for timing (seconds). Used by scene.html (visuals)
// and scripts/make_audio.py (sound effects + music), so picture and sound stay in sync.
window.TL = {
  "fps": 30,
  "duration": 30,
  "width": 1080,
  "height": 1920,
  "scenes": {
    "hook":     [0.0, 3.0],
    "pain":     [3.0, 7.95],
    "reveal":   [7.5, 10.8],
    "features": [10.3, 20.9],
    "benefit":  [20.4, 23.5],
    "cta":      [23.0, 30.01]
  },
  "hook":     { "kicker": 0.1, "line1": 0.25, "line2": 0.8, "mark": 1.1, "out": 2.7 },
  "pain":     { "title": 3.05, "cards": [3.4, 4.2, 5.0, 5.8], "tired": 6.55, "implode": 7.15 },
  "reveal":   { "wipe": 7.5, "logo": 7.65, "word": 8.0, "thai": 8.4, "tag": 8.75, "tag2": [9.0, 9.15, 9.3], "out": 10.3 },
  "features": { "enter": 10.3, "phone": 10.45, "start": 10.7, "step": 1.95, "count": 5, "out": 20.4 },
  "benefit":  { "in": 20.4, "line1": 20.6, "strike": 21.15, "line2": 21.55, "clicks": [21.65, 21.85, 22.05], "line3": 22.3, "out": 22.95 },
  "cta":      { "in": 23.0, "head1": 23.15, "head2": 23.45, "typing1": 23.85, "msg1": 24.4,
                "type": [24.7, 25.15], "send": 25.25, "msg2": 25.3, "typing2": 25.7, "msg3": 26.2,
                "button": 26.7, "hand": 27.1, "tap": 27.55, "hint": 27.9, "footer": 28.3, "end": 29.0 }
};
