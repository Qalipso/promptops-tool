/**
 * Capture product screenshots for the README.
 * Prereq: `pnpm start:local` running (API :3013 + web :3014) with seed data.
 * Run:    node scripts/capture-screens.mjs
 * Output: docs/screenshots/*.png
 */
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'docs', 'screenshots');
mkdirSync(OUT, { recursive: true });

const BASE = process.env.WEB_URL ?? 'http://localhost:3014';
const ASSET = process.env.DEMO_ASSET ?? 'demo.email.subject-line-gen';

const shots = [
  { name: 'dashboard', path: '/' },
  { name: 'asset-detail', path: `/assets/${ASSET}` },
  { name: 'builder-brief', path: `/builder/${ASSET}`, step: 'Business Brief' },
  { name: 'builder-preview', path: `/builder/${ASSET}`, step: 'Prompt Preview' },
  { name: 'builder-release', path: `/builder/${ASSET}`, step: 'Release' },
];

async function setTheme(page, theme) {
  await page.addInitScript((t) => localStorage.setItem('promptops-theme', t), theme);
}

async function run() {
  const browser = await chromium.launch();
  for (const theme of ['dark', 'light']) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await setTheme(page, theme);
    for (const s of shots) {
      await page.goto(`${BASE}${s.path}`, { waitUntil: 'networkidle' });
      if (s.step) {
        const btn = page.getByRole('button', { name: new RegExp(`${s.step}$`) });
        if (await btn.count()) {
          await btn.first().click();
          await page.waitForTimeout(600);
        }
      }
      await page.waitForTimeout(300);
      const file = join(OUT, `${s.name}-${theme}.png`);
      await page.screenshot({ path: file, fullPage: false });
      console.log('saved', file);
    }
    await ctx.close();
  }
  await browser.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
