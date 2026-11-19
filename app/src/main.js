// Wires the editor: photos, layouts, grades, caption, panel cropping,
// undo/redo and export. A `?shot=` query runs a fixed scene for a
// screenshot instead (see shots.js).

import { drawCover, slotsFor, hitSlot } from './cover.js';
import { LAYOUTS, layoutById } from './layouts.js';
import { GRADES, gradeById } from './grades.js';
import {
  SIZES, TITLE_COLORS, PRESETS,
  defaultState, createHistory, cropFor,
} from './state.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const WALLET = 'AoP4eSdGC9V2jioJANjN2jPsxL5DnHkWmNicRznF3x67';

let state = defaultState();
const history = createHistory(state);
const photos = []; // { id, name, img }
let photoSeq = 0;
let selectedSlot = null;
let drag = null;

const SAMPLES = [
  { name: 'boulevard', src: 'samples/boulevard.jpg' },
  { name: 'pier', src: 'samples/pier.jpg' },
];

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`cannot load ${src}`));
    img.src = src;
  });
}

async function loadSamples() {
  for (const s of SAMPLES) {
    if (photos.some((p) => p.name === s.name)) continue;
    const img = await loadImage(s.src);
    photos.push({ id: ++photoSeq, name: s.name, img });
  }
  renderThumbs();
}

function photoByIndex(i) {
  return photos[i] ?? null;
}

function images() {
  return photos.map((p) => p.img);
}

/** Re-draws the cover and refreshes every control that mirrors the state.
 *  `px` overrides the canvas pixel size (screenshot scenes draw at the
 *  shot's own size instead of the export size). */
function render(px) {
  const size = px ?? SIZES[state.size];
  if (canvas.width !== size.w || canvas.height !== size.h) {
    canvas.width = size.w;
    canvas.height = size.h;
  }
  drawCover(canvas, state, images(), { select: selectedSlot });
  // Size the preview element to fit the viewport; the exported PNG always
  // uses the full pixel size, so this never changes what is saved. In cover
  // mode the shot window IS the cover size, so show it 1:1 (headless
  // innerHeight runs smaller than the window and would letterbox it).
  const coverMode = document.body.classList.contains('shot-cover');
  const availW = canvas.parentElement.clientWidth || window.innerWidth;
  const availH = coverMode ? size.h : window.innerHeight - 170;
  const scale = Math.min(availW / size.w, availH / size.h, 1);
  canvas.style.width = `${Math.max(1, Math.round(size.w * scale))}px`;
  canvas.style.height = `${Math.max(1, Math.round(size.h * scale))}px`;
  $('stageTag').textContent = `${size.w} × ${size.h} · ${size.label}`;
  $('undoBtn').disabled = !history.canUndo();
  $('redoBtn').disabled = !history.canRedo();
  syncPanelControls();
}

function commit() {
  history.commit(state);
  render();
}

/** Builds the layout picker: one button per layout with a tiny SVG sketch. */
function buildLayoutChoices() {
  const host = $('layoutChoices');
  host.innerHTML = '';
  for (const layout of LAYOUTS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'choice' + (layout.id === state.layout ? ' on' : '');
    b.title = layout.blurb;
    b.innerHTML = `<span class="mini">${layoutSketch(layout.id)}</span>${layout.name}`;
    b.addEventListener('click', () => {
      if (state.layout === layout.id) return;
      state = { ...state, layout: layout.id };
      selectedSlot = null;
      document.querySelectorAll('#layoutChoices .choice').forEach((el) => el.classList.remove('on'));
      b.classList.add('on');
      commit();
    });
    host.appendChild(b);
  }
  const row = document.createElement('div');
  row.className = 'row';
  row.style.marginTop = '8px';
  for (const preset of PRESETS) {
    const p = document.createElement('button');
    p.type = 'button';
    p.textContent = preset.name;
    p.title = `Preset: ${preset.name}`;
    p.addEventListener('click', () => applyPreset(preset));
    row.appendChild(p);
  }
  host.parentElement.appendChild(row);
}

