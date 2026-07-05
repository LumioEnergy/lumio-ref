import { test } from 'node:test';
import assert from 'node:assert/strict';
import { voltageDrop, minSizeForDrop } from '../js/calc/vdrop.js';
import { impedanceData } from './data.js';

test('3-phase VD formula matches hand calculation', () => {
  // 3 AWG Cu: R=0.82, X=0.154; PF 0.9 → sin=0.4359
  const r = voltageDrop({ amps: 100, voltage: 600, phase: 3, size: '3 AWG', lengthM: 100, pf: 0.9, impedanceData });
  const zeff = 0.82 * 0.9 + 0.154 * Math.sqrt(1 - 0.81);
  const vd = (Math.sqrt(3) * 100 * 100 * zeff) / 1000;
  assert.ok(Math.abs(r.voltsDropped - vd) < 0.01);
  assert.ok(Math.abs(r.percent - (vd / 600) * 100) < 0.01);
});

test('1-phase uses factor 2', () => {
  const r1 = voltageDrop({ amps: 20, voltage: 240, phase: 1, size: '12 AWG', lengthM: 30, pf: 1, impedanceData });
  // PF=1 → Zeff = R = 6.56; VD = 2×20×30×6.56/1000 = 7.872 V
  assert.ok(Math.abs(r1.voltsDropped - 7.872) < 0.001);
  assert.equal(r1.pass, false); // 3.28% > 3%
});

test('pass/fail respects custom limit', () => {
  const r = voltageDrop({ amps: 20, voltage: 240, phase: 1, size: '12 AWG', lengthM: 30, pf: 1, limitPct: 5, impedanceData });
  assert.equal(r.pass, true);
});

test('reverse mode returns smallest passing size', () => {
  const r = minSizeForDrop({ amps: 100, voltage: 600, phase: 3, lengthM: 150, pf: 0.9, limitPct: 3, impedanceData });
  // verify it passes and the next size down fails
  assert.equal(r.pass, true);
  const idx = impedanceData.sizes.findIndex((s) => s.size === r.size);
  if (idx > 0) {
    const smaller = voltageDrop({ amps: 100, voltage: 600, phase: 3, size: impedanceData.sizes[idx - 1].size, lengthM: 150, pf: 0.9, limitPct: 3, impedanceData });
    assert.equal(smaller.pass, false);
  }
});

test('aluminum uses al column and skips sizes without al data', () => {
  const r = voltageDrop({ amps: 50, voltage: 600, phase: 3, size: '2 AWG', material: 'aluminum', lengthM: 100, pf: 0.9, impedanceData });
  const zeff = 1.05 * 0.9 + 0.148 * Math.sqrt(1 - 0.81);
  assert.ok(Math.abs(r.voltsDropped - (Math.sqrt(3) * 50 * 100 * zeff) / 1000) < 0.01);
  assert.throws(() => voltageDrop({ amps: 5, voltage: 120, phase: 1, size: '14 AWG', material: 'aluminum', lengthM: 10, impedanceData }), /No aluminum/);
});

test('rejects invalid inputs', () => {
  assert.throws(() => voltageDrop({ amps: 10, voltage: 600, phase: 3, size: '99 AWG', lengthM: 10, impedanceData }), /Unknown/);
  assert.throws(() => voltageDrop({ amps: 10, voltage: 600, phase: 2, size: '2 AWG', lengthM: 10, impedanceData }), /Phase/);
  assert.throws(() => voltageDrop({ amps: 10, voltage: 600, phase: 3, size: '2 AWG', lengthM: 0, impedanceData }), /positive/);
  assert.throws(() => minSizeForDrop({ amps: 5000, voltage: 120, phase: 1, lengthM: 1000, impedanceData }), /No single conductor/);
});
