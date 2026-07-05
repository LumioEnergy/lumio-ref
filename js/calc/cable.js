// Conductor selection per CEC Tables 2/4 with Table 5A/5C derating and
// Rule 4-006 termination temperature limits. Motor circuits: 125% FLA (28-106).

function factorFor(rows, key, value, label) {
  const row = rows.find((r) => value >= (r.minC ?? r.min) && value <= (r.maxC ?? r.max));
  if (!row) throw new Error(`${label} ${value} is outside the table range`);
  const f = key ? row[key] : row.factor;
  if (f === undefined) throw new Error(`No ${label} factor for column ${key}`);
  return f;
}

export function selectConductor({
  loadAmps,
  isMotor = false,
  material = 'copper',
  insulationTempC = 90,
  terminationTempC = 75,
  ambientC = 30,
  conductorCount = 3,
  ampacityData,
  deratingData,
}) {
  if (typeof loadAmps !== 'number' || Number.isNaN(loadAmps) || loadAmps <= 0) throw new Error('Load current must be a positive number');
  if (!['copper', 'aluminum'].includes(material)) throw new Error('Material must be copper or aluminum');
  if (![60, 75, 90].includes(insulationTempC)) throw new Error('Insulation rating must be 60, 75 or 90 °C');
  if (![60, 75, 90].includes(terminationTempC)) throw new Error('Termination rating must be 60, 75 or 90 °C');
  if (terminationTempC > insulationTempC) throw new Error('Termination rating cannot exceed insulation rating');
  if (!Number.isInteger(conductorCount) || conductorCount < 1) throw new Error('Conductor count must be a positive integer');

  const steps = [];
  const warnings = [];

  const required = isMotor ? loadAmps * 1.25 : loadAmps;
  if (isMotor) steps.push(`Motor circuit: required ampacity = ${loadAmps} A × 125% = ${required.toFixed(1)} A (CEC 28-106)`);
  else steps.push(`Required ampacity = ${required.toFixed(1)} A`);

  const insCol = `${insulationTempC}C`;
  const termCol = `${terminationTempC}C`;

  const ambFactor = factorFor(deratingData.ambient.rows, insCol, ambientC, 'Ambient temperature');
  if (ambFactor === 0) throw new Error(`${insulationTempC} °C insulation cannot be used at ${ambientC} °C ambient (Table 5A)`);
  const cntFactor = factorFor(deratingData.conductorCount.rows, null, conductorCount, 'Conductor count');
  if (ambFactor !== 1) steps.push(`Ambient correction @ ${ambientC} °C, ${insulationTempC} °C column: × ${ambFactor} (${deratingData.ambient.ref})`);
  if (cntFactor !== 1) steps.push(`${conductorCount} current-carrying conductors: × ${cntFactor} (${deratingData.conductorCount.ref})`);

  const tbl = ampacityData[material];
  for (const row of tbl.sizes) {
    const base = row[insCol];
    const derated = base * ambFactor * cntFactor;
    const termLimit = row[termCol]; // termination check: table value at termination temp, no ambient derating
    if (derated >= required && termLimit >= required) {
      const governing =
        derated <= termLimit
          ? `derated ${insulationTempC} °C ampacity (${derated.toFixed(1)} A after correction factors)`
          : `${terminationTempC} °C termination limit (${termLimit} A, CEC 4-006)`;
      steps.push(`${row.size}: base ${base} A @ ${insulationTempC} °C → derated ${derated.toFixed(1)} A; termination limit ${termLimit} A @ ${terminationTempC} °C`);
      steps.push(`Governing constraint: ${governing}`);
      if (terminationTempC < insulationTempC && termLimit < derated) {
        warnings.push(`${terminationTempC} °C terminations limit this circuit below the ${insulationTempC} °C insulation capability.`);
      }
      return {
        size: row.size,
        baseAmpacity: base,
        deratedAmpacity: derated,
        terminationLimit: termLimit,
        allowedAmpacity: Math.min(derated, termLimit),
        requiredAmpacity: required,
        governing,
        ref: `${tbl.ref}; ${deratingData.ambient.ref}; ${deratingData.conductorCount.ref}; CEC 4-006`,
        steps,
        warnings,
      };
    }
  }
  throw new Error(`No single conductor in ${tbl.ref} is adequate for ${required.toFixed(0)} A after derating — consider parallel conductors`);
}
