/**
 * Rasterise les 4 templates HTML en PNG avec transparence propre (omitBackground).
 * Utilise Playwright (chromium bundled) — plus fiable que Chrome Headless natif
 * qui casse le --default-background-color=00000000 sous Windows.
 *
 * Usage :  cd docs/festi-grill-26/cadres-photos && npm install && npm run install-browser && npm run build
 * Sortie : festi-grill-{tv,landscape,square,story}.png dans le même dossier
 */
import { chromium } from 'playwright'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// Sortie directe dans le dossier lu par BalPhotoComposer (source unique, pas de copie).
const OUT_DIR = path.resolve(__dirname, '../../../backend/resources/frames')

const FORMATS = [
  { name: 'tv',        w: 1920, h: 1080 },
  { name: 'landscape', w: 1350, h: 900 },
  { name: 'square',    w: 1080, h: 1080 },
  { name: 'story',     w: 1080, h: 1920 },
]

const browser = await chromium.launch()
try {
  for (const f of FORMATS) {
    const html = path.join(__dirname, `festi-grill-${f.name}.html`)
    const url  = pathToFileURL(html).toString()
    const png  = path.join(OUT_DIR, `festi-grill-${f.name}.png`)

    const ctx = await browser.newContext({
      viewport: { width: f.w, height: f.h },
      deviceScaleFactor: 1,
    })
    const page = await ctx.newPage()
    await page.goto(url, { waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)
    // Attend que le script de mise en page du texte vertical ait terminé
    await page.waitForSelector('body[data-ready="1"]', { timeout: 10000 })
    await page.screenshot({
      path: png,
      type: 'png',
      omitBackground: true, // ✅ transparence garantie
      clip: { x: 0, y: 0, width: f.w, height: f.h },
    })
    await ctx.close()
    console.log(`✓ ${path.basename(png)} (${f.w}×${f.h})`)
  }
} finally {
  await browser.close()
}
console.log(`\nPNG écrits dans ${OUT_DIR}`)