function layoutSketch(id) {
  const ink = '#f5eefb';
  const accent = '#ff2e88';
  const cells = {
    nine: `<rect x="2" y="2" width="20" height="20" fill="${ink}"/><rect x="24" y="2" width="9" height="9" fill="${accent}"/><rect x="35" y="2" width="9" height="9" fill="${ink}"/><rect x="24" y="13" width="9" height="9" fill="${ink}"/><rect x="35" y="13" width="9" height="9" fill="${accent}"/><rect x="2" y="24" width="9" height="9" fill="${accent}"/><rect x="13" y="24" width="9" height="9" fill="${ink}"/><rect x="24" y="24" width="20" height="9" fill="${ink}"/>`,
    hero3: `<rect x="2" y="2" width="24" height="31" fill="${ink}"/><rect x="28" y="2" width="16" height="9" fill="${accent}"/><rect x="28" y="13" width="16" height="9" fill="${ink}"/><rect x="28" y="24" width="16" height="9" fill="${accent}"/>`,
    bleed: `<rect x="2" y="2" width="42" height="31" fill="${ink}"/><rect x="2" y="26" width="42" height="7" fill="${accent}"/>`,
    tilt: `<rect x="6" y="4" width="16" height="14" fill="${ink}" transform="rotate(-6 14 11)"/><rect x="24" y="6" width="16" height="14" fill="${accent}" transform="rotate(5 32 13)"/><rect x="14" y="18" width="16" height="14" fill="${ink}" transform="rotate(-2 22 25)"/>`,
    bands: `<rect x="0" y="2" width="46" height="9" fill="${ink}" transform="skewX(-12)"/><rect x="0" y="13" width="46" height="9" fill="${accent}" transform="skewX(-12)"/><rect x="0" y="24" width="46" height="9" fill="${ink}" transform="skewX(-12)"/>`,
    duo: `<rect x="2" y="2" width="19" height="31" fill="${ink}"/><rect x="23" y="2" width="19" height="31" fill="${accent}"/><rect x="14" y="20" width="18" height="13" fill="#f7f2e8" transform="rotate(3 23 26)"/>`,
    stage: `<rect x="2" y="2" width="8" height="31" fill="${accent}"/><rect x="12" y="2" width="22" height="31" fill="${ink}"/><rect x="36" y="2" width="8" height="31" fill="${accent}"/>`,
  };
  return `<svg viewBox="0 0 46 35" aria-hidden="true">${cells[id] ?? ''}</svg>`;
}

/** Builds the grade picker: a gradient swatch per grade. */
function buildGradeChoices() {
  const host = $('gradeChoices');
  host.innerHTML = '';
  for (const grade of GRADES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'choice' + (grade.id === state.grade ? ' on' : '');
    const stops = grade.sky.map((c, i) => `${c} ${Math.round((i / (grade.sky.length - 1)) * 100)}%`).join(', ');
    b.innerHTML = `<span class="mini" style="background:linear-gradient(180deg, ${stops})"></span>${grade.name}`;
    b.addEventListener('click', () => {
      if (state.grade === grade.id) return;
      state = { ...state, grade: grade.id, titleColor: grade.title };
      document.querySelectorAll('#gradeChoices .choice').forEach((el) => el.classList.remove('on'));
      b.classList.add('on');
      syncCaption();
      commit();
    });
    host.appendChild(b);
  }
}

function buildTitleColors() {
  const host = $('titleColors');
  host.innerHTML = '';
  for (const color of TITLE_COLORS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch' + (color === state.titleColor ? ' on' : '');
    b.style.background = color;
    b.title = color;
    b.addEventListener('click', () => {
      state = { ...state, titleColor: color };
      document.querySelectorAll('#titleColors .swatch').forEach((el) => el.classList.remove('on'));
      b.classList.add('on');
      commit();
    });
    host.appendChild(b);
  }
}

