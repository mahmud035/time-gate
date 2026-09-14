import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { connect, wait } from './cdp.mjs';
import { launchChrome } from './chrome.mjs';
import { captureAll, createCapturer } from './capture.mjs';
import { buildManagerGuide } from './document.mjs';
import { buildStaffGuide } from './staff-document.mjs';
import { DEMO_CODE, MANAGER, seedDemo } from './seed-demo.mjs';

/**
 * Rebuilds both PDF guides — the manager's and the staff one — from the
 * running app.
 *
 *   npm run guide
 *
 * Needs the app running locally (npm run build, then start the server) and
 * Chrome installed. Everything else — the browser profile, the screenshots, the
 * intermediate HTML — is temporary and cleaned up.
 */
const ROOT = resolve(import.meta.dirname, '../..');
const APP = process.env.GUIDE_APP_URL ?? 'http://127.0.0.1:5000';
const OUT_DIR = process.env.GUIDE_OUT_DIR ?? join(ROOT, 'docs');
const WORK = join(ROOT, 'node_modules/.cache/timegate-guide');
const FONT = join(ROOT, 'client/dist/assets');

const die = (message) => {
  console.error(`\n  ${message}\n`);
  process.exit(1);
};

const assertAppIsUp = async () => {
  try {
    const health = await (await fetch(`${APP}/api/health`)).json();

    if (!health.success) throw new Error('unhealthy');
  } catch {
    die(
      `TimeGate is not answering at ${APP}.\n` +
        `  Start it first:  npm run build && (cd server && npm start)\n` +
        `  Or point elsewhere with GUIDE_APP_URL.`,
    );
  }
};

const findInterFont = () => {
  const file = readdirSync(FONT).find((name) => name.startsWith('inter-latin-wght-normal'));

  if (!file) die(`no Inter font in ${FONT} — run "npm run build" first`);

  return join(FONT, file);
};

const main = async () => {
  await assertAppIsUp();

  rmSync(WORK, { recursive: true, force: true });
  mkdirSync(WORK, { recursive: true });

  console.log('\nSeeding demo data (invented people — never real staff)');
  const { database, slug } = await seedDemo({ serverRoot: join(ROOT, 'server') });
  console.log(`  database: ${database}`);

  console.log('\nLaunching headless Chrome');
  const chrome = await launchChrome();
  let page;

  try {
    page = await connect(9222);
    await page.send('Page.enable');
    await page.send('Runtime.enable');

    console.log('\nCapturing screenshots');
    const capture = createCapturer({ page, baseUrl: APP, outDir: WORK });
    await captureAll(capture, {
      slug,
      code: DEMO_CODE,
      email: MANAGER.email,
      password: MANAGER.password,
    });

    const asBase64 = (path) => readFileSync(path).toString('base64');
    const assets = {
      img: (name) => `data:image/png;base64,${asBase64(join(WORK, name))}`,
      font: `data:font/woff2;base64,${asBase64(findInterFont())}`,
      icon: readFileSync(join(ROOT, 'client/public/favicon.svg'), 'utf8'),
    };

    const guides = [
      { name: 'TimeGate-Guide.pdf', label: 'manager', html: buildManagerGuide(assets), footer: 'TimeGate — a guide for managers' },
      { name: 'TimeGate-Staff-Guide.pdf', label: 'staff', html: buildStaffGuide(assets), footer: 'TimeGate — clocking in and out' },
    ];

    mkdirSync(OUT_DIR, { recursive: true });

    for (const guide of guides) {
      console.log(`\nPrinting the ${guide.label} guide`);

      const htmlPath = join(WORK, `${guide.label}.html`);
      writeFileSync(htmlPath, guide.html);

      await page.send('Emulation.setDeviceMetricsOverride', {
        width: 1200,
        height: 1600,
        deviceScaleFactor: 1,
        mobile: false,
      });
      await page.send('Page.navigate', { url: `file://${htmlPath}` });
      await wait(3500);
      // Paginating before the webfont resolves shifts every line on every page.
      await page.evaluate('await document.fonts.ready; return true;');
      await wait(800);

      const { data } = await page.send('Page.printToPDF', {
        printBackground: true,
        paperWidth: 8.27,
        paperHeight: 11.69,
        marginTop: 0.71,
        marginBottom: 0.79,
        marginLeft: 0.67,
        marginRight: 0.67,
        displayHeaderFooter: true,
        headerTemplate: '<div></div>',
        footerTemplate:
          '<div style="width:100%;font-family:Helvetica,Arial,sans-serif;font-size:7.5pt;' +
          'color:#8b95a1;padding:0 17mm;display:flex;justify-content:space-between;">' +
          `<span>${guide.footer}</span><span class="pageNumber"></span></div>`,
      });

      const target = join(OUT_DIR, guide.name);
      writeFileSync(target, Buffer.from(data, 'base64'));
      console.log(`  ${target}  ${(Buffer.from(data, 'base64').length / 1024 / 1024).toFixed(2)} MB`);
    }

  } finally {
    page?.close();
    await chrome.stop();
    rmSync(WORK, { recursive: true, force: true });
  }
};

await main();
