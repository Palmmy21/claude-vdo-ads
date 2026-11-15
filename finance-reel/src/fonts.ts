import {continueRender, delayRender, staticFile} from 'remotion';

const handle = delayRender('Loading Noto Sans Thai');

const faces = [400, 600, 800].map(
  (w) =>
    new FontFace('Noto Sans Thai', `url('${staticFile(`fonts/NotoSansThai-${w}.ttf`)}') format('truetype')`, {
      weight: String(w),
    }),
);

Promise.all(faces.map((f) => f.load()))
  .then((loaded) => {
    loaded.forEach((f) => (document.fonts as unknown as {add: (x: FontFace) => void}).add(f));
    return document.fonts.ready;
  })
  .then(() => continueRender(handle))
  .catch((err) => {
    console.error(err);
    continueRender(handle);
  });
