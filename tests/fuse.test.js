import { test } from 'node:test';
import assert from 'node:assert/strict';
import { motorFuse, transformerFuse, nextStandardUp, nextStandardDown } from '../js/calc/fuse.js';
import { fuseData } from './data.js';

const ratings = fuseData.standardRatings.amps;

test('standard rating rounding helpers', () => {
  assert.equal(nextStandardUp(101, ratings), 110);
  assert.equal(nextStandardUp(110, ratings), 110);
  assert.equal(nextStandardDown(109, ratings), 100);
  assert.equal(nextStandardDown(0.5, ratings), null);
});

test('time-delay motor fuse: 28 A FLC → 175% = 49 A → 45 A', () => {
  const r = motorFuse({ fla: 28, fuseType: 'timeDelay', fuseData });
  assert.equal(r.recommended, 45);
  assert.match(r.ref, /28-200/);
});

test('non-time-delay motor fuse: 28 A → 300% = 84 A → 80 A', () => {
  const r = motorFuse({ fla: 28, fuseType: 'nonTimeDelay', fuseData });
  assert.equal(r.recommended, 80);
});

test('starting relief cap: 28 A TD → 225% = 63 A → 60 A', () => {
  const r = motorFuse({ fla: 28, fuseType: 'timeDelay', fuseData });
  assert.equal(r.startingReliefMax, 60);
});

test('tiny motor falls back to smallest standard rating with warning', () => {
  const r = motorFuse({ fla: 0.4, fuseType: 'timeDelay', fuseData });
  assert.equal(r.recommended, ratings[0]);
  assert.ok(r.warnings.length > 0);
});

test('transformer primary-only ≥9 A: 125% with next-higher-up', () => {
  // 45 kVA 600V 3φ → 43.3 A × 1.25 = 54.1 → next standard up = 60
  const r = transformerFuse({ primaryA: 43.3, fuseData });
  assert.equal(r.primary, 60);
});

test('transformer primary-only <9 A: 167%, round DOWN', () => {
  const r = transformerFuse({ primaryA: 5, fuseData });
  // 5 × 1.67 = 8.35 → next standard down = 6
  assert.equal(r.primary, 6);
});

test('transformer primary-only <2 A: 300%, round DOWN', () => {
  const r = transformerFuse({ primaryA: 1.2, fuseData });
  // 1.2 × 3 = 3.6 → 3
  assert.equal(r.primary, 3);
});

test('transformer with secondary protection: secondary 125% up, primary ≤300% down', () => {
  const r = transformerFuse({ primaryA: 43.3, secondaryA: 125, withSecondary: true, fuseData });
  assert.equal(r.secondary, nextStandardUp(125 * 1.25, ratings)); // 156.25 → 175
  assert.equal(r.secondary, 175);
  assert.equal(r.primary, 125); // 43.3 × 3 = 129.9 → 125
});

test('rejects invalid inputs', () => {
  assert.throws(() => motorFuse({ fla: -1, fuseData }), /positive/);
  assert.throws(() => motorFuse({ fla: 10, fuseType: 'magic', fuseData }), /Fuse type/);
  assert.throws(() => transformerFuse({ primaryA: 10, withSecondary: true, fuseData }), /Secondary/);
});
