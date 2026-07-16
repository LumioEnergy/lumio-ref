// Unit conversions: length (in / ft / cm / m / mm) and temperature (°C / °F).
// Exact factors: 1 in = 25.4 mm, 1 ft = 0.3048 m.

export const LENGTH_UNITS = ['mm', 'cm', 'm', 'in', 'ft'];

const M_PER = { m: 1, cm: 0.01, mm: 0.001, in: 0.0254, ft: 0.3048 };

function assertNum(name, v) {
  if (typeof v !== 'number' || Number.isNaN(v) || !Number.isFinite(v)) throw new Error(`${name} must be a number`);
}

export function convertLength({ value, from }) {
  assertNum('Value', value);
  if (value < 0) throw new Error('Length must not be negative');
  if (!LENGTH_UNITS.includes(from)) throw new Error(`Unit must be one of: ${LENGTH_UNITS.join(', ')}`);

  const m = value * M_PER[from];
  const out = Object.fromEntries(LENGTH_UNITS.map((u) => [u, m / M_PER[u]]));

  // round away float noise so e.g. 12 in reads 1 ft 0 in, not 0 ft 12 in
  const totalIn = Math.round(out.in * 1e9) / 1e9;
  const ftPart = Math.floor(totalIn / 12);
  const inPart = totalIn - ftPart * 12;

  return {
    ...out,
    ftIn: { ft: ftPart, in: inPart },
    ref: '1 in = 25.4 mm · 1 ft = 0.3048 m (exact)',
    steps: [`${value} ${from} × ${M_PER[from]} m/${from} = ${m} m, then divided into each unit`],
    warnings: [],
  };
}

export function convertTemp({ value, from }) {
  assertNum('Value', value);
  if (from !== 'c' && from !== 'f') throw new Error('Unit must be "c" or "f"');

  const c = from === 'c' ? value : ((value - 32) * 5) / 9;
  const f = from === 'f' ? value : (value * 9) / 5 + 32;

  return {
    c,
    f,
    ref: '°F = °C × 9/5 + 32',
    steps: [from === 'c' ? `${value} °C × 9/5 + 32 = ${f} °F` : `(${value} °F − 32) × 5/9 = ${c} °C`],
    warnings: [],
  };
}
