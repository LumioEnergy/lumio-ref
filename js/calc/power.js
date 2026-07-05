// Power conversion: HP <-> kW <-> kVA.
// Convention: HP is mechanical shaft output; kW and kVA are electrical input.
// Efficiency links HP to kW; power factor links kW to kVA.

export const HP_TO_KW = 0.746;

function assertNum(name, v, { min = 0, max = Infinity, exclusiveMin = true } = {}) {
  if (typeof v !== 'number' || Number.isNaN(v)) throw new Error(`${name} must be a number`);
  if (exclusiveMin ? v <= min : v < min) throw new Error(`${name} must be greater than ${min}`);
  if (v > max) throw new Error(`${name} must not exceed ${max}`);
}

export function convertPower({ value, from, to, pf = 0.85, eff = 0.9 }) {
  assertNum('Value', value);
  assertNum('Power factor', pf, { max: 1 });
  assertNum('Efficiency', eff, { max: 1 });
  const units = ['hp', 'kw', 'kva'];
  if (!units.includes(from) || !units.includes(to)) throw new Error(`Units must be one of: ${units.join(', ')}`);

  const steps = [];
  // Normalize to electrical kW
  let kw;
  if (from === 'hp') {
    kw = (value * HP_TO_KW) / eff;
    steps.push(`Electrical input kW = ${value} hp × 0.746 / ${eff} (eff) = ${kw.toFixed(3)} kW`);
  } else if (from === 'kva') {
    kw = value * pf;
    steps.push(`kW = ${value} kVA × ${pf} (PF) = ${kw.toFixed(3)} kW`);
  } else {
    kw = value;
    steps.push(`Input = ${kw} kW (electrical)`);
  }

  let out;
  if (to === 'hp') {
    out = (kw * eff) / HP_TO_KW;
    steps.push(`HP = ${kw.toFixed(3)} kW × ${eff} (eff) / 0.746 = ${out.toFixed(3)} hp`);
  } else if (to === 'kva') {
    out = kw / pf;
    steps.push(`kVA = ${kw.toFixed(3)} kW / ${pf} (PF) = ${out.toFixed(3)} kVA`);
  } else {
    out = kw;
  }

  return {
    value: out,
    unit: { hp: 'hp', kw: 'kW', kva: 'kVA' }[to],
    kw,
    ref: '1 hp = 746 W; kW = kVA × PF; kW(elec) = hp × 0.746 / η',
    steps,
    warnings: [],
  };
}
