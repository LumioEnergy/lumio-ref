import { test } from 'node:test';
import assert from 'node:assert/strict';
import { convertPower } from '../js/calc/power.js';

test('hp to kW at 100% efficiency is 0.746/hp', () => {
  const r = convertPower({ value: 10, from: 'hp', to: 'kw', eff: 1 });
  assert.ok(Math.abs(r.value - 7.46) < 1e-9);
});

test('hp to kW includes efficiency (input kW > shaft kW)', () => {
  const r = convertPower({ value: 10, from: 'hp', to: 'kw', eff: 0.9 });
  assert.ok(Math.abs(r.value - 8.2889) < 0.001);
});

test('kW to kVA divides by PF', () => {
  const r = convertPower({ value: 8, from: 'kw', to: 'kva', pf: 0.8 });
  assert.equal(r.value, 10);
});

test('kVA to hp round-trips through kW', () => {
  const r = convertPower({ value: 10, from: 'kva', to: 'hp', pf: 0.8, eff: 0.9 });
  // 10 kVA × 0.8 = 8 kW; 8 × 0.9 / 0.746 = 9.651 hp
  assert.ok(Math.abs(r.value - 9.651) < 0.001);
});

test('same-unit conversion is identity', () => {
  assert.equal(convertPower({ value: 5, from: 'kw', to: 'kw' }).value, 5);
});

test('steps and ref are populated', () => {
  const r = convertPower({ value: 10, from: 'hp', to: 'kva' });
  assert.ok(r.steps.length >= 2);
  assert.ok(r.ref.includes('746'));
});

test('rejects invalid inputs', () => {
  assert.throws(() => convertPower({ value: -1, from: 'hp', to: 'kw' }), /positive|greater/);
  assert.throws(() => convertPower({ value: 1, from: 'hp', to: 'kw', pf: 1.2 }), /not exceed/);
  assert.throws(() => convertPower({ value: 1, from: 'watts', to: 'kw' }), /Units/);
  assert.throws(() => convertPower({ value: 1, from: 'hp', to: 'kw', eff: 0 }), /greater/);
});
