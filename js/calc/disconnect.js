// Disconnect switch selection per CEC 28-604 (motors) / general isolation.

function assertPos(name, v) {
  if (typeof v !== 'number' || Number.isNaN(v) || v <= 0) throw new Error(`${name} must be a positive number`);
}

export function selectDisconnect({ kind = 'motor', amps, hp = null, voltage = null, disconnectData }) {
  assertPos(kind === 'motor' ? 'Motor FLC' : 'Load current', amps);
  const steps = [];
  const warnings = [];

  let minRating;
  if (kind === 'motor') {
    minRating = (amps * disconnectData.motor.minPctFla) / 100;
    steps.push(`Minimum rating = ${amps} A × ${disconnectData.motor.minPctFla} % = ${minRating.toFixed(1)} A (${disconnectData.ref})`);
  } else {
    minRating = amps;
    steps.push(`Minimum rating = load current = ${amps} A`);
  }

  const frame = disconnectData.frames.find((f) => f >= minRating);
  if (!frame) throw new Error(`Load exceeds the largest listed switch frame (${disconnectData.frames.at(-1)} A)`);
  steps.push(`Smallest standard frame ≥ ${minRating.toFixed(1)} A → ${frame} A`);

  if (kind === 'motor') {
    warnings.push(
      hp && voltage
        ? `Switch must be horsepower-rated for ${hp} hp @ ${voltage} V (${disconnectData.ref}).`
        : `Switch must be horsepower-rated for the motor (${disconnectData.ref}).`
    );
  }

  return {
    frame,
    minRating,
    hpRatedRequired: kind === 'motor',
    fusibleNote: disconnectData.fusibleNote,
    ref: disconnectData.ref,
    steps,
    warnings,
  };
}
