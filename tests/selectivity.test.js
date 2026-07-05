import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkSelectivity } from '../js/calc/selectivity.js';
import { selectivityData } from './data.js';

test('J over J at 2:1 is selective', () => {
  const r = checkSelectivity({ upstreamClass: 'J', upstreamA: 200, downstreamClass: 'J', downstreamA: 100, selectivityData });
  assert.equal(r.verdict, 'selective');
  assert.equal(r.ratio, 2);
});

test('J over J below 2:1 is not selective', () => {
  const r = checkSelectivity({ upstreamClass: 'J', upstreamA: 150, downstreamClass: 'J', downstreamA: 100, selectivityData });
  assert.equal(r.verdict, 'not-selective');
  assert.ok(r.warnings.some((w) => w.includes('TCC')));
});

test('J over RK5 needs 8:1', () => {
  const ok = checkSelectivity({ upstreamClass: 'J', upstreamA: 400, downstreamClass: 'RK5', downstreamA: 50, selectivityData });
  assert.equal(ok.verdict, 'selective');
  const bad = checkSelectivity({ upstreamClass: 'J', upstreamA: 200, downstreamClass: 'RK5', downstreamA: 50, selectivityData });
  assert.equal(bad.verdict, 'not-selective');
});

test('unlisted combination → verify', () => {
  const r = checkSelectivity({ upstreamClass: 'CC', upstreamA: 30, downstreamClass: 'CC', downstreamA: 10, selectivityData });
  assert.equal(r.verdict, 'verify');
  assert.equal(r.minRatio, null);
});

test('downstream ≥ upstream is rejected', () => {
  assert.throws(
    () => checkSelectivity({ upstreamClass: 'J', upstreamA: 100, downstreamClass: 'J', downstreamA: 100, selectivityData }),
    /smaller/
  );
});
