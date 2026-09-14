import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { wait } from './cdp.mjs';

/**
 * Screenshots of the real running app, driven through the real UI.
 *
 * Captures are clipped to the content rather than trimmed afterwards, which is
 * what lets this tool need nothing but Node and Chrome — an image library only
 * to crop whitespace would be a dependency earning very little.
 */
const PADDING = 26;

export const createCapturer = ({ page, baseUrl, outDir }) => {
  const viewport = (width, height) =>
    page.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      // Retina, so the screenshots stay sharp when printed.
      deviceScaleFactor: 2,
      mobile: false,
    });

  const goto = async (path) => {
    await page.send('Page.navigate', { url: baseUrl + path });
    await wait(2200);
  };

  const click = async (label) => {
    const found = await page.evaluate(
      `const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()===${JSON.stringify(label)});
       if (b) b.click();
       return !!b;`,
    );

    // Without this, a missing button silently produced a screenshot of the
    // wrong screen that looked perfectly fine until someone read the PDF.
    if (!found) {
      throw new Error(
        `no button labelled "${label}" on ${await page.evaluate('return location.pathname;')}`,
      );
    }
  };

  const clickLabelled = async (ariaLabel) => {
    const found = await page.evaluate(
      `const b=document.querySelector('button[aria-label=' + JSON.stringify(${JSON.stringify(ariaLabel)}) + ']');
       if (b) b.click();
       return !!b;`,
    );

    if (!found) throw new Error(`no control labelled "${ariaLabel}" on this screen`);
  };

  const fill = (id, value) =>
    page.evaluate(
      `const el=document.getElementById(${JSON.stringify(id)});
       if (!el) throw new Error('no field #' + ${JSON.stringify(id)});
       Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value')
         .set.call(el, ${JSON.stringify(value)});
       el.dispatchEvent(new Event('input',{bubbles:true}));
       return el.value;`,
    );

  /** The rectangle the page actually paints in, so the shot has no dead space. */
  const contentBox = () =>
    page.evaluate(`
      const bottoms=[...document.body.querySelectorAll('*')]
        .map(el=>el.getBoundingClientRect().bottom)
        .filter(b=>Number.isFinite(b));
      return { width: innerWidth, height: Math.min(innerHeight, Math.ceil(Math.max(0, ...bottoms))) };
    `);

  const shoot = async (name) => {
    const box = await contentBox();
    const { data } = await page.send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: false,
      clip: {
        x: 0,
        y: 0,
        width: box.width,
        height: Math.min(box.height + PADDING, box.height + PADDING),
        scale: 1,
      },
    });

    if (!data) throw new Error(`empty capture for ${name}`);

    const buffer = Buffer.from(data, 'base64');

    if (buffer.length < 5000) {
      throw new Error(`suspiciously small capture for ${name}: ${buffer.length} bytes`);
    }

    writeFileSync(join(outDir, `${name}.png`), buffer);
    console.log(`  ${name}  ${(buffer.length / 1024).toFixed(0)} KB`);
  };

  /** Real offline, not a simulated flag — the service worker behaves as it would. */
  const setOffline = async (offline) => {
    await page.send('Network.enable');
    await page.send('Network.emulateNetworkConditions', {
      offline,
      latency: 0,
      downloadThroughput: offline ? 0 : -1,
      uploadThroughput: offline ? 0 : -1,
    });
  };

  const enterCode = async (code) => {
    for (const digit of code.split('')) await click(digit);
    await wait(1800);
  };

  return { viewport, goto, click, clickLabelled, fill, shoot, setOffline, enterCode };
};

/**
 * The sequence the guide illustrates, in the order a manager meets it.
 *
 * Each staff-facing shot is taken at tablet proportions and each manager shot at
 * desktop proportions, because that is where each is actually used.
 */
/**
 * Every screen either guide needs, in one pass.
 *
 * The staff-facing shots are taken at tablet proportions and the manager's at
 * desktop, because that is where each is actually used. The page is reloaded
 * between staff states rather than waiting out the confirmation's auto-return,
 * which keeps the sequence deterministic.
 */
export const captureAll = async (capture, { slug, code, email, password }) => {
  const punchPage = `/p/${slug}`;

  /**
   * Sized to the keypad rather than to a device. The punch screen is
   * `min-h-dvh` and centres its content, so a taller viewport only pads the
   * shot with empty space that cannot be clipped away afterwards.
   */
  await capture.viewport(820, 740);

  await capture.goto(punchPage);
  await capture.shoot('s01-keypad');

  await capture.enterCode(code);
  await capture.shoot('s02-clocked-out');

  await capture.click('Clock in');
  await wait(1800);
  await capture.shoot('s03-confirmed');

  await capture.goto(punchPage);
  await capture.enterCode(code);
  await capture.shoot('s04-working');

  await capture.click('Start break');
  await wait(1800);
  await capture.goto(punchPage);
  await capture.enterCode(code);
  await capture.shoot('s05-on-break');

  await capture.goto(punchPage);
  await capture.enterCode('9999');
  await capture.shoot('s06-wrong-code');

  /**
   * Reload first, or the offline banner appears on top of the previous shot's
   * "code not recognised" message — a picture captioned "no connection" that
   * plainly says something else. The viewport grows because the banner adds
   * height, and the clip would otherwise slice through the bottom row of keys.
   */
  await capture.goto(punchPage);
  await capture.viewport(820, 820);
  await capture.setOffline(true);
  await wait(1500);
  await capture.shoot('s07-offline');
  await capture.setOffline(false);
  await wait(1500);
  await capture.viewport(820, 740);

  // Leave the demo person clocked out, so the manager screens read sensibly.
  await capture.goto(punchPage);
  await capture.enterCode(code);
  await capture.click('End break & clock out');
  await wait(1800);

  await capture.viewport(1340, 720);

  await capture.goto('/login');
  await capture.fill('email', email);
  await capture.fill('password', password);
  await capture.shoot('m01-login');

  await capture.click('Sign in');
  await wait(2600);
  await capture.shoot('m02-today');

  await capture.goto('/dashboard/records');
  // The seeded shifts are in the previous week, so step back before capturing.
  await capture.clickLabelled('Previous week');
  await wait(1800);
  await capture.shoot('m03-records');

  await capture.click('Fix');
  await wait(900);
  await capture.fill('correction-at', '2026-09-09T17:00');
  await wait(300);
  await capture.shoot('m04-correction');
  await capture.clickLabelled('Close');
  await wait(600);

  await capture.goto('/dashboard/staff');
  await capture.shoot('m05-staff');
};