function applyPreset(preset) {
  state = {
    ...state,
    layout: preset.layout,
    grade: preset.grade,
    title: preset.title,
    subtitle: preset.subtitle,
    stars: preset.stars,
    titleColor: gradeById(preset.grade).title,
  };
  selectedSlot = null;
  syncCaption();
  document.querySelectorAll('#layoutChoices .choice').forEach((el) => {
    el.classList.toggle('on', el.textContent.includes(layoutById(preset.layout).name));
  });
  document.querySelectorAll('#gradeChoices .choice').forEach((el) => {
    el.classList.toggle('on', el.textContent.includes(gradeById(preset.grade).name));
  });
  commit();
  setStatus(`Preset “${preset.name}” applied`);
}

function syncCaption() {
  $('titleInput').value = state.title;
  $('subtitleInput').value = state.subtitle;
  $('halftoneChk').checked = state.halftone;
  $('badgeChk').checked = state.badge;
  $('grainChk').checked = state.grain;
  $('vignetteChk').checked = state.vignette;
  $('starsInput').value = String(state.stars);
}

function setStatus(text) {
  $('status').textContent = text;
}

function renderThumbs() {
  const host = $('thumbs');
  host.innerHTML = '';
  photos.forEach((photo, i) => {
    const used = Object.values(state.crops).some((c) => c.photo === i)
      || slotsFor(state, canvas.width, canvas.height).slots.some((s) => cropFor(state, s.id, s.photo).photo === i);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'thumb' + (used ? ' used' : '');
    b.title = `${photo.name} — click to put in the selected panel`;
    const img = document.createElement('img');
    img.src = photo.img.src;
    img.alt = photo.name;
    b.appendChild(img);
    const x = document.createElement('span');
    x.className = 'x';
    x.textContent = '×';
    x.title = 'Remove photo';
    x.addEventListener('click', (e) => {
      e.stopPropagation();
      removePhoto(i);
    });
    b.appendChild(x);
    b.addEventListener('click', () => {
      if (!selectedSlot) { setStatus('Click a panel on the cover first, then a photo.'); return; }
      setCrop(selectedSlot, { photo: i });
      setStatus(`Panel now shows “${photo.name}”.`);
    });
    host.appendChild(b);
  });
  syncPanelPhotoOptions();
}

function removePhoto(i) {
  photos.splice(i, 1);
  for (const [slotId, c] of Object.entries(state.crops)) {
    if (c.photo === i) state.crops[slotId] = { ...c, photo: 0 };
    else if (c.photo > i) state.crops[slotId] = { ...c, photo: c.photo - 1 };
  }
  commit();
  renderThumbs();
}

function setCrop(slotId, patch) {
  const current = cropFor(state, slotId, 0);
  state = {
    ...state,
    crops: { ...state.crops, [slotId]: { ...current, ...patch } },
  };
  commit();
}

function syncPanelPhotoOptions() {
  const select = $('panelPhoto');
  const keep = select.value;
  select.innerHTML = '';
  photos.forEach((photo, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = `${i + 1} · ${photo.name}`;
    select.appendChild(opt);
  });
  if (keep !== '') select.value = keep;
}

function syncPanelControls() {
  const has = !!selectedSlot;
  $('panelHint').hidden = has;
  $('panelControls').hidden = !has;
  if (!has) return;
  const crop = cropFor(state, selectedSlot, 0);
  $('panelPhoto').value = String(crop.photo);
  $('zoomInput').value = String(crop.zoom);
  $('panXInput').value = String(crop.ox);
  $('panYInput').value = String(crop.oy);
  $('zoomVal').textContent = `${crop.zoom.toFixed(2)}×`;
}

