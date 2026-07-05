// Fuse-to-fuse selectivity check against published amp-ratio tables.

function assertPos(name, v) {
  if (typeof v !== 'number' || Number.isNaN(v) || v <= 0) throw new Error(`${name} must be a positive number`);
}

export function checkSelectivity({ upstreamClass, upstreamA, downstreamClass, downstreamA, selectivityData }) {
  assertPos('Upstream rating', upstreamA);
  assertPos('Downstream rating', downstreamA);
  if (downstreamA >= upstreamA) {
    throw new Error('Downstream rating must be smaller than upstream rating');
  }

  const ratio = upstreamA / downstreamA;
  const row = selectivityData.ratios.find((r) => r.upstream === upstreamClass && r.downstream === downstreamClass);
  const steps = [`Ratio = ${upstreamA} A / ${downstreamA} A = ${ratio.toFixed(2)} : 1`];
  const warnings = [];

  let verdict;
  if (!row) {
    verdict = 'verify';
    steps.push(`No published ratio for Class ${upstreamClass} over Class ${downstreamClass}`);
    warnings.push('This class combination is not in the ratio table — verify with manufacturer TCC overlay.');
  } else if (ratio >= row.minRatio) {
    verdict = 'selective';
    steps.push(`Published minimum ratio ${row.minRatio}:1 met (${selectivityData.ref})`);
    warnings.push('Ratio tables assume same-manufacturer fuse families — confirm with the manufacturer selectivity guide.');
  } else {
    verdict = 'not-selective';
    steps.push(`Published minimum ratio ${row.minRatio}:1 NOT met (${selectivityData.ref})`);
    warnings.push('Below the published ratio — coordination is not assured; verify with manufacturer TCC.');
  }

  return { verdict, ratio, minRatio: row ? row.minRatio : null, ref: selectivityData.ref, steps, warnings };
}
