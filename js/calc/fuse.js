// Fuse selection: motor branch (CEC 28-200) and transformer protection (26-250/26-254),
// using the standard rating list (14-104).

function assertPos(name, v) {
  if (typeof v !== 'number' || Number.isNaN(v) || v <= 0) throw new Error(`${name} must be a positive number`);
}

export function nextStandardDown(amps, ratings) {
  const list = ratings.filter((r) => r <= amps);
  return list.length ? list[list.length - 1] : null;
}

export function nextStandardUp(amps, ratings) {
  return ratings.find((r) => r >= amps) ?? null;
}

export function motorFuse({ fla, fuseType = 'timeDelay', fuseData }) {
  assertPos('Motor FLC', fla);
  const rule = fuseData.motorBranch[fuseType];
  if (!rule) throw new Error('Fuse type must be "timeDelay" or "nonTimeDelay"');
  const ratings = fuseData.standardRatings.amps;
  const label = fuseType === 'timeDelay' ? 'time-delay' : 'non-time-delay';

  const normalMax = (fla * rule.normalPct) / 100;
  const reliefMax = (fla * rule.startingReliefPct) / 100;
  const recommended = nextStandardDown(normalMax, ratings) ?? ratings[0];
  const reliefRating = nextStandardDown(reliefMax, ratings) ?? ratings[0];

  const steps = [
    `Max ${label} fuse = ${fla} A × ${rule.normalPct} % = ${normalMax.toFixed(1)} A (CEC 28-200)`,
    `Next standard rating not exceeding ${normalMax.toFixed(1)} A → ${recommended} A (14-104 list)`,
    `If insufficient for starting: up to ${rule.startingReliefPct} % = ${reliefMax.toFixed(1)} A → max ${reliefRating} A`,
  ];
  const warnings = [];
  if ((nextStandardDown(normalMax, ratings) ?? 0) < ratings[0]) {
    warnings.push('Calculated maximum is below the smallest standard rating — smallest standard fuse shown.');
  }
  return {
    recommended,
    startingReliefMax: reliefRating,
    normalMaxA: normalMax,
    ref: `${fuseData.motorBranch.ref}; ${fuseData.standardRatings.ref}`,
    steps,
    warnings,
  };
}

export function transformerFuse({ primaryA, secondaryA = null, withSecondary = false, fuseData }) {
  assertPos('Primary current', primaryA);
  if (withSecondary) assertPos('Secondary current', secondaryA);
  const ratings = fuseData.standardRatings.amps;
  const t = fuseData.transformer;
  const steps = [];
  const warnings = [];

  if (withSecondary) {
    const secMax = (secondaryA * t.withSecondary.secondaryPct) / 100;
    const secondary = nextStandardUp(secMax, ratings);
    const priMax = (primaryA * t.withSecondary.primaryMaxPct) / 100;
    const primary = nextStandardDown(priMax, ratings) ?? ratings[0];
    steps.push(`Secondary fuse = ${secondaryA} A × ${t.withSecondary.secondaryPct} % = ${secMax.toFixed(1)} A → next standard ${secondary} A`);
    steps.push(`Primary fuse max = ${primaryA} A × ${t.withSecondary.primaryMaxPct} % = ${priMax.toFixed(1)} A → max standard ${primary} A`);
    return { primary, secondary, ref: t.ref, steps, warnings };
  }

  const bracket = t.primaryOnly.find((b) => primaryA >= b.minA);
  const max = (primaryA * bracket.pct) / 100;
  steps.push(`Primary current ${primaryA} A → limit ${bracket.pct} % = ${max.toFixed(2)} A (${t.ref})`);
  let primary;
  if (bracket.nextHigherAllowed) {
    primary = nextStandardUp(max, ratings);
    steps.push(`Next higher standard rating permitted → ${primary} A`);
  } else {
    primary = nextStandardDown(max, ratings);
    if (primary === null) {
      primary = ratings[0];
      warnings.push('Calculated maximum is below the smallest standard rating — verify a supplementary fuse or smallest standard rating suitability.');
    }
    steps.push(`Rating must not exceed ${max.toFixed(2)} A → ${primary} A`);
  }
  return { primary, secondary: null, ref: t.ref, steps, warnings };
}
