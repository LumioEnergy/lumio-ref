import { motorFuse, transformerFuse } from '../calc/fuse.js';
import { h, card, field, numInput, segmented, fmt, renderResult, renderError, readNum } from './common.js';

export const id = 'fuse';
export const title = 'Fuses';

export function render(main, ctx) {
  const { fuseData } = ctx.data;
  let tab = 'motor';
  let fuseType = 'timeDelay';

  const fla = numInput({ id: 'fu-fla', value: 28 });
  const priA = numInput({ id: 'fu-pri', value: 43.3 });
  const secA = numInput({ id: 'fu-sec', value: 125 });
  const secChk = h('input', { id: 'fu-secchk', type: 'checkbox' });
  const result = h('div', { class: 'result' });
  const body = h('div', {});

  const tabSeg = segmented({
    options: [
      { value: 'motor', label: 'Motor branch' },
      { value: 'transformer', label: 'Transformer' },
      { value: 'classes', label: 'Class guide' },
    ],
    value: tab,
    onChange: (v) => { tab = v; rebuild(); },
  });
  const typeSeg = segmented({
    options: [
      { value: 'timeDelay', label: 'Time-delay' },
      { value: 'nonTimeDelay', label: 'Non-time-delay' },
    ],
    value: fuseType,
    onChange: (v) => { fuseType = v; recalc(); },
  });

  function classesTable() {
    return h('table', { class: 'ref-table' },
      h('tr', {}, h('th', {}, 'Class'), h('th', {}, 'Range'), h('th', {}, 'Typical application')),
      fuseData.classes.map((c) =>
        h('tr', {}, h('td', {}, h('strong', {}, c.class)), h('td', {}, c.range), h('td', {}, `${c.application} ${c.timeDelay}.`))
      )
    );
  }

  function rebuild() {
    result.replaceChildren();
    if (tab === 'motor') {
      body.replaceChildren(h('div', { class: 'grid' }, field('Motor FLC (A)', fla), field('Fuse type', typeSeg)), result);
      recalc();
    } else if (tab === 'transformer') {
      body.replaceChildren(
        h('div', { class: 'grid' }, field('Primary current (A)', priA)),
        h('label', { class: 'check' }, secChk, 'Secondary OCPD provided (125%) — primary may rise to 300%'),
        h('div', { class: 'grid', id: 'fu-secwrap', style: secChk.checked ? '' : 'display:none' }, field('Secondary current (A)', secA)),
        result
      );
      recalc();
    } else {
      body.replaceChildren(
        classesTable(),
        h('p', { class: 'ref' }, `Standard ratings (${fuseData.standardRatings.ref}): ${fuseData.standardRatings.amps.join(', ')} A`)
      );
    }
  }

  function recalc() {
    try {
      if (tab === 'motor') {
        const r = motorFuse({ fla: readNum(fla, 'motor FLC'), fuseType, fuseData });
        renderResult(result, {
          headline: `${r.recommended}`,
          unit: 'A',
          badge: { text: fuseType === 'timeDelay' ? 'TD' : 'NTD', kind: 'ok' },
          rows: [
            ['Calculated maximum', `${fmt(r.normalMaxA, 1)} A`],
            ['Starting-relief max', `${r.startingReliefMax} A`],
          ],
          res: r,
          copy: {
            title: 'Motor Branch Fuse',
            lines: [`FLC ${fla.value} A, ${fuseType === 'timeDelay' ? 'time-delay' : 'non-time-delay'} → ${r.recommended} A (starting relief max ${r.startingReliefMax} A)`],
          },
        });
      } else if (tab === 'transformer') {
        document.getElementById('fu-secwrap').style.display = secChk.checked ? '' : 'none';
        const r = transformerFuse({
          primaryA: readNum(priA, 'primary current'),
          secondaryA: secChk.checked ? readNum(secA, 'secondary current') : null,
          withSecondary: secChk.checked,
          fuseData,
        });
        renderResult(result, {
          headline: `${r.primary}`,
          unit: 'A primary',
          rows: r.secondary ? [['Secondary fuse', `${r.secondary} A`]] : [],
          res: r,
          copy: {
            title: 'Transformer Fuse',
            lines: [
              `Primary ${priA.value} A${secChk.checked ? `, secondary ${secA.value} A protected` : ' (primary-only)'}`,
              `→ primary ${r.primary} A${r.secondary ? `, secondary ${r.secondary} A` : ''}`,
            ],
          },
        });
      }
    } catch (err) {
      renderError(result, err.message);
    }
  }

  const el = card('Fuse Selection', 'CEC 28-200 motor branch and 26-250/254 transformer sizing; Class J/CC/RK1/RK5/T/L guide.', field('Section', tabSeg), body);
  el.addEventListener('input', recalc);
  main.append(el);
  rebuild();
}
