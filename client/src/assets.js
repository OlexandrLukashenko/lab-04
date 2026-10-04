import { loadAll, loadJson } from './asyncUtils.js';

export async function loadManifest(signal, onProgress, audioContext) {
  const manifest = await loadJson('/assets/manifest.json', { signal });
  return loadAll(manifest, { signal, onProgress, audioContext });
}
