// Voltage drop using CEC Table D3-style R/X impedance (ohms/km, 75 C, PVC raceway).
// VD(1φ) = 2·I·L·(R·cosφ + X·sinφ)/1000 ; VD(3φ) = √3·I·L·(R·cosφ + X·sinφ)/1000, L in metres.

const SQRT3 = Math.sqrt(3);

function assertPos(name, v, max = Infinity) {
  if (typeof v !== 'number' || Number.isNaN(v) || v <= 0) throw new Error(`${name} must be a positive number`);
  if (v > max) throw new Error(`${name} must not exceed ${max}`);
}

function rowFor(impedanceData, size, material) {
  const row = impedanceData.sizes.find((s) => s.size === size);
  if (!row) throw new Error(`Unknown conductor size: ${size}`);
  const z = material === 'aluminum' ? row.al : row.cu;
  if (!z) throw new Error(`No ${material} impedance data for ${size}`);
  return z;
}

export function voltageDrop({ amps, voltage, phase, size, material = 'copper', lengthM, pf = 0.9, limitPct = 3, impedanceData }) {
  assertPos('Current', amps);
  assertPos('Voltage', voltage);
  assertPos('Length', lengthM);
  assertPos('Power factor', pf, 1);
  assertPos('Limit', limitPct, 100);
  if (phase !== 1 && phase !== 3) throw new Error('Phase must be 1 or 3');

  const z = rowFor(impedanceData, size, material);
  const cos = pf;
  const sin = Math.sqrt(1 - pf * pf);
  const zEff = z.r * cos + z.x * sin;
  const k = phase === 3 ? SQRT3 : 2;
  const vd = (k * amps * lengthM * zEff) / 1000;
  const pct = (vd / voltage) * 100;

  const steps = [
    `Z_eff = R·cosφ + X·sinφ = ${z.r} × ${cos.toFixed(3)} + ${z.x} × ${sin.toFixed(3)} = ${zEff.toFixed(4)} Ω/km`,
    `VD = ${phase === 3 ? '√3' : '2'} × ${amps} A × ${lengthM} m × ${zEff.toFixed(4)} / 1000 = ${vd.toFixed(2)} V`,
    `%VD = ${vd.toFixed(2)} / ${voltage} V = ${pct.toFixed(2)} %  (limit ${limitPct} %)`,
  ];
  return {
    voltsDropped: vd,
    percent: pct,
    pass: pct <= limitPct,
    receivingVoltage: voltage - vd,
    ref: `${impedanceData.ref}; CEC 8-102 (recommended max VD)`,
    steps,
    warnings: pct > limitPct ? [`Voltage drop ${pct.toFixed(2)} % exceeds the ${limitPct} % limit`] : [],
  };
}

/** Reverse mode: smallest listed size meeting the % limit. */
export function minSizeForDrop({ amps, voltage, phase, material = 'copper', lengthM, pf = 0.9, limitPct = 3, impedanceData }) {
  const tried = [];
  for (const row of impedanceData.sizes) {
    const z = material === 'aluminum' ? row.al : row.cu;
    if (!z) continue;
    const r = voltageDrop({ amps, voltage, phase, size: row.size, material, lengthM, pf, limitPct, impedanceData });
    tried.push(`${row.size}: ${r.percent.toFixed(2)} %`);
    if (r.pass) {
      return { ...r, size: row.size, steps: [...tried.map((t) => `Try ${t}`), ...r.steps] };
    }
  }
  throw new Error(`No single conductor meets ${limitPct} % at ${lengthM} m — consider parallel runs or a higher distribution voltage`);
}
