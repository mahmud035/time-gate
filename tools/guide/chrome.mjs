import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { wait } from './cdp.mjs';

const CANDIDATES = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'];

const which = async (name) =>
  new Promise((resolve) => {
    const probe = spawn('which', [name]);
    probe.on('close', (code) => resolve(code === 0));
    probe.on('error', () => resolve(false));
  });

/**
 * Starts a private headless Chrome and hands back a stop function.
 *
 * A throwaway profile directory keeps this out of the way of the browser the
 * person running it has open, and guarantees a clean slate — no extension
 * rewriting the page's colours, no restored tabs, no cached service worker.
 */
export const launchChrome = async ({ port = 9222 } = {}) => {
  const binary = (await Promise.all(CANDIDATES.map(async (name) => ((await which(name)) ? name : null))))
    .find(Boolean);

  if (!binary) {
    throw new Error(`no Chrome found — looked for: ${CANDIDATES.join(', ')}`);
  }

  const profile = mkdtempSync(join(tmpdir(), 'timegate-guide-'));
  const child = spawn(
    binary,
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profile}`,
      '--hide-scrollbars',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      'about:blank',
    ],
    { stdio: 'ignore', detached: false },
  );

  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();

      return {
        binary,
        /**
         * Chrome keeps writing to its profile for a moment after the signal, so
         * removing it immediately raced and threw ENOTEMPTY — with the PDF
         * already written, which made a finished run look like a failure.
         * Cleanup waits, retries, and never throws.
         */
        stop: async () => {
          const exited = new Promise((resolve) => child.once('exit', resolve));
          child.kill();
          await Promise.race([exited, wait(5000)]);

          for (let attempt = 0; attempt < 5; attempt += 1) {
            try {
              rmSync(profile, { recursive: true, force: true });

              return;
            } catch {
              await wait(300);
            }
          }
        },
      };
    } catch {
      await wait(250);
    }
  }

  child.kill();
  try {
    rmSync(profile, { recursive: true, force: true });
  } catch {
    // Nothing useful to do; the temporary directory is the OS's problem now.
  }
  throw new Error(`Chrome did not open a debugging port on ${port}`);
};
