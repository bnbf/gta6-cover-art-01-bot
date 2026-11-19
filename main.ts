// Neon Coast Cover Studio — the entry program (Node 22, standard library
// only). It hands the app in: copies app/ and screenshots/ from beside this
// file into /output and writes /output/dossier.json, the summary the judge
// reads, with the vendored make.fun library. Run it twice and both runs
// must write the same bytes.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Start from an empty output directory so a stale file can never leak in.
rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });

const appSource = join(repoRoot, 'app');
cpSync(appSource, join(outputDir, 'app'), { recursive: true });

const shotsSource = join(repoRoot, 'screenshots');
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(shotsSource)) {
  cpSync(shotsSource, join(outputDir, 'screenshots'), { recursive: true });
}

// The scorer's own caps (reference/gate.json): text_max_bytes is the only
// one that shapes bytes; the rest refuse an entry the scorer would refuse
// (more than 4 screenshots or one over 256 KiB; app/ over 993 files or
// 48 MiB in all, or a path under app/ over 1000 bytes; app/ shares
// /output's own 1000-entry cap with screenshots/ and dossier.json).
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
