// App shell: settings store, theme, hash router, service worker registration.

import { loadDataset } from './data-loader.js';
import * as power from './ui/power.js';
import * as current from './ui/current.js';
import * as cable from './ui/cable.js';
import * as vdrop from './ui/vdrop.js';
import * as fuse from './ui/fuse.js';
import * as disconnect from './ui/disconnect.js';
import * as selectivity from './ui/selectivity.js';
import * as convert from './ui/convert.js';
import * as tables from './ui/tables.js';
import * as settingsPage from './ui/settings.js';
import { h, renderError } from './ui/common.js';

const MODULES = [power, current, cable, vdrop, fuse, disconnect, selectivity, convert, tables, settingsPage];

// ---- Settings (persisted locally) ----
const SETTINGS_KEY = 'lumioref-settings';
const DEFAULTS = { voltage: 600, phase: 3, material: 'copper', vdBranch: 3, vdTotal: 5, pf: 0.85, eff: 0.9, theme: 'auto', dataset: 'cec-2024', carry: true };

function loadSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}
const settings = loadSettings();
function saveSettings(patch = {}) {
  Object.assign(settings, patch);
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  applyTheme();
}

// ---- Theme ----
const mql = window.matchMedia('(prefers-color-scheme: dark)');
function applyTheme() {
  const mode = settings.theme === 'auto' ? (mql.matches ? 'dark' : 'light') : settings.theme;
  document.documentElement.dataset.theme = mode;
  document.querySelector('meta[name="theme-color"]').content = mode === 'dark' ? '#00234a' : '#fafdff';
}
mql.addEventListener('change', applyTheme);
applyTheme();

document.getElementById('themeToggle').addEventListener('click', () => {
  const order = ['auto', 'light', 'dark'];
  const next = order[(order.indexOf(settings.theme) + 1) % order.length];
  saveSettings({ theme: next });
  const btn = document.getElementById('themeToggle');
  btn.textContent = { auto: '◐', light: '☀', dark: '☾' }[next];
  btn.title = `Theme: ${next}`;
});

// ---- Router ----
const nav = document.getElementById('nav');
const main = document.getElementById('main');
let ctx = null;

function buildNav() {
  nav.replaceChildren(...MODULES.map((m) => h('a', { href: `#/${m.id}` }, m.title)));
}

function route() {
  const id = (location.hash.replace(/^#\//, '') || MODULES[0].id).split('?')[0];
  const mod = MODULES.find((m) => m.id === id) || MODULES[0];
  nav.querySelectorAll('a').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === `#/${mod.id}`));
  main.replaceChildren();
  try {
    mod.render(main, ctx);
  } catch (err) {
    renderError(main, err.message);
  }
  main.scrollIntoView({ block: 'start' });
}

// ---- Boot ----
(async () => {
  buildNav();
  // Cross-module carry: a calculated value one module "sends" so others
  // prefill from it. Session-scoped; inputs stay fully editable.
  const CARRY_KEY = 'lumioref-carry';
  const getCarry = () => {
    try {
      return JSON.parse(sessionStorage.getItem(CARRY_KEY));
    } catch {
      return null;
    }
  };
  const setCarry = (p) => (p ? sessionStorage.setItem(CARRY_KEY, JSON.stringify(p)) : sessionStorage.removeItem(CARRY_KEY));

  try {
    const data = await loadDataset(settings.dataset);
    ctx = { data, settings, saveSettings, getCarry, setCarry };
  } catch (err) {
    renderError(main, `Could not load data tables: ${err.message}. If you are opening index.html directly from disk, serve it over HTTP instead (see README).`);
    return;
  }
  window.addEventListener('hashchange', route);
  route();
})();

// ---- Service worker (offline) ----
if ('serviceWorker' in navigator && (location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname))) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js'));
}
