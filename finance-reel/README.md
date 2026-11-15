# Finance Reel — คลิปแนวตั้ง 60 วินาที (Remotion)

คลิป motion graphic เรื่องการเงินส่วนตัว **1080×1920 · 30fps · H.264 + AAC** สำหรับ TikTok / Reels / Shorts

▶ **[`out/final.mp4`](out/final.mp4)**

## โครงสร้าง

```
scripts/tts.py          เสียงพากย์ทีละช่วง (edge-tts th-TH-NiwatNeural, rate -5%, pitch +0Hz
                        หรือ ElevenLabs eleven_multilingual_v2 ถ้ามี ELEVENLABS_API_KEY ใน .env)
                        → public/voice/voice.wav (-14 LUFS) + public/voice/timeline.json (เวลาคำต่อคำ)
scripts/render.mjs      bundle + render → out/final.mp4 (ปรับ loudness ของมิกซ์สุดท้ายเป็น -14 LUFS)
                        --preview → out/preview.mp4 (ครึ่งขนาด) + out/frames/*.png (ภาพนิ่งทุกซีน)
src/timeline.ts         อ่าน timeline.json → ความยาวซีน / จังหวะ / เฟรมของแต่ละคำ (at('scene','คำ'))
src/components/Subtitles.tsx  ซับคำต่อคำ (Intl.Segmenter 'th'), 2–4 คำ, คำที่พูดอยู่ = มิ้นต์ + spring
src/components/SceneWrap.tsx  ทรานซิชัน whip / scale-blur ยาว 10 เฟรม
src/scenes/*.tsx        Hook · Relate · Turn · Tools (3 จังหวะ) · Payoff · Cta
```

ความยาวทุกซีนมาจากความยาวเสียงจริง และแอนิเมชันทุกจังหวะผูกกับเวลาที่คำนั้นถูกพูด
ถ้าแก้บทใน `scripts/tts.py` แล้วรันใหม่ ภาพจะเลื่อนตามเองทั้งหมด

## Build

```bash
npm install
pip install edge-tts
npm run tts        # python3 scripts/tts.py   (--fresh = สร้างเสียงใหม่ทั้งหมด)
npm run preview    # ตรวจภาพ
npm run render     # → out/final.mp4
```

- **เพลง:** วางไฟล์ `public/music.mp3` → ใช้อัตโนมัติที่ -22 dB และ duck ลงอีก 8 dB ตอนมีเสียงพากย์ (ไม่มีไฟล์ = ไม่มีเพลง)
- **SFX:** วาง `public/sfx/whoosh.(mp3|wav)` และ `public/sfx/pop.(mp3|wav)` → whoosh ตอนเปลี่ยนซีน, pop ตอน text เด้งเข้า (ไม่มีไฟล์ = ข้าม)
- edge-tts ต้องต่อ `speech.platform.bing.com` ได้
- พื้นที่ปลอดภัย: บน 250px, ล่าง 400px, ขวา 150px (`SAFE` ใน `src/theme.ts`)
- ฟอนต์ Noto Sans Thai (SIL OFL) อยู่ใน `public/fonts/`
