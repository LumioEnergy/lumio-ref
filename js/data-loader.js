// Loads the active code dataset. Swapping to NEC later = add data/nec-20xx/
// with the same file names/schemas and register it here.

export const DATASETS = [{ id: 'cec-2024', label: 'CEC / OESC 2024' }];

const FILES = ['meta', 'motor-flc', 'ampacity', 'derating', 'impedance', 'fuse', 'disconnect', 'selectivity'];

export async function loadDataset(id = 'cec-2024') {
  const entries = await Promise.all(
    FILES.map(async (name) => {
      const res = await fetch(`data/${id}/${name}.json`);
      if (!res.ok) throw new Error(`Failed to load data/${id}/${name}.json (${res.status})`);
      return [name, await res.json()];
    })
  );
  const byFile = Object.fromEntries(entries);
  return {
    meta: byFile['meta'],
    flcData: byFile['motor-flc'],
    ampacityData: byFile['ampacity'],
    deratingData: byFile['derating'],
    impedanceData: byFile['impedance'],
    fuseData: byFile['fuse'],
    disconnectData: byFile['disconnect'],
    selectivityData: byFile['selectivity'],
  };
}