function selectSlot(slotId) {
  selectedSlot = slotId;
  render();
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function bindCanvas() {
  canvas.addEventListener('pointerdown', (event) => {
    const p = canvasPoint(event);
    const { slots } = slotsFor(state, canvas.width, canvas.height);
    const hit = hitSlot(slots, p.x, p.y);
    if (!hit) { selectedSlot = null; render(); return; }
    selectedSlot = hit.id;
    const crop = cropFor(state, hit.id, hit.photo);
    drag = { x: p.x, y: p.y, ox: crop.ox, oy: crop.oy, moved: false };
    canvas.setPointerCapture(event.pointerId);
    render();
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drag || !selectedSlot) return;
    const p = canvasPoint(event);
    const { slots } = slotsFor(state, canvas.width, canvas.height);
    const slot = slots.find((s) => s.id === selectedSlot);
    if (!slot) return;
    const dx = (p.x - drag.x) / slot.pw;
    const dy = (p.y - drag.y) / slot.ph;
    if (Math.abs(dx) > 0.004 || Math.abs(dy) > 0.004) drag.moved = true;
    if (!drag.moved) return;
    const crop = cropFor(state, selectedSlot, 0);
    state = {
      ...state,
      crops: {
        ...state.crops,
        [selectedSlot]: {
          ...crop,
          ox: Math.max(-0.5, Math.min(0.5, drag.ox + dx)),
          oy: Math.max(-0.5, Math.min(0.5, drag.oy + dy)),
        },
      },
    };
    render();
  });
  canvas.addEventListener('pointerup', () => {
    if (drag?.moved) commit();
    drag = null;
  });
  canvas.addEventListener('wheel', (event) => {
    if (!selectedSlot) return;
    event.preventDefault();
    const crop = cropFor(state, selectedSlot, 0);
    const next = Math.max(1, Math.min(3, crop.zoom * (event.deltaY < 0 ? 1.08 : 0.93)));
    setCrop(selectedSlot, { zoom: next });
  }, { passive: false });
}

