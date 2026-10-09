import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Set up mock window and navigator for Node test environment
if (typeof globalThis.window === 'undefined') {
  globalThis.window = {
    innerWidth: 1440,
    innerHeight: 900,
    localStorage: {
      _store: {},
      getItem(k) { return this._store[k] || null; },
      setItem(k, v) { this._store[k] = String(v); },
      removeItem(k) { delete this._store[k]; },
      clear() { this._store = {}; }
    }
  };
}
if (typeof globalThis.navigator === 'undefined') {
  globalThis.navigator = {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };
}

describe('Telemetry Service Contract', async () => {
  const { getDeviceInfo, scrubPii, trackVisitEvent, trackAiEvent } = await import('../src/lib/telemetry.js');

  test('scrubPii removes emails and phone numbers and caps length', () => {
    const input = 'Contact me at test.user@example.com or call +1 555-123-4567 for recommendations.';
    const scrubbed = scrubPii(input);

    assert.ok(!scrubbed.includes('test.user@example.com'), 'Email should be redacted');
    assert.ok(scrubbed.includes('[REDACTED_EMAIL]'), 'Redaction tag should be present');
    assert.ok(!scrubbed.includes('555-123-4567'), 'Phone number should be redacted');
    assert.ok(scrubbed.includes('[REDACTED_PHONE]'), 'Phone tag should be present');

    const superLong = 'a'.repeat(300);
    assert.ok(scrubPii(superLong).length <= 160, 'Should cap at 160 chars');
  });

  test('getDeviceInfo produces complete and structured hardware metadata', () => {
    const winInfo = getDeviceInfo('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');
    assert.equal(winInfo.os, 'Windows');
    assert.equal(winInfo.browser, 'Chrome');
    assert.equal(winInfo.deviceType, 'Desktop');
    assert.equal(winInfo.screenWidth, 1440);
    assert.equal(winInfo.screenHeight, 900);
    assert.ok(typeof winInfo.dayOfWeek === 'number');
    assert.ok(winInfo.dayOfWeek >= 0 && winInfo.dayOfWeek <= 6);
    assert.ok(typeof winInfo.hourOfDay === 'number');
    assert.ok(winInfo.hourOfDay >= 0 && winInfo.hourOfDay <= 23);
    assert.ok(typeof winInfo.timestamp === 'number');

    const iosInfo = getDeviceInfo('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1');
    assert.equal(iosInfo.os, 'iOS');
    assert.equal(iosInfo.browser, 'Safari');
    assert.equal(iosInfo.deviceType, 'Mobile');

    const androidInfo = getDeviceInfo('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36');
    assert.equal(androidInfo.os, 'Android');
    assert.equal(androidInfo.browser, 'Chrome');
    assert.equal(androidInfo.deviceType, 'Mobile');
  });

  test('trackVisitEvent executes without throwing', async () => {
    await assert.doesNotReject(async () => {
      await trackVisitEvent('movie');
    });
  });

  test('trackAiEvent executes without throwing', async () => {
    await assert.doesNotReject(async () => {
      await trackAiEvent('Recommend top anime', 'Gemini');
    });
  });
});
