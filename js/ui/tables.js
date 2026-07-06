// Code tables reference — renders every bundled data table verbatim.
// Builders are exported so other modules (e.g. Cable) can embed them.

import { h, card, field, select, refTable } from './common.js';

export const id = 'tables';
export const title = 'Tables';

export function motorFlcTable(t) {
  return refTable(['HP', ...t.columns.map((c) => `${c} V`)], t.hp.map((r) => [r.label ?? r.hp, ...t.columns.map((c) => r.flc[c])]));
}

export function ampacityTable(tbl) {
  return refTable(['Size', '60 °C', '75 °C', '90 °C'], tbl.sizes.map((r) => [r.size, r['60C'], r['75C'], r['90C']]));
}

export function ambientTable(a) {
  const range = (r, i) => (i === 0 ? `≤ ${r.maxC}` : `${r.minC}–${r.maxC}`);
  return refTable(
    ['Ambient °C', '60 °C ins.', '75 °C ins.', '90 °C ins.'],
    a.rows.map((r, i) => [range(r, i), r['60C'] || '—', r['75C'] || '—', r['90C'] || '—'])
  );
}

export function countTable(c) {
  return refTable(
    ['Current-carrying conductors', 'Factor'],
    c.rows.map((r) => [r.max >= 999 ? `${r.min}+` : `${r.min}–${r.max}`, r.factor.toFixed(2)])
  );
}

export function impedanceTable(imp) {
  return refTable(
    ['Size', 'Cu R', 'Cu X', 'Al R', 'Al X'],
    imp.sizes.map((r) => [r.size, r.cu?.r, r.cu?.x, r.al?.r, r.al?.x])
  );
}

export function selectivityTable(s) {
  return refTable(['Upstream class', 'Downstream class', 'Min ratio'], s.ratios.map((r) => [r.upstream, r.downstream, `${r.minRatio} : 1`]));
}

function tableDefs(data) {
  return [
    { key: 't44', label: 'Table 44 — 3-phase motor FLC', ref: data.flcData.threePhase.ref, note: null, build: () => motorFlcTable(data.flcData.threePhase) },
    { key: 't45', label: 'Table 45 — 1-phase motor FLC', ref: data.flcData.singlePhase.ref, note: null, build: () => motorFlcTable(data.flcData.singlePhase) },
    { key: 't2', label: 'Table 2 — Copper ampacity', ref: data.ampacityData.copper.ref, note: null, build: () => ampacityTable(data.ampacityData.copper) },
    { key: 't4', label: 'Table 4 — Aluminum ampacity', ref: data.ampacityData.aluminum.ref, note: null, build: () => ampacityTable(data.ampacityData.aluminum) },
    { key: 't5a', label: 'Table 5A — Ambient correction', ref: data.deratingData.ambient.ref, note: data.deratingData.ambient.note, build: () => ambientTable(data.deratingData.ambient) },
    { key: 't5c', label: 'Table 5C — Conductor count', ref: data.deratingData.conductorCount.ref, note: data.deratingData.conductorCount.note, build: () => countTable(data.deratingData.conductorCount) },
    { key: 'd3', label: 'Table D3 — Impedance (Ω/km)', ref: data.impedanceData.ref, note: null, build: () => impedanceTable(data.impedanceData) },
    {
      key: 'std', label: 'Standard fuse/OCPD ratings', ref: data.fuseData.standardRatings.ref, note: null,
      build: () => h('p', { style: 'font-size:0.95rem;line-height:1.7' }, data.fuseData.standardRatings.amps.join(' · ') + ' A'),
    },
    { key: 'sel', label: 'Fuse selectivity ratios', ref: data.selectivityData.ref, note: data.selectivityData.note, build: () => selectivityTable(data.selectivityData) },
  ];
}

export function render(main, ctx) {
  const defs = tableDefs(ctx.data);
  const picker = select({ id: 'tb-pick', options: defs.map((d) => ({ value: d.key, label: d.label })), value: defs[0].key });
  const body = h('div', {});

  function show() {
    const def = defs.find((d) => d.key === picker.value);
    body.replaceChildren(
      h('p', { class: 'ref' }, `Ref: ${def.ref}`),
      def.note ? h('p', { class: 'sub' }, def.note) : null,
      def.build()
    );
  }

  const el = card(
    'Code Tables',
    'Bundled reference data, shown exactly as the calculators use it. Verify against the printed code.',
    field('Table', picker),
    body
  );
  el.addEventListener('input', show);
  main.append(el);
  show();
}
