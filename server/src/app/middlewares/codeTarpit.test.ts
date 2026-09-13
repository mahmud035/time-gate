import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearFailures,
  failureCount,
  registerFailure,
  resetTarpit,
} from './codeTarpit.js';

const IP = '203.0.113.7';

describe('codeTarpit', () => {
  beforeEach(resetTarpit);

  it('lets the first few mistakes through with no delay at all', () => {
    for (let i = 0; i < 5; i += 1) {
      expect(registerFailure(IP).delayMs).toBe(0);
    }
  });

  it('slows down once the free attempts are used up', () => {
    for (let i = 0; i < 5; i += 1) registerFailure(IP);

    expect(registerFailure(IP).delayMs).toBe(400);
    expect(registerFailure(IP).delayMs).toBe(800);
  });

  it('caps the delay so a failure never hangs', () => {
    for (let i = 0; i < 60; i += 1) registerFailure(IP);

    expect(registerFailure(IP).delayMs).toBe(4000);
  });

  /**
   * The whole point. A correct code clears the record, so a busy morning of
   * mistyping cannot accumulate into a penalty for the next person at the
   * tablet — they share an address.
   */
  it('forgets everything as soon as a correct code arrives', () => {
    for (let i = 0; i < 20; i += 1) registerFailure(IP);
    expect(failureCount(IP)).toBe(20);

    clearFailures(IP);

    expect(failureCount(IP)).toBe(0);
    expect(registerFailure(IP).delayMs).toBe(0);
  });

  it('only blocks outright far beyond anything a real morning reaches', () => {
    for (let i = 0; i < 100; i += 1) {
      expect(registerFailure(IP).blocked).toBe(false);
    }

    expect(registerFailure(IP).blocked).toBe(true);
  });

  it('keeps addresses separate, so one device cannot penalise another', () => {
    for (let i = 0; i < 30; i += 1) registerFailure(IP);

    expect(registerFailure('198.51.100.2').delayMs).toBe(0);
  });

  it('starts a fresh window once the old one expires', () => {
    const start = 1_000_000;
    for (let i = 0; i < 20; i += 1) registerFailure(IP, start);

    expect(failureCount(IP, start)).toBe(20);
    expect(registerFailure(IP, start + 11 * 60 * 1000).delayMs).toBe(0);
  });
});
