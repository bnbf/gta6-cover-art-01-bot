// Panel layouts for the cover. Every layout is a function of the cover size
// returning slots in normalised coordinates (0..1 of the cover) plus the
// title block. A slot may tilt (degrees, around its centre) or shear
// (x-shift per unit of y, for diagonal bands), and names the photo index it
// shows by default. The renderer inks each panel as poster art: a thick
// black band around it and a thin white rule inside.

function slot(id, x, y, w, h, extra = {}) {
  return { id, x, y, w, h, tilt: 0, shear: 0, photo: 0, frame: 'ink', ...extra };
}

function bandedTitle(y, h, align = 'center') {
  return { x: 0.03, y, w: 0.94, h, align };
}

export const LAYOUTS = [
  {
    id: 'nine',
    name: 'Nine-Panel Grid',
    blurb: 'Hero + eight, the classic cover',
    build(W, H) {
      const g = 0.014; // gap between panels
      const top = 0.78; // panels end here; title band below
      const cw = (1 - g * 4) / 3;
      const ch = (top - g * 4) / 3;
      const at = (c, r) => ({ x: g + c * (cw + g), y: g + r * (ch + g) });
      const p = (c, r) => ({ ...at(c, r), w: cw, h: ch });
      const hero = { ...at(0, 0), w: cw * 2 + g, h: ch * 2 + g };
      return {
        slots: [
          slot('hero', hero.x, hero.y, hero.w, hero.h, { photo: 0 }),
          slot('a', ...Object.values(p(2, 0)), { photo: 1 }),
          slot('b', ...Object.values(p(2, 1)), { photo: 0 }),
          slot('c', ...Object.values(p(0, 2)), { photo: 1 }),
          slot('d', ...Object.values(p(1, 2)), { photo: 0 }),
          slot('e', ...Object.values(p(2, 2)), { photo: 1 }),
        ],
        title: bandedTitle(0.80, 0.17),
      };
    },
  },
  {
    id: 'hero3',
    name: 'Hero + Three',
    blurb: 'One big moment, three beats',
    build(W, H) {
      const g = 0.014;
      const top = 0.78;
      const heroW = 0.60;
      const sideX = heroW + g;
      const sideW = 1 - sideX - g;
      const sh = (top - g * 4) / 3;
      return {
        slots: [
          slot('hero', g, g, heroW, top - g * 2, { photo: 0 }),
          slot('a', sideX, g, sideW, sh, { photo: 1 }),
          slot('b', sideX, g * 2 + sh, sideW, sh, { photo: 0 }),
          slot('c', sideX, g * 3 + sh * 2, sideW, sh, { photo: 1 }),
        ],
        title: bandedTitle(0.80, 0.17),
      };
    },
  },
  {
    id: 'bleed',
    name: 'Full Bleed',
    blurb: 'One photo, edge to edge',
    build(W, H) {
      return {
        slots: [slot('hero', 0, 0, 1, 1, { photo: 0, frame: 'none' })],
        title: { x: 0.03, y: 0.70, w: 0.94, h: 0.26, align: 'center', overPhoto: true },
      };
    },
  },
  {
    id: 'tilt',
    name: 'Tilted Snapshots',
    blurb: 'Polaroids tossed on the sunset',
    build(W, H) {
      return {
        slots: [
          slot('a', 0.06, 0.16, 0.44, 0.52, { photo: 0, frame: 'snap', tilt: -6 }),
          slot('b', 0.50, 0.10, 0.42, 0.48, { photo: 1, frame: 'snap', tilt: 4 }),
          slot('c', 0.30, 0.55, 0.44, 0.40, { photo: 0, frame: 'snap', tilt: -2 }),
        ],
        title: { x: 0.03, y: 0.015, w: 0.94, h: 0.10, align: 'center' },
      };
    },
  },
  {
    id: 'bands',
    name: 'Diagonal Bands',
    blurb: 'Three slices of the same night',
    build(W, H) {
      const g = 0.016;
      const top = 0.78;
      const bh = (top - g * 4) / 3;
      const shear = 0.10;
      return {
        slots: [
          slot('a', -0.05, g, 1.10, bh, { photo: 0, shear, frame: 'band' }),
          slot('b', -0.05, g * 2 + bh, 1.10, bh, { photo: 1, shear, frame: 'band' }),
          slot('c', -0.05, g * 3 + bh * 2, 1.10, bh, { photo: 0, shear, frame: 'band' }),
        ],
        title: bandedTitle(0.80, 0.17),
      };
    },
  },
  {
    id: 'duo',
    name: 'Split Duo',
    blurb: 'Two leads, one night',
    build(W, H) {
      const g = 0.014;
      const top = 0.78;
      return {
        slots: [
          slot('a', g, g, 0.48 - g, top - g * 2, { photo: 0 }),
          slot('b', 0.50, g, 0.48 - g, top - g * 2, { photo: 1 }),
          slot('c', 0.33, 0.52, 0.34, 0.30, { photo: 0, frame: 'snap', tilt: 3 }),
        ],
        title: bandedTitle(0.80, 0.17),
      };
    },
  },
  {
    id: 'stage',
    name: 'Centre Stage',
    blurb: 'Lead in the middle, city at the sides',
    build(W, H) {
      const g = 0.014;
      const top = 0.78;
      return {
        slots: [
          slot('left', g, g, 0.24, top - g * 2, { photo: 1 }),
          slot('hero', 0.27, g, 0.46, top - g * 2, { photo: 0 }),
          slot('right', 0.745, g, 0.24, top - g * 2, { photo: 1 }),
        ],
        title: bandedTitle(0.80, 0.17),
      };
    },
  },
];

export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0];
}
