import { powerToAmps, ampsToPower, nearestMotorFromAmps, validVoltages } from '../calc/current.js';
import { h, card, field, numInput, select, segmented, fmt, renderResult, renderError, readNum, carryNotice } from './common.js';

export const id = 'current';
export const title = 'Current';

const SEND_TARGETS = [
  { id: 'cable', label: 'Cable' },
  { id: 'vdrop', label: 'Voltage Drop' },
  { id: 'fuse', label: 'Fuses' },
  { id: 'disconnect', label: 'Disconnect' },
];

export function render(main, ctx) {
  const carried = ctx.settings.carry ? ctx.getCarry() : null;
  const fromPower = carried && carried.source === 'Power' && typeof carried.kw === 'number' ? carried : null;

  let mode = 'toAmps';
  let kind = fromPower ? 'kw' : 'hp';
  let phase = ctx.settings.phase;

  const value = numInput({ id: 'cu-value', value: fromPower ? +fromPower.kw.toFixed(2) : 10 });
  const amps = numInput({ id: 'cu-amps', value: 30 });
  const pf = numInput({ id: 'cu-pf', value: fromPower?.pf ?? ctx.settings.pf, step: '0.01' });
  const eff = numInput({ id: 'cu-eff', value: fromPower?.eff ?? ctx.settings.eff, step: '0.01' });
  const result = h('div', { class: 'result' });

  const voltageSel = select({ id: 'cu-voltage', options: validVoltages(phase), value: ctx.settings.voltage });

  function refreshVoltages() {
    const opts = validVoltages(phase);
    const cur = Number(voltageSel.value);
    voltageSel.replaceChildren(...opts.map((v) => h('option', { value: v }, `${v} V`)));
    voltageSel.value = String(opts.includes(cur) ? cur : opts.includes(ctx.settings.voltage) ? ctx.settings.voltage : opts[opts.length - 1]);
  }
  refreshVoltages();

  const modeSeg = segmented({
    options: [
      { value: 'toAmps', label: 'Power → Amps' },
      { value: 'toPower', label: 'Amps → Power' },
    ],
    value: mode,
    onChange: (v) => { mode = v; rebuild(); },
  });
  const kindSeg = segmented({
    options: [
      { value: 'hp', label: 'HP (motor)' },
      { value: 'kw', label: 'kW' },
    ],
    value: kind,
    onChange: (v) => { kind = v; recalc(); },
  });
  const phaseSeg = segmented({
    options: [
      { value: 1, label: '1-phase' },
      { value: 3, label: '3-phase' },
    ],
    value: phase,
    onChange: (v) => { phase = Number(v); refreshVoltages(); recalc(); },
  });

  const grid = h('div', { class: 'grid' });

  function rebuild() {
    grid.replaceChildren(
      field('Mode', modeSeg),
      ...(mode === 'toAmps' ? [field('Input', kindSeg), field(kind === 'hp' ? 'Motor HP' : 'kW', value)] : [field('Current (A)', amps)]),
      field('Phase', phaseSeg),
      field('Voltage', voltageSel),
      field('Power factor', pf),
      field('Efficiency', eff)
    );
    recalc();
  }

  function recalc() {
    try {
      const voltage = Number(voltageSel.value);
      const common = { voltage, phase, pf: readNum(pf, 'power factor'), eff: readNum(eff, 'efficiency') };
      if (mode === 'toAmps') {
        const v = readNum(value, kind === 'hp' ? 'motor HP' : 'kW');
        const r = powerToAmps({ kind, value: v, ...common, flcData: ctx.data.flcData });
        renderResult(result, {
          headline: fmt(r.governing, 1),
          unit: 'A',
          badge: r.tableFlc !== null ? { text: 'Table value', kind: 'ok' } : kind === 'hp' ? { text: 'Calculated', kind: 'warn' } : null,
          rows: [
            ['Calculated', `${fmt(r.calculated, 1)} A`],
            ...(r.tableFlc !== null ? [['CEC table FLC', `${fmt(r.tableFlc, 1)} A`]] : []),
          ],
          res: r,
          copy: {
            title: 'Current Calculator',
            lines: [`${v} ${kind === 'hp' ? 'hp' : 'kW'}, ${voltage} V, ${phase}-phase → ${fmt(r.governing, 1)} A`],
          },
          send: {
            ctx,
            payload: {
              amps: +r.governing.toFixed(1),
              voltage,
              phase,
              isMotor: kind === 'hp',
              hp: kind === 'hp' ? v : null,
              source: 'Current',
            },
            targets: SEND_TARGETS,
          },
        });
      } else {
        const a = readNum(amps, 'current');
        const r = ampsToPower({ amps: a, ...common });
        const motor = nearestMotorFromAmps({ amps: a, voltage, phase, flcData: ctx.data.flcData });
        if (motor) {
          r.steps.push(`Closest ${motor.ref} motor: ${motor.label} hp (table FLC ${motor.flc} A)`);
        }
        renderResult(result, {
          headline: `${fmt(r.kw)} kW · ${fmt(r.hp)} hp`,
          badge: motor ? { text: `≈ ${motor.label} hp motor`, kind: 'ok' } : null,
          rows: [
            ['kW', `${fmt(r.kw)} kW`],
            ['kVA', `${fmt(r.kva)} kVA`],
            ['≈ HP (from PF/eff)', `${fmt(r.hp)} hp`],
            ...(motor ? [[`Closest table motor (${motor.ref})`, `${motor.label} hp — FLC ${motor.flc} A`]] : []),
          ],
          res: r,
          copy: {
            title: 'Current Calculator (reverse)',
            lines: [
              `${a} A, ${voltage} V, ${phase}-phase → ${fmt(r.kw)} kW / ${fmt(r.kva)} kVA / ≈${fmt(r.hp)} hp`,
              ...(motor ? [`Closest table motor: ${motor.label} hp (FLC ${motor.flc} A, ${motor.ref})`] : []),
            ],
          },
          send: {
            ctx,
            payload: { amps: a, voltage, phase, isMotor: !!motor, hp: motor ? motor.hp : null, source: 'Current' },
            targets: SEND_TARGETS,
          },
        });
      }
    } catch (err) {
      renderError(result, err.message);
    }
  }

  const el = card(
    'Current Calculator',
    'Motor HP uses CEC Table 44/45 full-load current where tabulated.',
    fromPower ? carryNotice(ctx, `Prefilled from Power: ${+fromPower.kw.toFixed(2)} kW`) : null,
    grid,
    result
  );
  el.addEventListener('input', recalc);
  main.append(el);
  rebuild();
}
