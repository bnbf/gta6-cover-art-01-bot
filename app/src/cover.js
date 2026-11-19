// Draws the cover onto a canvas: sunset sky, inked photo panels, halftone
// title block, badge ribbon, grain and vignette. Everything is drawn with
// the 2D canvas API from the photos the user loaded; nothing is fetched.

import { layoutById } from './layouts.js';
import { gradeById } from './grades.js';
import { cropFor } from './state.js';

/** Deterministic pseudo-random generator, so a cover renders the same way twice. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fitFont(ctx, text, maxWidth, startSize, family) {
  let size = startSize;
  ctx.font = `900 ${size}px ${family}`;
  while (size > 10 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `900 ${size}px ${family}`;
  }
  return size;
}

function drawSky(ctx, W, H, grade) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  const stops = grade.sky;
  stops.forEach((color, i) => sky.addColorStop(i / (stops.length - 1), color));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  // Horizon glow.
  const glow = ctx.createRadialGradient(W * 0.72, H * 0.30, 0, W * 0.72, H * 0.30, W * 0.42);
  glow.addColorStop(0, grade.sunGlow);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  // Sun disc.
  ctx.save();
  ctx.fillStyle = grade.sun;
  ctx.beginPath();
  ctx.arc(W * 0.72, H * 0.30, W * 0.075, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPhotoInto(ctx, photo, dx, dy, dw, dh, crop, grade) {
  const iw = photo.naturalWidth;
  const ih = photo.naturalHeight;
  if (!iw || !ih) return;
  // Cover-fit, then zoom around the pan point.
  const base = Math.max(dw / iw, dh / ih);
  const scale = base * (crop.zoom || 1);
  const pw = iw * scale;
  const ph = ih * scale;
  const ox = (dw - pw) / 2 + (crop.ox || 0) * dw;
  const oy = (dh - ph) / 2 + (crop.oy || 0) * dh;
  ctx.save();
  ctx.filter = grade.photoFilter;
  ctx.drawImage(photo, dx + ox, dy + oy, pw, ph);
  ctx.restore();
  // Warm wash from the top, cool wash at the foot.
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  const wash = ctx.createLinearGradient(0, dy, 0, dy + dh);
  wash.addColorStop(0, grade.washTop);
  wash.addColorStop(1, grade.washBottom);
  ctx.fillStyle = wash;
  ctx.fillRect(dx, dy, dw, dh);
  ctx.restore();
}

function drawInkFrame(ctx, x, y, w, h, grade) {
  const band = Math.max(3, Math.round(Math.min(w, h) * 0.018));
  ctx.save();
  ctx.strokeStyle = grade.band;
  ctx.lineWidth = band;
  ctx.strokeRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = Math.max(1, band * 0.14);
  ctx.strokeRect(x + band * 0.75, y + band * 0.75, w - band * 1.5, h - band * 1.5);
  ctx.restore();
}

function drawSnapFrame(ctx, x, y, w, h) {
  const pad = Math.max(6, Math.round(Math.min(w, h) * 0.045));
  const foot = pad * 2.4;
  ctx.save();
  ctx.fillStyle = '#f7f2e8';
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = Math.max(8, w * 0.03);
  ctx.shadowOffsetY = Math.max(4, w * 0.012);
  ctx.fillRect(x - pad, y - pad, w + pad * 2, h + pad + foot);
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = '#12081d';
  ctx.lineWidth = Math.max(2, Math.round(Math.min(w, h) * 0.012));
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

function drawBandFrame(ctx, x, y, w, h, grade) {
  ctx.save();
  ctx.strokeStyle = grade.band;
  ctx.lineWidth = Math.max(4, Math.round(h * 0.10));
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

/** Pixel rectangles for every slot, plus the title block, for hit-testing. */
export function slotsFor(state, W, H) {
  const layout = layoutById(state.layout);
  const built = layout.build(W, H);
  return {
    slots: built.slots.map((s) => ({
      ...s,
      px: s.x * W, py: s.y * H, pw: s.w * W, ph: s.h * H,
    })),
    title: {
      x: built.title.x * W, y: built.title.y * H,
      w: built.title.w * W, h: built.title.h * H,
      align: built.title.align, overPhoto: !!built.title.overPhoto,
    },
  };
}

