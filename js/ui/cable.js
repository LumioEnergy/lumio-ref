import { selectConductor } from '../calc/cable.js';
import { h, card, field, numInput, select, segmented, fmt, renderResult, renderError, readNum, foldout } from './common.js';
import { ampacityTable, ambientTable, countTable } from './tables.js';

export const id = 'cable';
export const title = 'Cable';

export function render(main, ctx) {
  const { ampacityData, deratingData } = ctx.data;
  let material = ctx.settings.material;

  const amps = numInput({ id: 'cb-amps', value: 28 });
  const motorChk = h('input', { id: 'cb-motor', type: 'checkbox' });
  const insulation = select({
    id: 'cb-ins',
    options: ampacityData.insulationTypes.map((t) => ({ value: t.tempC, label: `${t.type} — ${t.tempC} °C` })),
    value: 90,
  });
  const termination = select({
    id: 'cb-term',
    options: ampacityData.termination.options.map((t) => ({ value: t, label: `${t} °C` })),
    value: ampacityData.termination.defaultTempC,
  });
  const ambient = numInput({ id: 'cb-amb', value: 30, min: '-40' });
  const count = numInput({ id: 'cb-count', value: 3, step: '1', min: '1' });
  const result = h('div', { class: 'result' });

  const matSeg = segmented({
    options: [
      { value: 'copper', label: 'Copper' },
      { value: 'aluminum', label: 'Aluminum' },
    ],
    value: material,
    onChange: (v) => { material = v; recalc(); },
  });

  function recalc() {
    try {
      const r = selectConductor({
        loadAmps: readNum(amps, 'load current'),
        isMotor: motorChk.checked,
        material,
        insulationTempC: Number(insulation.value),
        terminationTempC: Number(termination.value),
        ambientC: readNum(ambient, 'ambient temperature'),
        conductorCount: Math.round(readNum(count, 'conductor count')),
        ampacityData,
        deratingData,
      });
      renderResult(result, {
        headline: r.size,
        badge: { text: material === 'copper' ? 'Cu' : 'Al', kind: 'ok' },
        rows: [
          ['Required ampacity', `${fmt(r.requiredAmpacity, 1)} A`],
          ['Base ampacity', `${fmt(r.baseAmpacity, 0)} A`],
          ['After derating', `${fmt(r.deratedAmpacity, 1)} A`],
          ['Termination limit', `${fmt(r.terminationLimit, 0)} A`],
          ['Allowed', `${fmt(r.allowedAmpacity, 1)} A`],
        ],
        res: r,
        copy: {
          title: 'Conductor Selection',
          lines: [
            `${amps.value} A${motorChk.checked ? ' motor FLA (×125%)' : ''}, ${material}, ${insulation.selectedOptions[0].textContent}, ${termination.value} °C terminations, ${ambient.value} °C ambient, ${count.value} conductors`,
            `→ ${r.size}  (governed by ${r.governing})`,
          ],
        },
      });
    } catch (err) {
      renderError(result, err.message);
    }
  }

  const el = card(
    'Cable / Conductor Selection',
    'CEC Tables 2/4 with Table 5A/5C derating and Rule 4-006 termination limits.',
    h('div', { class: 'grid' },
      field('Load current (A)', amps),
      field('Material', matSeg),
      field('Insulation / cable type', insulation),
      field('Termination rating', termination),
      field('Ambient (°C)', ambient),
      field('Current-carrying conductors', count)
    ),
    h('label', { class: 'check' }, motorChk, 'Motor circuit — apply 125% of FLA (CEC 28-106)'),
    result
  );
  el.addEventListener('input', recalc);

  const tablesCard = card(
    'Code tables — reference',
    'The exact values this calculator uses. Full set under the Tables module.',
    foldout(ampacityData.copper.ref, ampacityTable(ampacityData.copper)),
    foldout(ampacityData.aluminum.ref, ampacityTable(ampacityData.aluminum)),
    foldout(`${deratingData.ambient.ref} — ambient correction`, ambientTable(deratingData.ambient)),
    foldout(`${deratingData.conductorCount.ref} — conductor count`, countTable(deratingData.conductorCount))
  );

  main.append(el, tablesCard);
  recalc();
}
