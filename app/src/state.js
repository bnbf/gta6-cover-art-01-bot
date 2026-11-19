// The cover's state and its undo/redo history. A state is plain JSON apart
// from the photo images, which live beside it in `photos` by id; history
// stores serialised states so undo never mutates a photo.

export const SIZES = {
  '1080x1080': { w: 1080, h: 1080, label: 'Square' },
  '1080x1350': { w: 1080, h: 1350, label: 'Story' },
  '1920x1080': { w: 1920, h: 1080, label: 'Wide' },
};

export const TITLE_COLORS = ['#ffffff', '#ffc93d', '#ff2e88', '#22e6c8', '#12081d'];

export const PRESETS = [
  {
    name: 'Neon Shore',
    layout: 'nine', grade: 'sunset',
    title: 'NEON SHORE', subtitle: 'a Vice City story', stars: 4,
  },
  {
    name: 'Night Shift',
    layout: 'tilt', grade: 'neon',
    title: 'NIGHT SHIFT', subtitle: 'the city never sleeps', stars: 5,
  },
  {
    name: 'Pier Pressure',
    layout: 'hero3', grade: 'gold',
    title: 'PIER PRESSURE', subtitle: 'golden hour, no mercy', stars: 3,
  },
];

export function defaultState() {
  return {
    layout: 'nine',
    grade: 'sunset',
    title: 'Neon Shore',
    subtitle: 'a Vice City story',
    titleColor: '#ffffff',
    halftone: true,
    badge: true,
    grain: true,
    vignette: true,
    stars: 4,
    size: '1080x1080',
    crops: {}, // slotId -> { photo, zoom, ox, oy }
  };
}

export function serialise(state) {
  return JSON.stringify(state);
}

export function deserialise(json) {
  const base = defaultState();
  try {
    const parsed = JSON.parse(json);
    return { ...base, ...parsed, crops: { ...(parsed.crops ?? {}) } };
  } catch {
    return base;
  }
}

export function createHistory(initial) {
  return {
    past: [],
    future: [],
    current: serialise(initial),
    commit(next) {
      const json = serialise(next);
      if (json === this.current) return false;
      this.past.push(this.current);
      if (this.past.length > 60) this.past.shift();
      this.future.length = 0;
      this.current = json;
      return true;
    },
    undo() {
      if (!this.past.length) return null;
      this.future.push(this.current);
      this.current = this.past.pop();
      return deserialise(this.current);
    },
    redo() {
      if (!this.future.length) return null;
      this.past.push(this.current);
      this.current = this.future.pop();
      return deserialise(this.current);
    },
    canUndo() { return this.past.length > 0; },
    canRedo() { return this.future.length > 0; },
  };
}

/** Crop for a slot: which photo it shows and how it is framed. */
export function cropFor(state, slotId, fallbackPhoto) {
  const c = state.crops[slotId];
  if (c) return { photo: c.photo, zoom: c.zoom, ox: c.ox, oy: c.oy };
  return { photo: fallbackPhoto, zoom: 1, ox: 0, oy: 0 };
}