export function hitSlot(slots, x, y) {
  for (let i = slots.length - 1; i >= 0; i--) {
    const s = slots[i];
    const cx = s.px + s.pw / 2;
    const cy = s.py + s.ph / 2;
    const rad = (-(s.tilt || 0) * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const dx = x - cx;
    const dy = y - cy;
    const lx = dx * cos - dy * sin;
    const ly = dx * sin + dy * cos;
    if (Math.abs(lx) <= s.pw / 2 && Math.abs(ly) <= s.ph / 2) return s;
  }
  return null;
}

function drawHalftone(ctx, x, y, w, h, color, seed) {
  const rnd = mulberry32(seed);
  const gap = Math.max(7, Math.round(Math.min(w, h) * 0.045));
  ctx.save();
  ctx.fillStyle = color;
  for (let row = 0; row * gap < h; row++) {
    for (let col = 0; col * gap < w; col++) {
      const fade = 0.25 + 0.75 * (1 - row * gap / h);
      const r = gap * 0.22 * fade * (0.7 + rnd() * 0.6);
      ctx.beginPath();
      ctx.arc(x + col * gap + gap / 2, y + row * gap + gap / 2, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawTitleBlock(ctx, W, H, state, grade, title, seed) {
  const { x, y, w, h, align, overPhoto } = title;
  const family = '"Coast Condensed", "Arial Narrow", sans-serif';
  if (overPhoto) {
    const shade = ctx.createLinearGradient(0, y - h * 0.35, 0, y + h);
    shade.addColorStop(0, 'rgba(0,0,0,0)');
    shade.addColorStop(1, 'rgba(0,0,0,0.72)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, y - h * 0.35, W, h * 1.35);
  } else if (state.halftone) {
    ctx.fillStyle = grade.band;
    ctx.fillRect(0, y, W, h);
    drawHalftone(ctx, x, y + h * 0.62, w, h * 0.34, 'rgba(255,255,255,0.16)', seed);
  } else {
    ctx.fillStyle = grade.band;
    ctx.fillRect(0, y, W, h);
  }
  const text = (state.title || '').trim().toUpperCase();
  const sub = (state.subtitle || '').trim();
  const cx = align === 'center' ? x + w / 2 : x;
  ctx.save();
  ctx.textAlign = align === 'center' ? 'center' : 'left';
  ctx.textBaseline = 'alphabetic';
  if (text) {
    const size = fitFont(ctx, text, w, h * 0.52, family);
    ctx.font = `900 ${size}px ${family}`;
    try { ctx.letterSpacing = `${Math.round(size * 0.02)}px`; } catch { /* older canvas */ }
    ctx.lineWidth = Math.max(2, size * 0.09);
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.strokeText(text, cx, y + h * 0.48);
    ctx.fillStyle = state.titleColor || grade.title;
    ctx.fillText(text, cx, y + h * 0.48);
    try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
  }
  if (sub) {
    const subSize = Math.max(12, h * 0.17);
    ctx.font = `italic 900 ${subSize}px ${family}`;
    ctx.shadowColor = '#ff2e88';
    ctx.shadowBlur = subSize * 0.7;
    ctx.fillStyle = '#ffd7ef';
    ctx.fillText(sub, cx, y + h * 0.82);
    ctx.shadowBlur = 0;
  }
  ctx.restore();
}

function drawBadge(ctx, W, H, state) {
  if (!state.badge) return;
  const stars = Math.max(1, Math.min(5, state.stars || 4));
  const family = '"Coast Condensed", "Arial Narrow", sans-serif';
  const pad = Math.round(W * 0.012);
  const starSize = Math.round(W * 0.026);
  const label = 'NEON COAST';
  ctx.save();
  ctx.font = `900 ${starSize}px ${family}`;
  const labelW = ctx.measureText(label).width;
  const rowW = labelW + pad * 2 + (starSize + 4) * 5;
  const rowH = starSize + pad * 1.6;
  const bx = W - rowW - pad;
  const by = pad;
  ctx.fillStyle = 'rgba(10, 6, 18, 0.85)';
  ctx.beginPath();
  ctx.roundRect(bx, by, rowW, rowH, rowH / 2);
  ctx.fill();
  ctx.strokeStyle = '#ffc93d';
  ctx.lineWidth = Math.max(1, W * 0.002);
  ctx.stroke();
  ctx.fillStyle = '#ffc93d';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < 5; i++) {
    const sx = bx + pad + i * (starSize + 4) + starSize / 2;
    ctx.globalAlpha = i < stars ? 1 : 0.28;
    ctx.fillText('★', sx, by + rowH / 2 + 1);
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.fillText(label, bx + pad + (starSize + 4) * 5, by + rowH / 2 + 1);
  ctx.restore();
}

function drawGrain(ctx, W, H, seed) {
  const rnd = mulberry32(seed);
  const count = Math.floor((W * H) / 2600);
  ctx.save();
  for (let i = 0; i < count; i++) {
    const v = rnd();
    ctx.fillStyle = v > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    ctx.fillRect(rnd() * W, rnd() * H, 1.4, 1.4);
  }
  ctx.restore();
}

function drawVignette(ctx, W, H) {
  const g = ctx.createRadialGradient(
    W / 2, H / 2, Math.min(W, H) * 0.42,
    W / 2, H / 2, Math.max(W, H) * 0.75,
  );
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.34)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

/**
 * Draws the whole cover. `photos` is an array of loaded <img> elements
 * (state.photos[i] maps to photos[i]). `opts.select` draws a gold outline
 * around one slot for the editor preview; exports pass nothing.
 */
export function drawCover(canvas, state, photos, opts = {}) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const grade = gradeById(state.grade);
  const { slots, title } = slotsFor(state, W, H);

  drawSky(ctx, W, H, grade);

  for (const s of slots) {
    const crop = cropFor(state, s.id, s.photo);
    const photo = photos[crop.photo] ?? photos[0] ?? null;
    const cx = s.px + s.pw / 2;
    const cy = s.py + s.ph / 2;
    ctx.save();
    ctx.translate(cx, cy);
    if (s.shear) ctx.transform(1, 0, s.shear, 1, 0, 0);
    if (s.tilt) ctx.rotate((s.tilt * Math.PI) / 180);
    ctx.translate(-s.pw / 2, -s.ph / 2);
    if (s.frame === 'snap') {
      drawSnapFrame(ctx, 0, 0, s.pw, s.ph);
    }
    ctx.beginPath();
    ctx.rect(0, 0, s.pw, s.ph);
    ctx.clip();
    if (photo) drawPhotoInto(ctx, photo, 0, 0, s.pw, s.ph, crop, grade);
    else {
      ctx.fillStyle = '#241a33';
      ctx.fillRect(0, 0, s.pw, s.ph);
    }
    if (s.frame === 'band') drawBandFrame(ctx, 0, 0, s.pw, s.ph, grade);
    ctx.restore();
    if (s.frame === 'ink') drawInkFrame(ctx, s.px, s.py, s.pw, s.ph, grade);
    if (opts.select === s.id) {
      ctx.save();
      ctx.strokeStyle = '#ffc93d';
      ctx.lineWidth = Math.max(3, W * 0.004);
      ctx.setLineDash([W * 0.012, W * 0.008]);
      ctx.strokeRect(s.px, s.py, s.pw, s.ph);
      ctx.restore();
    }
  }

  drawTitleBlock(ctx, W, H, state, grade, title, 20261119);
  drawBadge(ctx, W, H, state);
  if (state.grain) drawGrain(ctx, W, H, 90210);
  if (state.vignette) drawVignette(ctx, W, H);
}
