// Shared DOM helpers: hyperscript, form fields, result rendering, copy button.

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined) el.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined) continue;
    el.append(c.nodeType ? c : document.createTextNode(c));
  }
  return el;
}

export function field(label, input) {
  return h('div', { class: 'field' }, h('label', { for: input.id || null }, label), input);
}

export function numInput({ id, value = '', step = 'any', min = '0', placeholder = '' }) {
  return h('input', { id, type: 'number', inputmode: 'decimal', step, min, value, placeholder, autocomplete: 'off' });
}

export function select({ id, options, value }) {
  const s = h(
    'select',
    { id },
    options.map((o) => h('option', { value: o.value ?? o }, o.label ?? String(o)))
  );
  if (value !== undefined) s.value = String(value);
  return s;
}

/** Segmented control. onChange receives the selected value. */
export function segmented({ options, value, onChange }) {
  const wrap = h('div', { class: 'seg', role: 'group' });
  for (const o of options) {
    const btn = h('button', { type: 'button', 'data-value': o.value }, o.label);
    if (String(o.value) === String(value)) btn.classList.add('active');
    btn.addEventListener('click', () => {
      wrap.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      onChange(o.value);
    });
    wrap.append(btn);
  }
  wrap.value = () => wrap.querySelector('button.active')?.dataset.value;
  return wrap;
}

export function fmt(n, digits = 2) {
  if (typeof n !== 'number' || Number.isNaN(n)) return '—';
  const r = n.toFixed(digits);
  return String(parseFloat(r)); // trim trailing zeros
}

async function copyText(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.append(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  const old = btn.textContent;
  btn.textContent = '✓ Copied';
  setTimeout(() => (btn.textContent = old), 1400);
}

/**
 * Render a result block into `container` (cleared first).
 * { headline, unit, badge: {text, kind}, rows: [[label, value]], res: {ref, steps, warnings}, copy: {title, lines} }
 */
export function renderResult(container, { headline, unit = '', badge = null, rows = [], res = {}, copy = null }) {
  container.replaceChildren();
  const big = h('div', { class: 'big' }, headline, unit ? h('small', {}, ` ${unit}`) : null);
  if (badge) big.append(h('span', { class: `badge ${badge.kind}` }, badge.text));
  container.append(big);
  if (rows.length) {
    container.append(h('div', { class: 'result-rows' }, rows.map(([k, v]) => h('div', {}, h('span', {}, k), h('span', {}, v)))));
  }
  if (res.ref) container.append(h('p', { class: 'ref' }, `Ref: ${res.ref}`));
  for (const w of res.warnings || []) container.append(h('p', { class: 'warning' }, `⚠ ${w}`));
  if (res.steps?.length) {
    container.append(
      h('details', { class: 'steps' }, h('summary', {}, 'Calculation details'), h('ol', {}, res.steps.map((s) => h('li', {}, s))))
    );
  }
  if (copy) {
    const text = buildCopyText(copy.title, copy.lines, res);
    container.append(h('button', { class: 'btn', type: 'button', onclick: (e) => copyText(text, e.currentTarget) }, '⧉ Copy result'));
  }
}

export function buildCopyText(title, lines, res = {}) {
  const out = [`LUMIO REF — ${title}`, ...lines];
  if (res.ref) out.push(`Reference: ${res.ref}`);
  if (res.steps?.length) out.push('', 'Calculation:', ...res.steps.map((s) => `  ${s}`));
  for (const w of res.warnings || []) out.push(`Note: ${w}`);
  out.push('', 'Reference only — final design to be verified by a licensed engineer.');
  return out.join('\n');
}

export function renderError(container, message) {
  container.replaceChildren(h('p', { class: 'error' }, `⚠ ${message}`));
}

export function card(title, sub, ...children) {
  return h('section', { class: 'card' }, h('h2', {}, title), sub ? h('p', { class: 'sub' }, sub) : null, ...children);
}

/** Read a positive number from an input; throws with the field name for friendly errors. */
export function readNum(input, name, { optional = false } = {}) {
  const raw = input.value.trim();
  if (raw === '') {
    if (optional) return null;
    throw new Error(`Enter ${name}`);
  }
  const v = Number(raw);
  if (Number.isNaN(v)) throw new Error(`${name} must be a number`);
  return v;
}
