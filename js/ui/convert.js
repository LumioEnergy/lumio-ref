import { convertLength, convertTemp } from '../calc/convert.js';
import { h, card, field, numInput, segmented, fmt, renderResult, renderError, readNum } from './common.js';

export const id = 'convert';
export const title = 'Convert';

export function render(main, ctx) {
  // ---- Length ----
  let lenFrom = 'in';
  const lenValue = numInput({ id: 'cv-len', value: 12, min: '0' });
  const lenResult = h('div', { class: 'result' });

  const lenSeg = segmented({
    options: [
      { value: 'in', label: 'in' },
      { value: 'ft', label: 'ft' },
      { value: 'cm', label: 'cm' },
      { value: 'm', label: 'm' },
      { value: 'mm', label: 'mm' },
    ],
    value: lenFrom,
    onChange: (v) => { lenFrom = v; recalcLen(); },
  });

  function recalcLen() {
    try {
      const v = readNum(lenValue, 'a length');
      const r = convertLength({ value: v, from: lenFrom });
      const metricIn = lenFrom === 'in' || lenFrom === 'ft';
      renderResult(lenResult, {
        headline: metricIn ? `${fmt(r.m, 4)} m` : `${r.ftIn.ft}′ ${fmt(r.ftIn.in, 2)}″`,
        rows: [
          ['mm', fmt(r.mm, 2)],
          ['cm', fmt(r.cm, 3)],
          ['m', fmt(r.m, 4)],
          ['in', fmt(r.in, 3)],
          ['ft', fmt(r.ft, 4)],
          ['ft + in', `${r.ftIn.ft} ft ${fmt(r.ftIn.in, 2)} in`],
        ],
        res: r,
        copy: {
          title: 'Length Conversion',
          lines: [`${v} ${lenFrom} = ${fmt(r.mm, 2)} mm = ${fmt(r.cm, 3)} cm = ${fmt(r.m, 4)} m = ${fmt(r.in, 3)} in = ${fmt(r.ft, 4)} ft`],
        },
      });
    } catch (err) {
      renderError(lenResult, err.message);
    }
  }

  const lenCard = card(
    'Length',
    'Enter a value in any unit — every measurement is shown.',
    h('div', { class: 'grid' }, field('Value', lenValue), field('Unit', lenSeg)),
    lenResult
  );
  lenCard.addEventListener('input', recalcLen);

  // ---- Temperature ----
  let tempFrom = 'c';
  const tempValue = numInput({ id: 'cv-temp', value: 40, min: '-273' });
  const tempResult = h('div', { class: 'result' });

  const tempSeg = segmented({
    options: [
      { value: 'c', label: '°C' },
      { value: 'f', label: '°F' },
    ],
    value: tempFrom,
    onChange: (v) => { tempFrom = v; recalcTemp(); },
  });

  function recalcTemp() {
    try {
      const v = readNum(tempValue, 'a temperature');
      const r = convertTemp({ value: v, from: tempFrom });
      renderResult(tempResult, {
        headline: tempFrom === 'c' ? `${fmt(r.f, 1)} °F` : `${fmt(r.c, 1)} °C`,
        rows: [
          ['°C', fmt(r.c, 1)],
          ['°F', fmt(r.f, 1)],
        ],
        res: r,
        copy: {
          title: 'Temperature Conversion',
          lines: [`${fmt(r.c, 1)} °C = ${fmt(r.f, 1)} °F`],
        },
      });
    } catch (err) {
      renderError(tempResult, err.message);
    }
  }

  const tempCard = card(
    'Temperature',
    'Celsius ↔ Fahrenheit.',
    h('div', { class: 'grid' }, field('Value', tempValue), field('Unit', tempSeg)),
    tempResult
  );
  tempCard.addEventListener('input', recalcTemp);

  main.append(lenCard, tempCard);
  recalcLen();
  recalcTemp();
}
