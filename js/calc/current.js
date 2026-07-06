// Current calculator: HP or kW -> amps (with CEC Table 44/45 motor FLC lookup),
// and reverse amps -> kW / HP.

import { HP_TO_KW } from './power.js';

const SQRT3 = Math.sqrt(3);

function assertPos(name, v, max = Infinity) {
  if (typeof v !== 'number' || Number.isNaN(v) || v <= 0) throw new Error(`${name} must be a positive number`);
  if (v > max) throw new Error(`${name} must not exceed ${max}`);
}

export function validVoltages(phase) {
  return phase === 1 ? [120, 208, 240, 347] : [208, 240, 480, 575, 600];
}

/** Look up CEC Table 44/45 FLC for a motor. Returns null when not tabulated. */
export function motorFlcLookup({ hp, voltage, phase, flcData }) {
  const table = phase === 3 ? flcData.threePhase : flcData.singlePhase;
  const col = table.voltageMap[String(voltage)];
  if (!col) return null;
  const row = table.hp.find((r) => Math.abs(r.hp - hp) < 0.01);
  if (!row || row.flc[col] === undefined) return null;
  return { flc: row.flc[col], column: `${col} V`, ref: table.ref };
}

export function powerToAmps({ kind, value, voltage, phase, pf = 0.85, eff = 0.9, flcData = null }) {
  if (!['hp', 'kw'].includes(kind)) throw new Error('kind must be "hp" or "kw"');
  assertPos('Value', value);
  assertPos('Voltage', voltage);
  if (phase !== 1 && phase !== 3) throw new Error('Phase must be 1 or 3');
  assertPos('Power factor', pf, 1);
  assertPos('Efficiency', eff, 1);

  const steps = [];
  const warnings = [];
  const kwElec = kind === 'hp' ? (value * HP_TO_KW) / eff : value;
  if (kind === 'hp') steps.push(`Electrical kW = ${value} hp × 0.746 / ${eff} = ${kwElec.toFixed(3)} kW`);

  const denom = phase === 3 ? SQRT3 * voltage * pf : voltage * pf;
  const calculated = (kwElec * 1000) / denom;
  steps.push(
    phase === 3
      ? `I = ${kwElec.toFixed(3)} kW × 1000 / (√3 × ${voltage} V × ${pf}) = ${calculated.toFixed(2)} A`
      : `I = ${kwElec.toFixed(3)} kW × 1000 / (${voltage} V × ${pf}) = ${calculated.toFixed(2)} A`
  );

  let table = null;
  let ref = phase === 3 ? 'I = P / (√3 × V × PF)' : 'I = P / (V × PF)';
  if (kind === 'hp' && flcData) {
    table = motorFlcLookup({ hp: value, voltage, phase, flcData });
    if (table) {
      ref = `${table.ref} (${table.column} column)`;
      steps.push(`${table.ref} FLC @ ${table.column} = ${table.flc} A — table value governs for motor circuit sizing`);
      const diffPct = Math.abs(table.flc - calculated) / table.flc * 100;
      if (diffPct > 10) {
        warnings.push(
          `Table FLC (${table.flc} A) differs from calculated current (${calculated.toFixed(1)} A) by ${diffPct.toFixed(0)}% — table values assume typical motor PF/efficiency; use the table value per CEC 28-104.`
        );
      }
    } else {
      warnings.push('No CEC Table 44/45 entry for this HP/voltage — calculated current shown; verify against motor nameplate.');
    }
  }

  return { calculated, tableFlc: table ? table.flc : null, governing: table ? table.flc : calculated, ref, steps, warnings };
}

/**
 * Reverse motor lookup: closest CEC Table 44/45 motor for a given current.
 * Returns null when the voltage/phase has no table column or the current is
 * outside the table's range (below smallest FLC −15% / above largest +15%).
 */
export function nearestMotorFromAmps({ amps, voltage, phase, flcData }) {
  const table = phase === 3 ? flcData.threePhase : flcData.singlePhase;
  const col = table.voltageMap[String(voltage)];
  if (!col) return null;
  let best = null;
  let minFlc = Infinity;
  let maxFlc = 0;
  for (const r of table.hp) {
    const f = r.flc[col];
    if (f === undefined) continue;
    minFlc = Math.min(minFlc, f);
    maxFlc = Math.max(maxFlc, f);
    if (!best || Math.abs(f - amps) < Math.abs(best.flc - amps)) {
      best = { hp: r.hp, label: r.label ?? String(r.hp), flc: f, ref: table.ref };
    }
  }
  if (!best || amps > maxFlc * 1.15 || amps < minFlc * 0.85) return null;
  return best;
}

export function ampsToPower({ amps, voltage, phase, pf = 0.85, eff = 0.9 }) {
  assertPos('Current', amps);
  assertPos('Voltage', voltage);
  if (phase !== 1 && phase !== 3) throw new Error('Phase must be 1 or 3');
  assertPos('Power factor', pf, 1);
  assertPos('Efficiency', eff, 1);

  const kw = (phase === 3 ? SQRT3 * voltage * amps * pf : voltage * amps * pf) / 1000;
  const kva = kw / pf;
  const hp = (kw * eff) / HP_TO_KW;
  const steps = [
    phase === 3
      ? `kW = √3 × ${voltage} V × ${amps} A × ${pf} / 1000 = ${kw.toFixed(3)} kW`
      : `kW = ${voltage} V × ${amps} A × ${pf} / 1000 = ${kw.toFixed(3)} kW`,
    `kVA = ${kw.toFixed(3)} / ${pf} = ${kva.toFixed(3)} kVA`,
    `HP ≈ ${kw.toFixed(3)} kW × ${eff} / 0.746 = ${hp.toFixed(2)} hp (mechanical output)`,
  ];
  return { kw, kva, hp, ref: phase === 3 ? 'P = √3 × V × I × PF' : 'P = V × I × PF', steps, warnings: [] };
}
