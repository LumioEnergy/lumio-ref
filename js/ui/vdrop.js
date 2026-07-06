import { voltageDrop, minSizeForDrop } from '../calc/vdrop.js';
import { h, card, field, numInput, select, segmented, fmt, renderResult, renderError, readNum, carryNotice } from './common.js';

export const id = 'vdrop';
export const title = 'Voltage Drop';

const VOLTAGES = [120, 208, 240, 347, 480, 575, 600];

export function render(main, ctx) {
  const { impedanceData } = ctx.data;
  const carried = ctx.settings.carry ? ctx.getCarry() : null;
  const hasCarry = carried && typeof carried.amps === 'number';
  let mode = 'check';
  let material = ctx.settings.material;
  let phase = hasCarry && carried.phase ? carried.phase : ctx.settings.phase;

  const amps = numInput({ id: 'vd-amps', value: hasCarry ? carried.amps : 100 });
  const lengthM = numInput({ id: 'vd-len', value: 75 });
  const pf = numInput({ id: 'vd-pf', value: 0.9, step: '0.01' });
  const limit = numInput({ id: 'vd-limit', value: ctx.settings.vdBranch, step: '0.1' });
  const voltageSel = select({
    id: 'vd-voltage',
    options: VOLTAGES.map((v) => ({ value: v, label: `${v} V` })),
    value: hasCarry && VOLTAGES.includes(carried.voltage) ? carried.voltage : ctx.settings.voltage,
  });
  const sizeSel = select({ id: 'vd-size', options: impedanceData.sizes.map((s) => s.size), value: '3 AWG' });
  const result = h('div', { class: 'result' });

  const modeSeg = segmented({
    options: [
      { value: 'check', label: 'Check a size' },
      { value: 'recommend', label: 'Recommend min size' },
    ],
    value: mode,
    onChange: (v) => { mode = v; rebuild(); },
  });
  const matSeg = segmented({
    options: [
      { value: 'copper', label: 'Copper' },
      { value: 'aluminum', label: 'Aluminum' },
    ],
    value: material,
    onChange: (v) => { material = v; recalc(); },
  });
  const phaseSeg = segmented({
    options: [
      { value: 1, label: '1-phase' },
      { value: 3, label: '3-phase' },
    ],
    value: phase,
    onChange: (v) => { phase = Number(v); recalc(); },
  });

  const grid = h('div', { class: 'grid' });

  function rebuild() {
    grid.replaceChildren(
      field('Mode', modeSeg),
      field('Load current (A)', amps),
      field('Voltage', voltageSel),
      field('Phase', phaseSeg),
      ...(mode === 'check' ? [field('Conductor size', sizeSel)] : []),
      field('Material', matSeg),
      field('One-way length (m)', lengthM),
      field('Power factor', pf),
      field('Limit (%)', limit)
    );
    recalc();
  }

  function recalc() {
    try {
      const args = {
        amps: readNum(amps, 'load current'),
        voltage: Number(voltageSel.value),
        phase,
        material,
        lengthM: readNum(lengthM, 'length'),
        pf: readNum(pf, 'power factor'),
        limitPct: readNum(limit, 'limit'),
        impedanceData,
      };
      if (mode === 'check') {
        const r = voltageDrop({ ...args, size: sizeSel.value });
        renderResult(result, {
          headline: `${fmt(r.percent)} %`,
          badge: r.pass ? { text: 'PASS', kind: 'ok' } : { text: 'FAIL', kind: 'bad' },
          rows: [
            ['Voltage drop', `${fmt(r.voltsDropped)} V`],
            ['Receiving end', `${fmt(r.receivingVoltage, 1)} V`],
            ['Limit', `${args.limitPct} %`],
          ],
          res: r,
          copy: {
            title: 'Voltage Drop',
            lines: [
              `${args.amps} A, ${args.voltage} V ${phase}φ, ${sizeSel.value} ${material}, ${args.lengthM} m, PF ${args.pf}`,
              `→ ${fmt(r.voltsDropped)} V (${fmt(r.percent)} %) — ${r.pass ? 'PASS' : 'FAIL'} vs ${args.limitPct} %`,
            ],
          },
        });
      } else {
        const r = minSizeForDrop(args);
        renderResult(result, {
          headline: r.size,
          badge: { text: `${fmt(r.percent)} %`, kind: 'ok' },
          rows: [
            ['Voltage drop', `${fmt(r.voltsDropped)} V`],
            ['Limit', `${args.limitPct} %`],
          ],
          res: r,
          copy: {
            title: 'Voltage Drop (minimum size)',
            lines: [
              `${args.amps} A, ${args.voltage} V ${phase}φ, ${material}, ${args.lengthM} m, PF ${args.pf}, limit ${args.limitPct} %`,
              `→ minimum ${r.size} (${fmt(r.percent)} %)`,
            ],
          },
        });
      }
    } catch (err) {
      renderError(result, err.message);
    }
  }

  const el = card(
    'Voltage Drop',
    'R·cosφ + X·sinφ method with CEC Table D3-style impedance (Ω/km). Ampacity is checked separately in the Cable module.',
    hasCarry ? carryNotice(ctx, `Prefilled from ${carried.source}: ${carried.amps} A, ${carried.voltage} V, ${carried.phase}φ`) : null,
    grid,
    result
  );
  el.addEventListener('input', recalc);
  main.append(el);
  rebuild();
}
