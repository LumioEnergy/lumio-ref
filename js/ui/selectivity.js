import { checkSelectivity } from '../calc/selectivity.js';
import { h, card, field, numInput, select, fmt, renderResult, renderError, readNum } from './common.js';

export const id = 'selectivity';
export const title = 'Selectivity';

export function render(main, ctx) {
  const { selectivityData, fuseData } = ctx.data;
  const classes = fuseData.classes.map((c) => c.class);

  const upClass = select({ id: 'se-upc', options: classes, value: 'J' });
  const upA = numInput({ id: 'se-upa', value: 200 });
  const downClass = select({ id: 'se-dnc', options: classes, value: 'J' });
  const downA = numInput({ id: 'se-dna', value: 100 });
  const result = h('div', { class: 'result' });

  const VERDICTS = {
    selective: { text: 'SELECTIVE', kind: 'ok' },
    'not-selective': { text: 'NOT SELECTIVE', kind: 'bad' },
    verify: { text: 'VERIFY W/ TCC', kind: 'warn' },
  };

  function recalc() {
    try {
      const r = checkSelectivity({
        upstreamClass: upClass.value,
        upstreamA: readNum(upA, 'upstream rating'),
        downstreamClass: downClass.value,
        downstreamA: readNum(downA, 'downstream rating'),
        selectivityData,
      });
      renderResult(result, {
        headline: `${fmt(r.ratio)} : 1`,
        badge: VERDICTS[r.verdict],
        rows: [['Published minimum ratio', r.minRatio ? `${r.minRatio} : 1` : 'not published']],
        res: r,
        copy: {
          title: 'Fuse Selectivity Check',
          lines: [
            `Upstream Class ${upClass.value} ${upA.value} A over downstream Class ${downClass.value} ${downA.value} A`,
            `Ratio ${fmt(r.ratio)}:1 vs required ${r.minRatio ?? 'n/a'}:1 → ${VERDICTS[r.verdict].text}`,
          ],
        },
      });
    } catch (err) {
      renderError(result, err.message);
    }
  }

  const el = card(
    'Selectivity / Coordination',
    'Amp-ratio check against published fuse selectivity tables — reference level, not a TCC study.',
    h('div', { class: 'grid' },
      field('Upstream class', upClass),
      field('Upstream rating (A)', upA),
      field('Downstream class', downClass),
      field('Downstream rating (A)', downA)
    ),
    result
  );
  el.addEventListener('input', recalc);
  main.append(el);
  recalc();
}
