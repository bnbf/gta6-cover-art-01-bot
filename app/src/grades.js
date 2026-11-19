// Colour grades for the cover: each one sets the sky, the sun, the photo
// treatment (a CSS filter plus warm/cool tint washes) and the title ink.
// The photo itself is never re-encoded: the grade is drawn live, so an
// export at any size keeps the same look.

export const GRADES = [
  {
    id: 'sunset',
    name: 'Vice Sunset',
    sky: ['#2b1055', '#c62b7e', '#ff7a3d', '#ffc93d'],
    sun: '#ffe9a8',
    sunGlow: 'rgba(255, 150, 60, 0.55)',
    photoFilter: 'saturate(1.25) contrast(1.08) brightness(1.02)',
    washTop: 'rgba(255, 122, 61, 0.10)',
    washBottom: 'rgba(198, 43, 126, 0.28)',
    band: '#12081d',
    title: '#ffffff',
  },
  {
    id: 'neon',
    name: 'Neon Night',
    sky: ['#050510', '#1b0f3e', '#7a1e6e', '#ff2e88'],
    sun: '#ff9de2',
    sunGlow: 'rgba(255, 46, 136, 0.5)',
    photoFilter: 'saturate(1.35) contrast(1.14) brightness(0.96)',
    washTop: 'rgba(34, 230, 200, 0.12)',
    washBottom: 'rgba(255, 46, 136, 0.30)',
    band: '#05050f',
    title: '#ffffff',
  },
  {
    id: 'gold',
    name: 'Gold Hour',
    sky: ['#3d1c05', '#a34d12', '#e8852a', '#ffd76a'],
    sun: '#fff3c4',
    sunGlow: 'rgba(255, 190, 80, 0.6)',
    photoFilter: 'saturate(1.3) contrast(1.05) brightness(1.05) sepia(0.18)',
    washTop: 'rgba(255, 200, 90, 0.12)',
    washBottom: 'rgba(160, 70, 10, 0.25)',
    band: '#1d0e04',
    title: '#fff8e6',
  },
  {
    id: 'teal',
    name: 'Teal Heat',
    sky: ['#04222b', '#0a5a63', '#12a08a', '#22e6c8'],
    sun: '#d8fff4',
    sunGlow: 'rgba(34, 230, 200, 0.45)',
    photoFilter: 'saturate(1.2) contrast(1.12) brightness(1.0) hue-rotate(-8deg)',
    washTop: 'rgba(34, 230, 200, 0.14)',
    washBottom: 'rgba(6, 40, 48, 0.32)',
    band: '#03161c',
    title: '#ffffff',
  },
  {
    id: 'ink',
    name: 'Mono Ink',
    sky: ['#111111', '#3a3a3a', '#777777', '#d9d9d9'],
    sun: '#ffffff',
    sunGlow: 'rgba(255, 255, 255, 0.35)',
    photoFilter: 'grayscale(1) contrast(1.35) brightness(1.04)',
    washTop: 'rgba(255, 255, 255, 0.06)',
    washBottom: 'rgba(0, 0, 0, 0.30)',
    band: '#0a0a0a',
    title: '#ffffff',
  },
  {
    id: 'true',
    name: 'True Colour',
    sky: ['#1c2a4a', '#3d6a8e', '#e8852a', '#ffd76a'],
    sun: '#fff3c4',
    sunGlow: 'rgba(255, 200, 100, 0.4)',
    photoFilter: 'saturate(1.05) contrast(1.02)',
    washTop: 'rgba(255, 255, 255, 0.02)',
    washBottom: 'rgba(0, 0, 0, 0.12)',
    band: '#101623',
    title: '#ffffff',
  },
];

export function gradeById(id) {
  return GRADES.find((g) => g.id === id) ?? GRADES[0];
}
