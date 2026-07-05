import { convertPower } from '../calc/power.js';
import { h, card, field, numInput, segmented, fmt, renderResult, renderError, readNum } from './common.js';

export const id = 'power';
export const title = 'Power';

export function render(main, ctx) {
  let from = 'hp';
  const value = numInput({ id: 'pw-value', value: 10 });
  const pf = numInput({ id: 'pw-pf', value: ctx.settings.pf, step: '0.01' });
  const eff = numInput({ id: 'pw-eff', value: ctx.settings.eff, step: '0.01' });
  const result = h('div', { class: 'result' });

  const seg = segmented({
    options: [
      { value: 'hp', label: 'HP' },
      { value: 'kw', label: 'kW' },
      { value: 'kva', label: 'kVA' },
    ],
    value: from,
    onChange: (v) => {
      from = v;
      recalc();
    },
  });

  function recalc() {
    try {
      const v = readNum(value, 'a value');
      const args = { value: v, pf: readNum(pf, 'power factor'), eff: readNum(eff, 'efficiency') };
      const targets = ['hp', 'kw', 'kva'].filter((u) => u !== from);
      const results = Object.fromEntries(targets.map((t) => [t, convertPower({ ...args, from, to: t })]));
      const primary = results[targets[0]];
      const unitLabel = { hp: 'hp', kw: 'kW', kva: 'kVA' };
      renderResult(result, {
        headline: fmt(primary.value),
        unit: primary.unit,
        rows: targets.map((t) => [unitLabel[t], `${fmt(results[t].value)} ${results[t].unit}`]),
        res: { ref: primary.ref, steps: [...new Set(targets.flatMap((t) => results[t].steps))], warnings: [] },
        copy: {
          title: 'Power Conversion',
          lines: [
            `Input: ${v} ${unitLabel[from]} (PF ${args.pf}, eff ${args.eff})`,
            ...targets.map((t) => `= ${fmt(results[t].value)} ${results[t].unit}`),
          ],
        },
      });
    } catch (err) {
      renderError(result, err.message);
    }
  }

  const el = card(
    'Power Conversion',
    'HP ↔ kW ↔ kVA. HP is shaft output; kW/kVA are electrical input.',
    h('div', { class: 'grid' }, field('Convert from', seg), field('Value', value), field('Power factor', pf), field('Efficiency', eff)),
    result
  );
  el.addEventListener('input', recalc);
  main.append(el);
  recalc();
}
