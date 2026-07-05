import { test } from 'node:test';
import assert from 'node:assert/strict';
import { powerToAmps, ampsToPower, motorFlcLookup, validVoltages } from '../js/calc/current.js';
import { flcData } from './data.js';

test('10 hp, 600 V, 3-phase uses Table 44 575 V column: 11 A', () => {
  const r = powerToAmps({ kind: 'hp', value: 10, voltage: 600, phase: 3, flcData });
  assert.equal(r.tableFlc, 11);
  assert.equal(r.governing, 11);
  assert.match(r.ref, /Table 44/);
});

test('25 hp, 480 V, 3-phase → 34 A (460 V column)', () => {
  const r = powerToAmps({ kind: 'hp', value: 25, voltage: 480, phase: 3, flcData });
  assert.equal(r.tableFlc, 34);
});

test('1/2 hp, 120 V, 1-phase → 9.8 A (Table 45, 115 V column)', () => {
  const r = powerToAmps({ kind: 'hp', value: 0.5, voltage: 120, phase: 1, flcData });
  assert.equal(r.tableFlc, 9.8);
  assert.match(r.ref, /Table 45/);
});

test('kW input: 10 kW, 208 V, 3-phase, PF 0.9', () => {
  const r = powerToAmps({ kind: 'kw', value: 10, voltage: 208, phase: 3, pf: 0.9 });
  const expected = 10000 / (Math.sqrt(3) * 208 * 0.9);
  assert.ok(Math.abs(r.calculated - expected) < 0.01);
  assert.equal(r.tableFlc, null);
});

test('non-tabulated motor (e.g. 347 V) warns and falls back to calculation', () => {
  const r = powerToAmps({ kind: 'hp', value: 5, voltage: 347, phase: 1, flcData });
  assert.equal(r.tableFlc, null);
  assert.ok(r.warnings.some((w) => w.includes('Table 44/45')));
});

test('table lookup returns exact rows only', () => {
  assert.equal(motorFlcLookup({ hp: 11, voltage: 600, phase: 3, flcData }), null);
  assert.equal(motorFlcLookup({ hp: 10, voltage: 600, phase: 3, flcData }).flc, 11);
});

test('reverse: 100 A, 600 V, 3-phase → kW/kVA/HP', () => {
  const r = ampsToPower({ amps: 100, voltage: 600, phase: 3, pf: 0.85, eff: 0.9 });
  const kw = (Math.sqrt(3) * 600 * 100 * 0.85) / 1000;
  assert.ok(Math.abs(r.kw - kw) < 0.01);
  assert.ok(Math.abs(r.kva - kw / 0.85) < 0.01);
  assert.ok(Math.abs(r.hp - (kw * 0.9) / 0.746) < 0.01);
});

test('voltage lists by phase', () => {
  assert.deepEqual(validVoltages(1), [120, 208, 240, 347]);
  assert.ok(validVoltages(3).includes(600));
});

test('rejects invalid inputs', () => {
  assert.throws(() => powerToAmps({ kind: 'hp', value: 10, voltage: 600, phase: 2 }), /Phase/);
  assert.throws(() => powerToAmps({ kind: 'amps', value: 10, voltage: 600, phase: 3 }), /kind/);
  assert.throws(() => ampsToPower({ amps: 0, voltage: 600, phase: 3 }), /positive/);
});
