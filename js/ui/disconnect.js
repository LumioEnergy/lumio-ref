import { selectDisconnect } from '../calc/disconnect.js';
import { h, card, field, numInput, select, segmented, fmt, renderResult, renderError, readNum, carryNotice } from './common.js';

export const id = 'disconnect';
export const title = 'Disconnect';

const VOLTAGES = [120, 208, 240, 347, 480, 575, 600];

export function render(main, ctx) {
  const { disconnectData } = ctx.data;
  const carried = ctx.settings.carry ? ctx.getCarry() : null;
  const hasCarry = carried && typeof carried.amps === 'number';
  let kind = hasCarry ? (carried.isMotor ? 'motor' : 'general') : 'motor';

  const amps = numInput({ id: 'dc-amps', value: hasCarry ? carried.amps : 28 });
  const hp = numInput({ id: 'dc-hp', value: hasCarry && carried.hp ? carried.hp : 10 });
  const voltageSel = select({
    id: 'dc-voltage',
    options: VOLTAGES.map((v) => ({ value: v, label: `${v} V` })),
    value: hasCarry && VOLTAGES.includes(carried.voltage) ? carried.voltage : ctx.settings.voltage,
  });
  const result = h('div', { class: 'result' });
  const grid = h('div', { class: 'grid' });

  const kindSeg = segmented({
    options: [
      { value: 'motor', label: 'Motor' },
      { value: 'general', label: 'General load' },
    ],
    value: kind,
    onChange: (v) => { kind = v; rebuild(); },
  });

  function rebuild() {
    grid.replaceChildren(
      field('Load type', kindSeg),
      field(kind === 'motor' ? 'Motor FLC (A)' : 'Load current (A)', amps),
      ...(kind === 'motor' ? [field('Motor HP (for HP rating)', hp), field('Voltage', voltageSel)] : [])
    );
    recalc();
  }

  function recalc() {
    try {
      const r = selectDisconnect({
        kind,
        amps: readNum(amps, kind === 'motor' ? 'motor FLC' : 'load current'),
        hp: kind === 'motor' ? readNum(hp, 'motor HP', { optional: true }) : null,
        voltage: Number(voltageSel.value),
        disconnectData,
      });
      renderResult(result, {
        headline: `${r.frame}`,
        unit: 'A switch',
        badge: r.hpRatedRequired ? { text: 'HP-rated', kind: 'warn' } : null,
        rows: [['Minimum rating', `${fmt(r.minRating, 1)} A`]],
        res: { ...r, warnings: [...r.warnings, r.fusibleNote] },
        copy: {
          title: 'Disconnect Selection',
          lines: [
            `${kind === 'motor' ? `Motor ${hp.value} hp, FLC ${amps.value} A @ ${voltageSel.value} V` : `General load ${amps.value} A`} → ${r.frame} A switch${r.hpRatedRequired ? ' (HP-rated)' : ''}`,
          ],
        },
      });
    } catch (err) {
      renderError(result, err.message);
    }
  }

  const el = card(
    'Disconnect Selection',
    'Motor disconnects: ≥115% of FLC and horsepower-rated (CEC 28-604).',
    hasCarry ? carryNotice(ctx, `Prefilled from ${carried.source}: ${carried.amps} A${carried.hp ? `, ${carried.hp} hp` : ''}`) : null,
    grid,
    result
  );
  el.addEventListener('input', recalc);
  main.append(el);
  rebuild();
}
