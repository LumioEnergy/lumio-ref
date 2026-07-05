import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectConductor } from '../js/calc/cable.js';
import { ampacityData, deratingData } from './data.js';

const base = { ampacityData, deratingData };

test('40 A, Cu, 90C insulation, 75C termination, no derating → 8 AWG', () => {
  const r = selectConductor({ ...base, loadAmps: 40, insulationTempC: 90, terminationTempC: 75 });
  // 8 AWG: 90C = 55 A, 75C termination limit = 50 A ≥ 40 A
  assert.equal(r.size, '8 AWG');
});

test('75C termination governs over 90C insulation', () => {
  // 52 A load: 6 AWG 90C = 75 A but 8 AWG 75C = 50 < 52, so 6 AWG (75C = 65 A) governs by termination
  const r = selectConductor({ ...base, loadAmps: 52, insulationTempC: 90, terminationTempC: 75 });
  assert.equal(r.size, '6 AWG');
  assert.match(r.governing, /termination|derated/);
});

test('motor circuit applies 125% (28-106)', () => {
  // 28 A FLC × 1.25 = 35 A required
  const r = selectConductor({ ...base, loadAmps: 28, isMotor: true, insulationTempC: 90, terminationTempC: 75 });
  assert.equal(r.requiredAmpacity, 35);
  assert.equal(r.size, '10 AWG'); // 90C 40 A derated? no derating; 75C term = 35 A ≥ 35 ✓
});

test('ambient derating at 40 C ambient (Table 5A)', () => {
  // 12 AWG Cu 90C: 30 × 0.91 = 27.3 A
  const r = selectConductor({ ...base, loadAmps: 27, ambientC: 40, insulationTempC: 90, terminationTempC: 90 });
  assert.equal(r.size, '12 AWG');
  const r2 = selectConductor({ ...base, loadAmps: 28, ambientC: 40, insulationTempC: 90, terminationTempC: 90 });
  assert.equal(r2.size, '10 AWG');
});

test('conductor count derating (Table 5C): 6 conductors → 80%', () => {
  // 10 AWG Cu 90C: 40 × 0.8 = 32
  const r = selectConductor({ ...base, loadAmps: 32, conductorCount: 6, insulationTempC: 90, terminationTempC: 90 });
  assert.equal(r.size, '10 AWG');
  const r2 = selectConductor({ ...base, loadAmps: 33, conductorCount: 6, insulationTempC: 90, terminationTempC: 90 });
  assert.equal(r2.size, '8 AWG');
});

test('combined ambient + count derating multiply', () => {
  // 4 AWG Cu 90C: 95 × 0.91 × 0.8 = 69.16
  const r = selectConductor({ ...base, loadAmps: 69, ambientC: 40, conductorCount: 4, insulationTempC: 90, terminationTempC: 90 });
  assert.equal(r.size, '4 AWG');
});

test('aluminum table used for aluminum', () => {
  const r = selectConductor({ ...base, loadAmps: 95, material: 'aluminum', insulationTempC: 90, terminationTempC: 75 });
  // Al 75C: 1 AWG = 100 A ≥ 95; 90C 1 AWG = 115 ≥ 95 → 1 AWG
  assert.equal(r.size, '1 AWG');
  assert.match(r.ref, /Table 4/);
});

test('rejects impossible and invalid inputs', () => {
  assert.throws(() => selectConductor({ ...base, loadAmps: 2000 }), /parallel/);
  assert.throws(() => selectConductor({ ...base, loadAmps: -5 }), /positive/);
  assert.throws(() => selectConductor({ ...base, loadAmps: 10, insulationTempC: 60, terminationTempC: 60, ambientC: 60 }), /cannot be used|outside/);
  assert.throws(() => selectConductor({ ...base, loadAmps: 10, terminationTempC: 90, insulationTempC: 75 }), /Termination/);
  assert.throws(() => selectConductor({ ...base, loadAmps: 10, material: 'gold' }), /Material/);
});
