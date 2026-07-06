import { DATASETS } from '../data-loader.js';
import { h, card, field, numInput, select, segmented } from './common.js';

export const id = 'settings';
export const title = 'Settings';

export function render(main, ctx) {
  const s = ctx.settings;

  const voltage = select({ id: 'st-voltage', options: [120, 208, 240, 347, 480, 575, 600].map((v) => ({ value: v, label: `${v} V` })), value: s.voltage });
  const phase = segmented({
    options: [ { value: 1, label: '1-phase' }, { value: 3, label: '3-phase' } ],
    value: s.phase,
    onChange: (v) => ctx.saveSettings({ phase: Number(v) }),
  });
  const material = segmented({
    options: [ { value: 'copper', label: 'Copper' }, { value: 'aluminum', label: 'Aluminum' } ],
    value: s.material,
    onChange: (v) => ctx.saveSettings({ material: v }),
  });
  const carrySeg = segmented({
    options: [ { value: 'on', label: 'On' }, { value: 'off', label: 'Off' } ],
    value: s.carry ? 'on' : 'off',
    onChange: (v) => ctx.saveSettings({ carry: v === 'on' }),
  });
  const theme = segmented({
    options: [ { value: 'auto', label: 'Auto' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' } ],
    value: s.theme,
    onChange: (v) => ctx.saveSettings({ theme: v }),
  });
  const vdBranch = numInput({ id: 'st-vdb', value: s.vdBranch, step: '0.1' });
  const vdTotal = numInput({ id: 'st-vdt', value: s.vdTotal, step: '0.1' });
  const pf = numInput({ id: 'st-pf', value: s.pf, step: '0.01' });
  const eff = numInput({ id: 'st-eff', value: s.eff, step: '0.01' });
  const dataset = select({ id: 'st-ds', options: DATASETS.map((d) => ({ value: d.id, label: d.label })), value: s.dataset });

  function saveNums() {
    const patch = {};
    for (const [key, input] of [['vdBranch', vdBranch], ['vdTotal', vdTotal], ['pf', pf], ['eff', eff]]) {
      const v = Number(input.value);
      if (!Number.isNaN(v) && v > 0) patch[key] = v;
    }
    patch.voltage = Number(voltage.value);
    patch.dataset = dataset.value;
    ctx.saveSettings(patch);
  }

  const prefs = card(
    'Settings',
    'Saved on this device only. Defaults are applied when a module opens.',
    h('div', { class: 'grid' },
      field('Default voltage', voltage),
      field('Default phase', phase),
      field('Default material', material),
      field('Theme', theme),
      field('VD limit — branch (%)', vdBranch),
      field('VD limit — total (%)', vdTotal),
      field('Default power factor', pf),
      field('Default efficiency', eff),
      field('Send values between modules', carrySeg),
      field('Code dataset', dataset)
    )
  );
  prefs.addEventListener('input', saveNums);

  const about = card(
    'About the data',
    null,
    h('p', {}, `Active dataset: ${ctx.data.meta.edition} (${ctx.data.meta.standardsRef}).`),
    h('p', { class: 'warning' }, `⚠ ${ctx.data.meta._verification}`),
    h('p', { class: 'muted' }, 'Data lives in the app\'s data/ folder as plain JSON — edit and redeploy to update tables; no code changes needed. An NEC dataset can be added as data/nec-20xx/ with the same schema.')
  );

  main.append(prefs, about);
}
