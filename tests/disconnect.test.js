import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectDisconnect } from '../js/calc/disconnect.js';
import { disconnectData } from './data.js';

test('motor: 28 A FLC × 115% = 32.2 A → 60 A frame', () => {
  const r = selectDisconnect({ kind: 'motor', amps: 28, hp: 10, voltage: 600, disconnectData });
  assert.ok(Math.abs(r.minRating - 32.2) < 0.01);
  assert.equal(r.frame, 60);
  assert.equal(r.hpRatedRequired, true);
  assert.ok(r.warnings.some((w) => w.includes('horsepower')));
});

test('motor just under a frame boundary stays in frame', () => {
  // 26 A × 1.15 = 29.9 → 30 A frame
  const r = selectDisconnect({ kind: 'motor', amps: 26, disconnectData });
  assert.equal(r.frame, 30);
});

test('general load uses 100%', () => {
  const r = selectDisconnect({ kind: 'general', amps: 95, disconnectData });
  assert.equal(r.frame, 100);
  assert.equal(r.hpRatedRequired, false);
});

test('exceeding largest frame throws', () => {
  assert.throws(() => selectDisconnect({ kind: 'general', amps: 5000, disconnectData }), /largest/);
});

test('rejects invalid current', () => {
  assert.throws(() => selectDisconnect({ kind: 'motor', amps: 0, disconnectData }), /positive/);
});
