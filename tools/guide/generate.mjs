import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { connect, wait } from './cdp.mjs';
import { launchChrome } from './chrome.mjs';
import { captureAll, createCapturer } from './capture.mjs';
import { buildDocument } from './document.mjs';
import { MANAGER, seedDemo } from './seed-demo.mjs';

/**
 * Rebuilds docs/TimeGate-Guide.pdf from the running app.
 *
 *   npm run guide
 *
 * Needs the app running locally (npm run build, then start the server) and
 * Chrome installed. Everything else — the browser profile, the screenshots, the
 * intermediate HTML — is temporary and cleaned up.
 */
const ROOT = resolve(import.meta.dirname, '../..');
const APP = process.env.GUIDE_APP_URL ?? 'http://127.0.0.1:5000';
const OUT = process.env.GUIDE_OUT ?? join(ROOT, 'docs/TimeGate-Guide.pdf');
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
    await captureAll(capture, { slug, email: MANAGER.email, password: MANAGER.password });

    console.log('\nBuilding the document');
    const asBase64 = (path) => readFileSync(path).toString('base64');
    const html = buildDocument({
      img: (name) => `data:image/png;base64,${asBase64(join(WORK, name))}`,
      font: `data:font/woff2;base64,${asBase64(findInterFont())}`,
      icon: readFileSync(join(ROOT, 'client/public/favicon.svg'), 'utf8'),
    });
    const htmlPath = join(WORK, 'guide.html');
    writeFileSync(htmlPath, html);

    console.log('Printing to PDF');
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
        '<span>TimeGate — a guide for managers</span><span class="pageNumber"></span></div>',
    });

    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, Buffer.from(data, 'base64'));

    const bytes = readFileSync(OUT).length;
    console.log(`\n  ${OUT}  ${(bytes / 1024 / 1024).toFixed(2)} MB\n`);
  } finally {
    page?.close();
    await chrome.stop();
    rmSync(WORK, { recursive: true, force: true });
  }
};

await main();
