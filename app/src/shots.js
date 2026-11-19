// Fixed scenes for screenshots: ?shot=cover shows the exported cover alone,
// ?shot=editor shows the editor with a photo loaded. The screenshot script
// drives these with a query string; window.__shotReady is set once painted.
// The cover scene draws at the query's w/h so the shot is pixel-exact.

import { drawCover } from './cover.js';
import { SIZES } from './state.js';

function param(query, key, fallback) {
  const value = query.get(key);
  return value === null || value === '' ? fallback : value;
}

export async function runShot(shot, query, api) {
  const layout = param(query, 'layout', 'carhero');
  const grade = param(query, 'grade', 'sunset');
  const title = param(query, 'title', 'Neon Shore');
  const subtitle = param(query, 'subtitle', 'a Vice City story');
  const sizeKey = param(query, 'size', '1080x1080');
  const size = SIZES[sizeKey] ?? SIZES['1080x1080'];

  await api.loadSamples();

  const next = {
    ...api.getState(),
    layout, grade, title, subtitle, size: sizeKey,
  };
  api.setState(next);

  if (shot === 'cover' || shot === 'story' || shot === 'tilt') {
    document.body.classList.add('shot-cover');
    // Draw at the screenshot's own pixel size, not the export size.
    const w = Number(param(query, 'w', String(size.w)));
    const h = Number(param(query, 'h', String(size.h)));
    api.render({
      w: Number.isFinite(w) && w > 0 ? w : size.w,
      h: Number.isFinite(h) && h > 0 ? h : size.h,
    });
  } else {
    // Editor scene: the UI stays visible with the cover beside it.
    api.render();
  }

  await new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      window.__shotReady = true;
      resolve();
    }));
  });
}
