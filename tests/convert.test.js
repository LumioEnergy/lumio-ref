import { test } from 'node:test';
import assert from 'node:assert/strict';
import { convertLength, convertTemp, LENGTH_UNITS } from '../js/calc/convert.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} !== ${b}`);

test('1 in = 25.4 mm = 2.54 cm (exact)', () => {
  const r = convertLength({ value: 1, from: 'in' });
  close(r.mm, 25.4);
  close(r.cm, 2.54);
  close(r.m, 0.0254);
});

test('1 ft = 0.3048 m = 12 in', () => {
  const r = convertLength({ value: 1, from: 'ft' });
  close(r.m, 0.3048);
  close(r.in, 12);
  close(r.cm, 30.48);
});

test('metric to imperial: 1 m = 39.3700787… in = 3.2808399… ft', () => {
  const r = convertLength({ value: 1, from: 'm' });
  close(r.in, 39.37007874015748);
  close(r.ft, 3.280839895013123);
  close(r.mm, 1000);
});

test('100 cm = 1 m and round-trips through every unit', () => {
  const r = convertLength({ value: 100, from: 'cm' });
  close(r.m, 1);
  for (const u of LENGTH_UNITS) {
    close(convertLength({ value: r[u], from: u }).m, 1);
  }
});

test('ft+in composite: 1 m = 3 ft 3.37 in', () => {
  const r = convertLength({ value: 1, from: 'm' });
  assert.equal(r.ftIn.ft, 3);
  close(r.ftIn.in, 3.3700787401574792, 1e-9);
});

test('ft+in composite handles exact-foot float noise: 12 in = 1 ft 0 in', () => {
  const r = convertLength({ value: 12, from: 'in' });
  assert.equal(r.ftIn.ft, 1);
  close(r.ftIn.in, 0);
  const r2 = convertLength({ value: 60.96, from: 'cm' }); // exactly 2 ft
  assert.equal(r2.ftIn.ft, 2);
  close(r2.ftIn.in, 0);
});

test('length rejects negatives and unknown units', () => {
  assert.throws(() => convertLength({ value: -1, from: 'm' }), /negative/);
  assert.throws(() => convertLength({ value: 1, from: 'yd' }), /Unit/);
  assert.throws(() => convertLength({ value: NaN, from: 'm' }), /number/);
});

test('temperature anchors: 0 C = 32 F, 100 C = 212 F, -40 = -40', () => {
  close(convertTemp({ value: 0, from: 'c' }).f, 32);
  close(convertTemp({ value: 100, from: 'c' }).f, 212);
  close(convertTemp({ value: -40, from: 'c' }).f, -40);
  close(convertTemp({ value: -40, from: 'f' }).c, -40);
});

test('F to C: 212 F = 100 C; identity on the input side', () => {
  const r = convertTemp({ value: 212, from: 'f' });
  close(r.c, 100);
  close(r.f, 212);
});

test('temperature accepts negatives, rejects junk', () => {
  close(convertTemp({ value: -25, from: 'c' }).f, -13);
  assert.throws(() => convertTemp({ value: 20, from: 'k' }), /Unit/);
  assert.throws(() => convertTemp({ value: Infinity, from: 'c' }), /number/);
});