function exportCover(sizeKey, silent) {
  const size = SIZES[sizeKey];
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  const keep = state.size;
  drawCover(off, { ...state, size: sizeKey }, images());
  state.size = keep;
  return new Promise((resolve) => {
    off.toBlob((blob) => {
      if (!blob) { resolve(null); return; }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `neon-coast-${size.w}x${size.h}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      if (!silent) setStatus(`Saved neon-coast-${size.w}x${size.h}.png`);
      resolve(blob);
    }, 'image/png');
  });
}

function bindControls() {
  $('photoInput').addEventListener('change', async (event) => {
    const files = [...event.target.files].slice(0, 4 - photos.length);
    for (const file of files) {
      const src = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
      const img = await loadImage(src);
      photos.push({ id: ++photoSeq, name: file.name.replace(/\.[^.]+$/, ''), img });
    }
    event.target.value = '';
    commit();
    renderThumbs();
    setStatus(`${photos.length} photo${photos.length === 1 ? '' : 's'} loaded.`);
  });
  $('sampleBtn').addEventListener('click', async () => {
    await loadSamples();
    commit();
    setStatus('Sample photos loaded.');
  });
  $('clearPhotosBtn').addEventListener('click', () => {
    photos.length = 0;
    state = { ...state, crops: {} };
    commit();
    renderThumbs();
  });
  $('titleInput').addEventListener('input', (e) => { state = { ...state, title: e.target.value }; render(); });
  $('titleInput').addEventListener('change', () => commit());
  $('subtitleInput').addEventListener('input', (e) => { state = { ...state, subtitle: e.target.value }; render(); });
  $('subtitleInput').addEventListener('change', () => commit());
  $('halftoneChk').addEventListener('change', (e) => { state = { ...state, halftone: e.target.checked }; commit(); });
  $('badgeChk').addEventListener('change', (e) => { state = { ...state, badge: e.target.checked }; commit(); });
  $('grainChk').addEventListener('change', (e) => { state = { ...state, grain: e.target.checked }; commit(); });
  $('vignetteChk').addEventListener('change', (e) => { state = { ...state, vignette: e.target.checked }; commit(); });
  $('starsInput').addEventListener('input', (e) => { state = { ...state, stars: Number(e.target.value) }; render(); });
  $('starsInput').addEventListener('change', () => commit());
  $('sizeSelect').addEventListener('change', (e) => {
    state = { ...state, size: e.target.value };
    commit();
  });
  $('panelPhoto').addEventListener('change', (e) => {
    if (selectedSlot) setCrop(selectedSlot, { photo: Number(e.target.value) });
  });
  $('zoomInput').addEventListener('input', (e) => {
    if (selectedSlot) setCrop(selectedSlot, { zoom: Number(e.target.value) });
  });
  $('panXInput').addEventListener('input', (e) => {
    if (selectedSlot) setCrop(selectedSlot, { ox: Number(e.target.value) });
  });
  $('panYInput').addEventListener('input', (e) => {
    if (selectedSlot) setCrop(selectedSlot, { oy: Number(e.target.value) });
  });
  $('fitBtn').addEventListener('click', () => {
    if (selectedSlot) setCrop(selectedSlot, { zoom: 1, ox: 0, oy: 0 });
  });
  $('fillBtn').addEventListener('click', () => {
    if (selectedSlot) setCrop(selectedSlot, { zoom: 1.6, ox: 0, oy: 0 });
  });
  $('exportBtn').addEventListener('click', () => exportCover(state.size));
  $('exportAllBtn').addEventListener('click', async () => {
    for (const key of Object.keys(SIZES)) await exportCover(key, true);
    setStatus('Saved all three sizes.');
  });
  $('undoBtn').addEventListener('click', doUndo);
  $('redoBtn').addEventListener('click', doRedo);
  $('shuffleBtn').addEventListener('click', () => {
    const layout = LAYOUTS[Math.floor(Math.random() * LAYOUTS.length)];
    const grade = GRADES[Math.floor(Math.random() * GRADES.length)];
    const preset = PRESETS[Math.floor(Math.random() * PRESETS.length)];
    state = {
      ...state, layout: layout.id, grade: grade.id,
      title: preset.title, subtitle: preset.subtitle,
      titleColor: grade.title,
    };
    selectedSlot = null;
    syncCaption();
    buildLayoutChoices();
    buildGradeChoices();
    buildTitleColors();
    commit();
    setStatus(`Shuffled: ${layout.name} · ${grade.name} · “${preset.title}”`);
  });
  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      if (event.shiftKey) doRedo();
      else doUndo();
    }
  });
}

function doUndo() {
  const prev = history.undo();
  if (!prev) return;
  state = prev;
  selectedSlot = null;
  syncCaption();
  buildLayoutChoices();
  buildGradeChoices();
  buildTitleColors();
  render();
}

function doRedo() {
  const next = history.redo();
  if (!next) return;
  state = next;
  selectedSlot = null;
  syncCaption();
  buildLayoutChoices();
  buildGradeChoices();
  buildTitleColors();
  render();
}

async function init() {
  // Fonts first: the cover's lettering must use the vendored faces.
  try {
    await Promise.all([
      document.fonts.load('900 100px "Coast Condensed"'),
      document.fonts.load('italic 900 100px "Coast Condensed"'),
      document.fonts.load('700 100px "Coast Bold"'),
    ]);
  } catch { /* system fallback still draws */ }
  const shot = new URLSearchParams(location.search).get('shot');
  buildLayoutChoices();
  buildGradeChoices();
  buildTitleColors();
  bindControls();
  bindCanvas();
  syncCaption();
  await loadSamples();
  if (shot) {
    await runShot(shot, new URLSearchParams(location.search), {
      canvas, loadSamples, photos, images,
      getState: () => state,
      setState: (next) => { state = next; },
      render,
    });
    return;
  }
  render();
}

init();
