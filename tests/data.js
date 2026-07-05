// Loads the real dataset for tests, same files the app fetches at runtime.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'cec-2024');

export const load = (name) => JSON.parse(readFileSync(join(root, `${name}.json`), 'utf8'));

export const flcData = load('motor-flc');
export const ampacityData = load('ampacity');
export const deratingData = load('derating');
export const impedanceData = load('impedance');
export const fuseData = load('fuse');
export const disconnectData = load('disconnect');
export const selectivityData = load('selectivity');
